import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, extractTokenFromHeader } from '@/lib/jwt'

export const runtime = 'nodejs'

/**
 * GET /api/guest-chat/sessions
 * 获取用户所有访客链接的会话列表 (需要认证)
 */
export async function GET(req: NextRequest) {
  try {
    // 验证用户身份
    const authHeader = req.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: '无效的token' },
        { status: 401 }
      )
    }

    // 获取用户的所有访客链接
    const guestLinks = await prisma.guestLink.findMany({
      where: {
        userId: payload.userId,
      },
      select: {
        id: true,
        linkCode: true,
        label: true,
        sessions: {
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            _count: {
              select: {
                messages: true
              }
            }
          }
        }
      }
    })

    // 扁平化所有会话
    const allSessions = guestLinks.flatMap(link =>
      link.sessions.map(session => ({
        id: session.id,
        guestName: session.guestName,
        messageCount: session._count.messages,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        link: {
          linkCode: link.linkCode,
          label: link.label,
        }
      }))
    )

    return NextResponse.json({
      success: true,
      sessions: allSessions,
      totalCount: allSessions.length,
    })

  } catch (error) {
    console.error('获取访客会话列表失败:', error)
    return NextResponse.json(
      { error: '获取会话列表失败' },
      { status: 500 }
    )
  }
}
