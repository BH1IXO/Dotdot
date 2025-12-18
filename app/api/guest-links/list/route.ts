import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, extractTokenFromHeader } from '@/lib/jwt'

export const runtime = 'nodejs'

/**
 * GET /api/guest-links/list
 * 获取当前用户的访客链接列表
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

    // 查询用户的所有访客链接
    const guestLinks = await prisma.guestLink.findMany({
      where: {
        userId: payload.userId,
      },
      select: {
        id: true,
        linkCode: true,
        label: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            sessions: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      guestLinks,
    })

  } catch (error) {
    console.error('获取访客链接列表失败:', error)
    return NextResponse.json(
      { error: '获取访客链接列表失败' },
      { status: 500 }
    )
  }
}
