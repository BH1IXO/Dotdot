import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

/**
 * POST /api/guest-chat/create-session
 * 创建访客会话
 */
export async function POST(req: NextRequest) {
  try {
    const { linkId, guestName, ipAddress, userAgent } = await req.json()

    // 验证输入
    if (!linkId || !guestName) {
      return NextResponse.json(
        { error: '链接ID和访客名字不能为空' },
        { status: 400 }
      )
    }

    // 验证链接是否存在且有效
    const guestLink = await prisma.guestLink.findUnique({
      where: { id: linkId },
      select: {
        id: true,
        isActive: true,
        expiresAt: true,
      }
    })

    if (!guestLink) {
      return NextResponse.json(
        { error: '链接不存在' },
        { status: 404 }
      )
    }

    if (!guestLink.isActive) {
      return NextResponse.json(
        { error: '链接已被禁用' },
        { status: 403 }
      )
    }

    if (guestLink.expiresAt && new Date(guestLink.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: '链接已过期' },
        { status: 403 }
      )
    }

    // 创建会话
    const session = await prisma.guestSession.create({
      data: {
        linkId,
        guestName,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
      select: {
        id: true,
        linkId: true,
        guestName: true,
        createdAt: true,
      }
    })

    console.log(`✅ 创建访客会话: ${session.id} (访客: ${guestName})`)

    return NextResponse.json({
      success: true,
      session,
    })

  } catch (error) {
    console.error('创建访客会话失败:', error)
    return NextResponse.json(
      { error: '创建访客会话失败' },
      { status: 500 }
    )
  }
}
