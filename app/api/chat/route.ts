import { NextRequest } from 'next/server'
import { streamChat, chat, ChatMessage } from '@/lib/deepseek'
import { prisma } from '@/lib/prisma'
import { getMemMachineClient } from '@/lib/memmachine-client'
import { optionalAuthenticate } from '@/lib/auth-middleware'
import { extractMemories } from '@/lib/memory-extractor'
import { estimateTokens } from '@/lib/token-counter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Track initialized MemMachine projects per user
const initializedProjects = new Set<string>()

/**
 * 计算两个字符串的相似度（Jaccard 相似度）
 * @returns 0-1 之间的相似度值，1 表示完全相同
 */
function calculateSimilarity(str1: string, str2: string): number {
  // 规范化：转小写，去除多余空格
  const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ')
  const s1 = normalize(str1)
  const s2 = normalize(str2)

  // 如果完全相同，返回 1
  if (s1 === s2) return 1

  // 使用字符级别的 Jaccard 相似度
  const set1 = new Set(s1.split(''))
  const set2 = new Set(s2.split(''))

  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])

  return intersection.size / union.size
}

async function ensureMemMachineInitialized(userId: string) {
  if (!initializedProjects.has(userId)) {
    try {
      const client = getMemMachineClient(userId)
      await client.initProject()
      initializedProjects.add(userId)
      console.log(`MemMachine project initialized for user: ${userId}`)
    } catch (error) {
      console.error(`Failed to initialize MemMachine for user ${userId}:`, error)
    }
  }
}

/**
 * POST /api/chat
 * 处理用户对话请求，返回流式响应
 */
export async function POST(req: NextRequest) {
  try {
    // 可选认证：如果提供了 token 就使用，否则使用 default
    const authUser = await optionalAuthenticate(req)
    const userId = authUser?.userId || 'default'

    const { message, history = [], files = [], webSearchEnabled = false } = await req.json()

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: '消息不能为空' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('📨 Chat request from user:', userId)
    console.log('🔑 User project ID will be: todd-assistant-' + userId)

    // Initialize MemMachine for this user
    await ensureMemMachineInitialized(userId)

    // Get user-specific MemMachine client
    const userMemClient = getMemMachineClient(userId)

    // Save user message to both databases
    await Promise.all([
      // Save to Prisma
      prisma.message.create({
        data: {
          role: 'user',
          content: message,
          userId: userId,
          metadata: JSON.stringify({ files: files.length > 0 ? files : undefined }),
        },
      }),
      // Save to MemMachine
      userMemClient.addUserMessage(message).then(() => {
        console.log('✅ User message saved to MemMachine:', message.slice(0, 50))
      }).catch(err => {
        console.error('❌ Failed to add user message to MemMachine:', err.message)
      }),
    ])

    // Use MemMachine for semantic memory search
    let relevantMemories: any[] = []
    let memorySource = 'none' // Track memory source for debugging

    console.log('🔍 Starting MemMachine search for:', message.slice(0, 50))
    try {
      const searchResult = await userMemClient.searchMemories(message, {
        topK: 100, // 增加到 100，确保能检索到上传的PDF/Word等文档内容
        types: [], // Search BOTH episodic and semantic memories
      })
      console.log('🔍 MemMachine searchResult:', JSON.stringify(searchResult).slice(0, 300))

      // Extract episodes from both short-term and long-term memory
      const episodicMemory = searchResult.content?.episodic_memory
      const shortTermEpisodes = episodicMemory?.short_term_memory?.episodes || []
      const longTermEpisodes = episodicMemory?.long_term_memory?.episodes || []
      const semanticMemories = searchResult.content?.semantic_memory || []
      const allEpisodes = [...shortTermEpisodes, ...longTermEpisodes, ...semanticMemories]

      console.log(`🔍 Found ${allEpisodes.length} total memories (short: ${shortTermEpisodes.length}, long: ${longTermEpisodes.length}, semantic: ${semanticMemories.length})`)

      if (allEpisodes.length > 0) {
        // 只过滤用户在当前对话中已经说过的话，避免重复
        // 不过滤从记忆中检索到的内容，因为那些是之前对话的重要信息
        const shouldDeduplicate = history.length >= 5
        let filteredEpisodes = allEpisodes

        if (shouldDeduplicate) {
          // 只获取用户消息（role='user'），不包括AI回复
          // 这样可以避免误过滤掉从记忆中提取的重要信息
          const recentUserMessages = new Set(
            history
              .filter((msg: any) => msg.role === 'user')
              .slice(-5)  // 只看最近5条用户消息
              .map((msg: any) => msg.content.trim())
          )
          filteredEpisodes = allEpisodes.filter(mem => {
            // Both episodic and semantic memories have 'content'
            const memContent = mem.content || ''
            return !recentUserMessages.has(memContent.trim())
          })
          console.log(`🔄 Deduplication applied: ${allEpisodes.length} -> ${filteredEpisodes.length} (removed ${allEpisodes.length - filteredEpisodes.length} recent user messages)`)
        } else {
          console.log(`ℹ️ Skipping deduplication (history too short: ${history.length} messages)`)
        }

        // 将包含"访客"的记忆提到前面，确保访客对话记录不会被遗漏
        const guestMemories = filteredEpisodes.filter(mem => {
          const content = mem.content || ''
          return content.includes('访客') || content.includes('guest')
        })
        const otherMemories = filteredEpisodes.filter(mem => {
          const content = mem.content || ''
          return !content.includes('访客') && !content.includes('guest')
        })
        const prioritizedEpisodes = [...guestMemories, ...otherMemories]

        console.log(`🔍 Prioritized guest memories: ${guestMemories.length} guest records moved to front`)

        // 过滤掉AI的否定回复（"你还没有告诉我"等），防止记忆污染
        const cleanedMemories = prioritizedEpisodes.filter(mem => {
          const content = mem.content || ''
          // 检测AI的否定回复模式
          const isNegativeResponse =
            content.includes('还没有') ||
            content.includes('你确实还没有') ||
            content.includes('尚未') ||
            content.includes('从未') ||
            /没有.*分享过/.test(content) ||
            /没有.*告诉/.test(content) ||
            /没有.*记录/.test(content)
          return !isNegativeResponse
        })

        const filteredCount = prioritizedEpisodes.length - cleanedMemories.length
        if (filteredCount > 0) {
          console.log(`🧹 Filtered out ${filteredCount} negative AI responses to prevent memory pollution`)
        }

        relevantMemories = cleanedMemories
          .slice(0, 20) // 取前20条（访客记录已经在前面，否定回复已被过滤）
          .map(mem => ({
            role: ('role' in mem && mem.role) || 'user',  // Only EpisodicMemoryResult has role
            content: mem.content || '',
            timestamp: ('timestamp' in mem && mem.timestamp) || '',  // Only EpisodicMemoryResult has timestamp
            similarity: mem.similarity_score,
            type: ('category' in mem && mem.category) || 'episodic',  // Only SemanticMemoryResult has category
          }))

        memorySource = 'memmachine'
        console.log(`✅ MemMachine retrieved ${relevantMemories.length} relevant memories`)
      }
    } catch (error) {
      console.error('❌ MemMachine search failed, falling back to Prisma:', error)
      memorySource = 'prisma-fallback'

      // Fallback to original Prisma logic if MemMachine fails
      const isAskingPersonalInfo = /我叫|我的名字|我是谁|我喜欢|关于我/i.test(message)

      if (isAskingPersonalInfo) {
        relevantMemories = await prisma.message.findMany({
          where: {
            userId,
            role: 'user',
            OR: [
              { content: { contains: '我叫' } },
              { content: { contains: '我的名字' } },
              { content: { contains: '我是' } },
              { content: { contains: '我喜欢' } },
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        })
      } else {
        const keywords = message.toLowerCase().match(/\b\w+\b/g) || []
        if (keywords.length > 0) {
          relevantMemories = await prisma.message.findMany({
            where: {
              userId,
              OR: keywords.slice(0, 5).map(keyword => ({
                content: {
                  contains: keyword,
                },
              })),
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          })
        }
      }
    }

    // Handle web search if enabled
    let webSearchResults = ''
    if (webSearchEnabled) {
      try {
        console.log('🌐 Web search enabled, performing search for:', message)

        // 获取当前日期和时间信息
        const now = new Date()
        const dateInfo = {
          date: now.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
          }),
          time: now.toLocaleTimeString('zh-CN'),
          timestamp: now.toISOString(),
        }

        webSearchResults = `\n\n🌐 实时信息（网络搜索已启用）：\n`
        webSearchResults += `当前日期：${dateInfo.date}\n`
        webSearchResults += `当前时间：${dateInfo.time}\n`
        webSearchResults += `时间戳：${dateInfo.timestamp}\n`

        // 尝试使用 Serper API 进行真实的网络搜索
        const serperApiKey = process.env.SERPER_API_KEY
        if (serperApiKey) {
          console.log('🔍 Using Serper API for web search')
          const searchResponse = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: {
              'X-API-KEY': serperApiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              q: message,
              gl: 'cn',
              hl: 'zh-cn',
              num: 5
            })
          })

          if (searchResponse.ok) {
            const searchData = await searchResponse.json()
            const results = searchData.organic || []

            if (results.length > 0) {
              webSearchResults += `\n搜索结果（关键词："${message}"）：\n`
              results.slice(0, 5).forEach((result: any, idx: number) => {
                webSearchResults += `\n${idx + 1}. ${result.title}\n`
                webSearchResults += `   ${result.snippet}\n`
                webSearchResults += `   来源：${result.link}\n`
              })
              console.log('✅ Serper search completed, found', results.length, 'results')
            }
          }
        } else {
          console.log('⚠️ SERPER_API_KEY not configured, using date/time only')
          webSearchResults += `\n注意：如需完整的网络搜索功能，请配置 SERPER_API_KEY 环境变量。\n`
          webSearchResults += `当前仅提供日期时间信息。你可以基于用户的问题，使用你的知识库回答。\n`
        }
      } catch (error) {
        console.error('❌ Web search failed:', error)
        const now = new Date()
        webSearchResults = `\n\n🌐 实时信息：\n`
        webSearchResults += `当前日期：${now.toLocaleDateString('zh-CN')}\n`
        webSearchResults += `当前时间：${now.toLocaleTimeString('zh-CN')}\n`
        webSearchResults += `网络搜索暂时不可用，但你可以使用当前日期时间信息回答问题。\n`
      }
    }

    // Handle file context if files are provided
    let fileContext = ''
    if (files.length > 0) {
      console.log('📎 [Chat API] Received files:', files.map((f: any) => ({ id: f.id, filename: f.filename })))
      fileContext = '\n\n📎 用户上传的文件：\n'
      for (const file of files) {
        try {
          console.log(`📎 [Chat API] Looking up file: ${file.id}`)
          const fileData = await prisma.file.findUnique({
            where: { id: file.id }
          })
          console.log(`📎 [Chat API] Found file:`, fileData ? { id: fileData.id, filename: fileData.filename, textLength: fileData.extractedText?.length } : 'NOT FOUND')

          // 验证文件所有权
          if (fileData && fileData.userId === userId) {
            fileContext += `\n文件：${fileData.filename}\n`
            fileContext += `大小：${(fileData.size / 1024).toFixed(1)} KB\n`
            fileContext += `类型：${fileData.mimetype}\n`
            if (fileData.description) {
              fileContext += `描述：${fileData.description}\n`
            }
            if (fileData.extractedText) {
              // 提供完整的PDF文本内容（不再截断）
              fileContext += `\n完整内容：\n${fileData.extractedText}\n`
              fileContext += `\n---\n`
            }
          }
        } catch (error) {
          console.error('Failed to fetch file data:', error)
        }
      }
    }

    // Get user info for personalized system prompt
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    })
    const userName = user?.name || user?.email?.split('@')[0] || '用户'

    // 构建带记忆的对话上下文
    let systemPrompt = `你是 ${userName} 的数字分身AI助理，名为"数字分身"。

**🧠 记忆系统说明（重要）：**
- 你配备了 MemMachine 长期记忆系统，可以记住所有对话内容
- 每次对话时，系统会自动检索相关的历史记忆并提供给你
- 当你看到"📝 相关历史记忆"部分时，这些是从你的记忆库中检索出的真实记忆
- 你必须充分利用这些记忆来回答问题，就像人类回忆往事一样
- 不要说你没有记忆能力或每次对话都是新的开始 - 你确实通过 MemMachine 记住了与 ${userName} 的所有互动

你的能力：
- 帮助 ${userName} 查找和管理照片和文件
- 回忆 ${userName} 写过的文章和笔记内容
- 基于 ${userName} 的情况提供个性化建议
- 学习并记住 ${userName} 分享的所有知识
${webSearchEnabled ? '- 访问实时网络信息（当前已启用）' : ''}
${files.length > 0 ? '- 分析用户上传的文件内容' : ''}

重要规则：
- 回答要清晰、自然、流畅
- 不要重复词语或句子
- 不要输出格式错误的内容
- 换行要自然合理
- **使用标准 Markdown 格式，不要使用 HTML 标签**（如 <b>、<span>、<div> 等）
- 使用 Markdown 语法：**粗体**、*斜体*、\`代码\`、列表、标题等
${webSearchEnabled ? '- 如果网络搜索提供了相关信息，请引用这些信息回答问题' : ''}`

    // 添加相关历史记忆
    if (relevantMemories.length > 0) {
      const memSourceLabel = memorySource === 'memmachine' ? '🧠 MemMachine 语义搜索' : '📁 数据库搜索'
      systemPrompt += `\n\n📝 相关历史记忆 (${memSourceLabel} - 共 ${relevantMemories.length} 条)：\n`
      systemPrompt += `⚠️ 重要提示：由于技术限制，这些记忆的顺序可能不是按相关性排序的。请仔细阅读所有记忆，找出与用户问题最相关的信息。\n\n`
      relevantMemories.forEach((mem, idx) => {
        const role = mem.role === 'user' ? '用户说' : '你回复'
        const similarity = mem.similarity ? ` [相似度: ${(mem.similarity * 100).toFixed(1)}%]` : ''
        // 增加显示长度到 200 字符，以便包含更多上下文
        systemPrompt += `${idx + 1}. ${role}: ${mem.content.slice(0, 200)}${mem.content.length > 200 ? '...' : ''}${similarity}\n`
      })
    }

    // 添加网络搜索结果
    if (webSearchResults) {
      systemPrompt += webSearchResults
    }

    // 添加文件上下文
    if (fileContext) {
      systemPrompt += fileContext
    }

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      // 添加历史对话 (最多保留最近 10 条)
      ...history.slice(-10).map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: 'user',
        content: message,
      },
    ]

    const useStreaming = process.env.USE_STREAMING !== 'false'

    if (!useStreaming) {
      // 使用非流式 API（更稳定，无重复问题）
      const fullResponse = await chat(messages)

      console.log('🤖 DeepSeek Response Length:', fullResponse.length, 'chars')
      console.log('🤖 First 100 chars:', fullResponse.slice(0, 100))
      console.log('🤖 Last 100 chars:', fullResponse.slice(-100))

      // 保存 AI 回复到数据库
      await Promise.all([
        prisma.message.create({
          data: {
            role: 'assistant',
            content: fullResponse,
            userId: userId,
          },
        }),
        userMemClient.addAssistantMessage(fullResponse).then(() => {
          console.log('✅ Assistant message saved to MemMachine (non-streaming):', fullResponse.slice(0, 50))
        }).catch(err => {
          console.error('❌ Failed to add assistant message to MemMachine:', err.message)
        }),
      ])

      // 后台异步提取并保存结构化记忆（不阻塞响应）
      extractAndSaveMemories(message, fullResponse, userName, userId).catch(err => {
        console.error('❌ [MemoryExtractor] Background extraction failed:', err.message)
      })

      // 模拟流式响应格式返回
      const encoder = new TextEncoder()
      const readableStream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: fullResponse })}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        },
      })

      return new Response(readableStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // 调用 DeepSeek API (流式)
    const stream = await streamChat(messages)

    // 创建流式响应
    let fullResponse = ''
    const encoder = new TextEncoder()

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              fullResponse += content
              // 发送数据到前端
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
            }
          }

          // 保存 AI 回复到数据库
          await Promise.all([
            prisma.message.create({
              data: {
                role: 'assistant',
                content: fullResponse,
                userId: userId,
              },
            }),
            userMemClient.addAssistantMessage(fullResponse).then(() => {
              console.log('✅ Assistant message saved to MemMachine:', fullResponse.slice(0, 50))
            }).catch(err => {
              console.error('❌ Failed to add assistant message to MemMachine:', err.message)
            }),
          ])

          // 后台异步提取并保存结构化记忆（不阻塞响应）
          extractAndSaveMemories(message, fullResponse, userName, userId).catch(err => {
            console.error('❌ [MemoryExtractor] Background extraction failed:', err.message)
          })

          // 计算并扣减Token（只对非default用户）
          let remainingTokens: number | bigint = 0
          if (userId !== 'default') {
            try {
              const inputTokens = estimateTokens(systemPrompt + message)
              const outputTokens = estimateTokens(fullResponse)
              const totalTokens = inputTokens + outputTokens

              console.log(`📊 Token使用: 输入=${inputTokens}, 输出=${outputTokens}, 总计=${totalTokens}`)

              const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { tokens: true }
              })

              if (user && Number(user.tokens) >= totalTokens) {
                const updatedUser = await prisma.user.update({
                  where: { id: userId },
                  data: { tokens: { decrement: totalTokens } },
                  select: { tokens: true }
                })
                remainingTokens = updatedUser.tokens
                console.log(`✅ Token已扣减: ${totalTokens}, 剩余: ${remainingTokens}`)
              } else {
                console.log(`⚠️ Token不足，但继续处理请求`)
                remainingTokens = user?.tokens || 0
              }
            } catch (error) {
              console.error('❌ Token扣减失败:', error)
            }
          }

          // 发送Token使用信息
          if (userId !== 'default') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              tokens: { remaining: Number(remainingTokens) }  // 将 BigInt 转换为 Number
            })}\n\n`))
          }

          // 发送结束信号
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: any) {
    console.error('Chat API error:', error)
    return new Response(
      JSON.stringify({ error: error.message || '服务器错误' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

/**
 * 提取并保存结构化记忆（后台异步执行）
 */
async function extractAndSaveMemories(
  userMessage: string,
  assistantReply: string,
  userName: string,
  userId: string
) {
  try {
    console.log(`🧠 [MemoryExtractor] 开始提取记忆...`)

    // 使用 DeepSeek 提取结构化记忆
    const memories = await extractMemories(userMessage, assistantReply, userName)

    if (memories.length === 0) {
      console.log(`💭 [MemoryExtractor] 没有提取到有价值的记忆`)
      return
    }

    console.log(`💡 [MemoryExtractor] 提取到 ${memories.length} 条记忆:`)
    memories.forEach((mem, idx) => {
      console.log(`   ${idx + 1}. [${mem.type}] ${mem.content} (置信度: ${mem.confidence})`)
    })

    // 去重：检查每条记忆是否已存在相似内容
    const uniqueMemories = []
    for (const mem of memories) {
      // 获取相同类型的现有记忆
      const existingMemories = await prisma.memory.findMany({
        where: {
          userId,
          type: mem.type
        },
        select: {
          content: true
        }
      })

      // 简单的文本相似度检查：如果内容完全相同或高度相似，跳过
      const isDuplicate = existingMemories.some(existing => {
        const similarity = calculateSimilarity(mem.content, existing.content)
        return similarity > 0.85 // 相似度阈值 85%
      })

      if (isDuplicate) {
        console.log(`   ⚠️  跳过重复记忆: [${mem.type}] ${mem.content}`)
      } else {
        uniqueMemories.push(mem)
      }
    }

    if (uniqueMemories.length === 0) {
      console.log(`💭 [MemoryExtractor] 所有提取的记忆都已存在，跳过保存`)
      return
    }

    // 保存去重后的记忆到数据库
    const savedMemories = await Promise.all(
      uniqueMemories.map(mem =>
        prisma.memory.create({
          data: {
            userId,
            type: mem.type,
            content: mem.content,
            metadata: JSON.stringify({
              confidence: mem.confidence,
              extractedFrom: 'conversation',
              source: {
                userMessage: userMessage.slice(0, 100),
                assistantReply: assistantReply.slice(0, 100)
              }
            })
          }
        })
      )
    )

    console.log(`✅ [MemoryExtractor] 成功保存 ${savedMemories.length}/${memories.length} 条新记忆到数据库`)

  } catch (error: any) {
    console.error('❌ [MemoryExtractor] 提取/保存记忆失败:', error.message)
    // 不抛出错误，避免影响主流程
  }
}

/**
 * GET /api/chat
 * 获取历史对话记录
 */
export async function GET(req: NextRequest) {
  try {
    // 可选认证
    const authUser = await optionalAuthenticate(req)
    const userId = authUser?.userId || 'default'

    const messages = await prisma.message.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: 50, // 最多返回 50 条
    })

    return new Response(JSON.stringify({ messages }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Get messages error:', error)
    return new Response(
      JSON.stringify({ error: error.message || '获取消息失败' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
