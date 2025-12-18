import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getMemMachineClient } from '@/lib/memmachine-client'
import { chat, ChatMessage } from '@/lib/deepseek'

export const runtime = 'nodejs'

/**
 * POST /api/guest-chat/send-message
 * 访客发送消息并获取AI回复
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId, message } = await req.json()

    if (!sessionId || !message) {
      return NextResponse.json(
        { error: '会话ID和消息内容不能为空' },
        { status: 400 }
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
      return NextResponse.json(
        { error: '会话不存在' },
        { status: 404 }
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
        topK: 5,
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
    const systemPrompt = `你是 ${userName} 本人的数字分身,现在正在与访客 ${session.guestName} 对话。

**重要:你要以 ${userName} 本人的第一人称口吻回答问题**

- 当访客问"你是谁?"时,回答"我是 ${userName}"
- 当访客问"你喜欢什么?"时,回答"我喜欢..." (使用"我"而不是"我的主人")
- 你就是 ${userName} 本人,不是助手或代理人
- 访客与你对话,就相当于在与 ${userName} 本人对话

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

    // 调用 DeepSeek API (使用与主界面相同的模型)
    const assistantReply = await chat(messages)

    // 保存AI回复
    const assistantMessage = await prisma.guestMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: assistantReply,
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
          producer: session.guestName, // 使用访客名字作为producer
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
          content: `[${timestamp}] 我回复访客 ${session.guestName}：${assistantReply}`,
          role: 'assistant',
          producer: 'assistant',
          produced_for: session.guestName, // produced_for 是访客名字
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
      // 不抛出错误,继续执行
    }

    console.log(`✅ 访客消息已处理: 会话=${sessionId}, 访客=${session.guestName}`)

    return NextResponse.json({
      success: true,
      userMessage: {
        id: userMessage.id,
        role: userMessage.role,
        content: userMessage.content,
        createdAt: userMessage.createdAt,
      },
      assistantMessage: {
        id: assistantMessage.id,
        role: assistantMessage.role,
        content: assistantMessage.content,
        createdAt: assistantMessage.createdAt,
      }
    })

  } catch (error) {
    console.error('处理访客消息失败:', error)
    return NextResponse.json(
      { error: '处理消息失败' },
      { status: 500 }
    )
  }
}
