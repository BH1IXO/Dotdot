import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { optionalAuthenticate } from '@/lib/auth-middleware'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/chat/history
 * 获取最近的聊天历史记录
 */
export async function GET(req: NextRequest) {
  try {
    // 可选认证
    const authUser = await optionalAuthenticate(req)
    const userId = authUser?.userId || 'default'

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '20')

    // 从数据库获取当前用户的最近消息记录
    const messages = await prisma.message.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // 反转顺序，使最旧的消息在前面
    const orderedMessages = messages.reverse()

    return NextResponse.json({
      success: true,
      messages: orderedMessages,
      count: orderedMessages.length,
    })
  } catch (error: any) {
    console.error('Get chat history error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || '获取历史记录失败',
        messages: [],
      },
      { status: 500 }
    )
  }
}
