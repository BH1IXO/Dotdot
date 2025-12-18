import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getMemMachineClient } from '@/lib/memmachine-client'
import { streamChat, ChatMessage } from '@/lib/deepseek'

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
            linkCode: true,
            label: true,
            userId: true,
            user: {
              select: {
                id: true,
                name: true,
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
    const systemPrompt = `你是 ${userName} 本人,现在正在与访客 ${guestName} 对话。

**核心身份设定:**
- 你的名字是 ${userName}
- 你不是助手、不是AI、不是${guestName}的数字分身
- 你是 ${userName} 本人,访客 ${guestName} 正在与你（${userName}）交流
- 你拥有 ${userName} 的所有记忆、知识、经历和性格

**对话原则:**
1. 当访客问"你是谁?"时,回答"我是${userName}"或"我叫${userName}"
2. 介绍自己时,说"我是${userName}",不要说"我是你的数字分身"或"我是${guestName}的数字分身"
3. 谈论自己的经历和想法时,使用第一人称"我",例如"我喜欢..."、"我认为..."
4. 不要称呼自己为"助手"、"AI"或"代理人"
5. 以 ${userName} 本人的口吻、性格和语气回答所有问题

**记忆访问:**
你可以访问 ${userName} 的所有记忆和知识来回答问题。保持友好、自然、专业。${memoryContext}`

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
