import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

/**
 * GET /api/guest-chat/history?sessionId=xxx
 * 获取访客会话历史消息
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json(
        { error: '会话ID不能为空' },
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
            dailyLimit: true,
            remainingQuota: true,
            lastResetDate: true,
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

    // 获取消息历史
    const messages = await prisma.guestMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      }
    })

    // 检查是否需要重置每日配额
    const now = new Date()
    const lastReset = new Date(session.link.lastResetDate)
    const isNewDay = now.toDateString() !== lastReset.toDateString()

    let currentQuota = session.link.remainingQuota
    if (isNewDay) {
      currentQuota = session.link.dailyLimit
    }

    return NextResponse.json({
      success: true,
      messages,
      session: {
        id: session.id,
        guestName: session.guestName,
        linkCode: session.link.linkCode,
        createdAt: session.createdAt,
        link: {
          dailyLimit: session.link.dailyLimit,
          remainingQuota: currentQuota,
        }
      }
    })

  } catch (error) {
    console.error('获取访客消息历史失败:', error)
    return NextResponse.json(
      { error: '获取消息历史失败' },
      { status: 500 }
    )
  }
}
