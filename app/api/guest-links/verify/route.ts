import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

/**
 * POST /api/guest-links/verify
 * 验证访客链接密码
 */
export async function POST(req: NextRequest) {
  try {
    const { linkCode, password } = await req.json()

    // 验证输入
    if (!linkCode || !password) {
      return NextResponse.json(
        { error: '链接代码和密码不能为空' },
        { status: 400 }
      )
    }

    // 查找链接
    const guestLink = await prisma.guestLink.findUnique({
      where: { linkCode },
      select: {
        id: true,
        linkCode: true,
        password: true,
        isActive: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    if (!guestLink) {
      return NextResponse.json(
        { error: '链接不存在' },
        { status: 404 }
      )
    }

    // 检查链接是否已禁用
    if (!guestLink.isActive) {
      return NextResponse.json(
        { error: '链接已被禁用' },
        { status: 403 }
      )
    }

    // 检查链接是否已过期
    if (guestLink.expiresAt && new Date(guestLink.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: '链接已过期' },
        { status: 403 }
      )
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, guestLink.password)
    if (!isValid) {
      return NextResponse.json(
        { error: '密码错误' },
        { status: 401 }
      )
    }

    console.log(`✅ 访客链接验证成功: ${linkCode}`)

    return NextResponse.json({
      success: true,
      linkId: guestLink.id,
      linkCode: guestLink.linkCode,
      ownerName: guestLink.user.name,
    })

  } catch (error) {
    console.error('验证访客链接失败:', error)
    return NextResponse.json(
      { error: '验证访客链接失败' },
      { status: 500 }
    )
  }
}
