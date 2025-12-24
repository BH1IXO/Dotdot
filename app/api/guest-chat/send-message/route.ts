import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getMemMachineClient } from '@/lib/memmachine-client'
import { streamChat, ChatMessage } from '@/lib/deepseek'
import { estimateTokens } from '@/lib/token-counter'

export const runtime = 'nodejs'

/**
 * POST /api/guest-chat/send-message
 * 访客发送消息并获取AI回复（流式响应）
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId, message } = await req.json()

    if (!sessionId || !message) {
      return new Response(
        JSON.stringify({ error: '会话ID和消息内容不能为空' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // 验证会话
    const session = await prisma.guestSession.findUnique({
      where: { id: sessionId },
      include: {
        link: {
          select: {
            id: true,
            linkCode: true,
            label: true,
            userId: true,
            dailyLimit: true,
            remainingQuota: true,
            lastResetDate: true,
            maxConversations: true,
            conversationCount: true,
            user: {
              select: {
                id: true,
                name: true,
                tokens: true,
              }
            }
          }
        }
      }
    })

    if (!session) {
      return new Response(
        JSON.stringify({ error: '会话不存在' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // 检查每日限额
    const now = new Date()
    const lastReset = new Date(session.link.lastResetDate)
    const isNewDay = now.toDateString() !== lastReset.toDateString()

    // 如果是新的一天，重置配额
    if (isNewDay) {
      await prisma.guestLink.update({
        where: { id: session.link.id },
        data: {
          remainingQuota: session.link.dailyLimit,
          lastResetDate: now
        }
      })
      session.link.remainingQuota = session.link.dailyLimit
    }

    // 检查剩余配额
    if (session.link.remainingQuota <= 0) {
      return new Response(
        JSON.stringify({
          error: '今日问答次数已用尽',
          dailyLimit: session.link.dailyLimit,
          remainingQuota: 0
        }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // 检查总对话次数限制（如果设置了限制）
    if (session.link.maxConversations !== null && session.link.conversationCount >= session.link.maxConversations) {
      return new Response(
        JSON.stringify({
          error: '总对话次数已用尽',
          maxConversations: session.link.maxConversations,
          conversationCount: session.link.conversationCount
        }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // 减少每日配额并增加总对话计数
    await prisma.guestLink.update({
      where: { id: session.link.id },
      data: {
        remainingQuota: { decrement: 1 },
        conversationCount: { increment: 1 }
      }
    })

    // 保存用户消息
    const userMessage = await prisma.guestMessage.create({
      data: {
        sessionId,
        role: 'user',
        content: message,
      }
    })

    // 获取历史消息
    const history = await prisma.guestMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 20, // 最近20条
    })

    // 搜索用户的记忆 (使用用户自己的project_id,不是访客专用的)
    const userMemClient = getMemMachineClient(session.link.userId)
    let memoryContext = ''

    try {
      const searchResult = await userMemClient.searchMemories(message, {
        topK: 20,  // 增加到20，确保访客能检索到足够的相关记忆
        types: [], // Search both episodic and semantic
      })

      const episodicMemory = searchResult.content?.episodic_memory
      const shortTermEpisodes = episodicMemory?.short_term_memory?.episodes || []
      const longTermEpisodes = episodicMemory?.long_term_memory?.episodes || []
      const allEpisodes = [...shortTermEpisodes, ...longTermEpisodes]

      if (allEpisodes.length > 0) {
        memoryContext = '\n\n相关记忆:\n' + allEpisodes
          .map(ep => `- ${ep.content}`)
          .join('\n')
      }
    } catch (error) {
      console.error('搜索记忆失败:', error)
    }

    // 构建对话上下文 - 数字分身以用户本人的口吻对话
    const userName = session.link.user.name || '用户'
    const guestName = session.guestName
    const systemPrompt = `你是 ${userName} 本人或 ${userName} 的数字分身，现在正在与访客 ${guestName} 对话。

**核心身份设定:**
- 你代表 ${userName}（也可能有昵称如：刘涛/大桃子/Todd等，可以从记忆中查找）
- 你不是访客 ${guestName} 的数字分身，你是 ${userName} 的数字分身或本人
- 访客 ${guestName} 正在与你（${userName}）交流
- 你拥有 ${userName} 的所有记忆、知识、经历和性格

**对话原则:**
1. 当访客问"你是谁?"时，可以回答：
   - "我是${userName}"
   - "我是${userName}的数字分身"
   - 或从记忆中找到的昵称/外号（如"我是大桃子"、"我是Todd"）
   - 根据语境自然选择合适的称呼
2. 回答要简短、直接、有重点，避免长篇大论
3. 涉及隐私问题（如具体地址、身份证号、银行卡号等）要巧妙回避，可以说"这个不太方便透露"或转移话题
4. 绝对不要透露其他访客的信息（谁来聊过天、聊了什么），保护所有访客隐私
5. 使用第一人称"我"，以 ${userName} 的口吻、性格和语气回答
6. 可以适当使用emoji让对话更生动自然 😊

**记忆访问:**
你可以访问 ${userName} 的所有记忆和知识来回答问题。保持友好、自然、真实。${memoryContext}`

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      // 添加历史对话 (最多保留最近 10 条)
      ...history.slice(-10).map(msg => ({
        role: msg.role as 'system' | 'user' | 'assistant',
        content: msg.content,
      })),
      {
        role: 'user',
        content: message,
      },
    ]

    // 调用 DeepSeek API (流式响应)
    const stream = await streamChat(messages)

    // 使用 ReadableStream 创建流式响应
    const encoder = new TextEncoder()
    let fullResponse = ''

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // 流式传输AI回复
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              fullResponse += content
              // 发送数据到前端
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
            }
          }

          // 保存AI回复到数据库
          const assistantMessage = await prisma.guestMessage.create({
            data: {
              sessionId,
              role: 'assistant',
              content: fullResponse,
            }
          })

          // 存储访客对话到用户的MemMachine记忆系统
          try {
            const timestamp = new Date().toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })

            // 保存访客的用户消息到MemMachine (使用明确的格式便于检索)
            await userMemClient.addMemories([
              {
                content: `[${timestamp}] 访客 ${session.guestName} 通过访客链接来聊天了，他问：${message}`,
                role: 'user',
                producer: session.guestName,
                produced_for: 'assistant',
                metadata: {
                  source: 'guest_chat',
                  guest_name: session.guestName,
                  session_id: sessionId,
                  link_code: session.link.linkCode,
                  link_label: session.link.label || '',
                  timestamp: new Date().toISOString(),
                }
              }
            ])

            // 保存AI回复到MemMachine (使用明确的格式)
            await userMemClient.addMemories([
              {
                content: `[${timestamp}] 我回复访客 ${session.guestName}：${fullResponse}`,
                role: 'assistant',
                producer: 'assistant',
                produced_for: session.guestName,
                metadata: {
                  source: 'guest_chat',
                  guest_name: session.guestName,
                  session_id: sessionId,
                  link_code: session.link.linkCode,
                  link_label: session.link.label || '',
                  timestamp: new Date().toISOString(),
                }
              }
            ])

            console.log(`✅ 访客对话已存入MemMachine: 访客=${session.guestName}, 时间=${timestamp}`)
          } catch (memError) {
            console.error('❌ 存储访客对话到MemMachine失败:', memError)
          }

          console.log(`✅ 访客消息已处理: 会话=${sessionId}, 访客=${session.guestName}`)

          // 计算并扣除用户token
          try {
            const inputTokens = estimateTokens(systemPrompt + message)
            const outputTokens = estimateTokens(fullResponse)
            const totalTokens = inputTokens + outputTokens

            console.log(`📊 访客对话Token使用: 输入=${inputTokens}, 输出=${outputTokens}, 总计=${totalTokens}`)

            // 从链接所属用户的token余额中扣除
            const currentUser = await prisma.user.findUnique({
              where: { id: session.link.userId },
              select: { tokens: true }
            })

            if (currentUser && Number(currentUser.tokens) >= totalTokens) {
              await prisma.user.update({
                where: { id: session.link.userId },
                data: { tokens: { decrement: totalTokens } }
              })
              console.log(`✅ 从用户 ${session.link.userId} 扣除 ${totalTokens} tokens`)
            } else {
              console.log(`⚠️ 用户 ${session.link.userId} token不足，但继续处理请求`)
            }
          } catch (tokenError) {
            console.error('❌ Token扣除失败:', tokenError)
            // 不中断流程，继续返回响应
          }

          // 发送包含消息ID的元数据
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            metadata: {
              userMessageId: userMessage.id,
              assistantMessageId: assistantMessage.id
            }
          })}\n\n`))

          // 发送结束信号
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          console.error('流式响应错误:', error)
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

  } catch (error) {
    console.error('处理访客消息失败:', error)
    return new Response(
      JSON.stringify({ error: '处理消息失败' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
