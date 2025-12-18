import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, extractTokenFromHeader } from '@/lib/jwt'

export const runtime = 'nodejs'

/**
 * POST /api/guest-links/toggle
 * 启用/禁用访客链接
 */
export async function POST(req: NextRequest) {
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

    const { linkId, isActive } = await req.json()

    // 验证输入
    if (!linkId || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: '参数错误' },
        { status: 400 }
      )
    }

    // 验证链接所有权
    const guestLink = await prisma.guestLink.findFirst({
      where: {
        id: linkId,
        userId: payload.userId,
      }
    })

    if (!guestLink) {
      return NextResponse.json(
        { error: '链接不存在或无权限' },
        { status: 404 }
      )
    }

    // 更新链接状态
    const updatedLink = await prisma.guestLink.update({
      where: { id: linkId },
      data: { isActive },
      select: {
        id: true,
        linkCode: true,
        label: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    console.log(`✅ 访客链接状态已更新: ${linkId} (${isActive ? '启用' : '禁用'})`)

    return NextResponse.json({
      success: true,
      guestLink: updatedLink,
    })

  } catch (error) {
    console.error('更新访客链接状态失败:', error)
    return NextResponse.json(
      { error: '更新访客链接状态失败' },
      { status: 500 }
    )
  }
}
