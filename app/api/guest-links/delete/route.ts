import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, extractTokenFromHeader } from '@/lib/jwt'

export const runtime = 'nodejs'

/**
 * DELETE /api/guest-links/delete
 * 删除访客链接
 */
export async function DELETE(req: NextRequest) {
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

    const { linkId } = await req.json()

    // 验证输入
    if (!linkId) {
      return NextResponse.json(
        { error: '链接ID不能为空' },
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

    // 删除链接(级联删除所有关联的会话和消息)
    await prisma.guestLink.delete({
      where: { id: linkId }
    })

    console.log(`✅ 访客链接已删除: ${linkId}`)

    return NextResponse.json({
      success: true,
      message: '链接已删除'
    })

  } catch (error) {
    console.error('删除访客链接失败:', error)
    return NextResponse.json(
      { error: '删除访客链接失败' },
      { status: 500 }
    )
  }
}
