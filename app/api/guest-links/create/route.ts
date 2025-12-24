import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { verifyToken, extractTokenFromHeader } from '@/lib/jwt'
import { customAlphabet } from 'nanoid'

export const runtime = 'nodejs'

// 生成短链接代码: 只使用小写字母和数字,长度8位
const generateLinkCode = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8)

/**
 * POST /api/guest-links/create
 * 创建访客链接
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

    const { password, label, expiresAt, maxConversations } = await req.json()

    // 验证输入
    if (!password || password.length < 4) {
      return NextResponse.json(
        { error: '密码长度至少4位' },
        { status: 400 }
      )
    }

    // 处理对话次数限制：undefined或null表示无限，否则使用用户输入或默认值10
    let conversationLimit: number | null = null
    if (maxConversations !== undefined && maxConversations !== null) {
      if (maxConversations === 'unlimited' || maxConversations === -1) {
        conversationLimit = null  // 无限
      } else {
        const limit = parseInt(maxConversations)
        if (isNaN(limit) || limit < 1) {
          return NextResponse.json(
            { error: '对话次数必须是大于0的数字或"无限"' },
            { status: 400 }
          )
        }
        conversationLimit = limit
      }
    } else {
      // 如果用户没有指定，默认为10
      conversationLimit = 10
    }

    // 生成唯一的链接代码
    let linkCode = generateLinkCode()
    let attempts = 0
    const maxAttempts = 10

    // 确保链接代码唯一
    while (attempts < maxAttempts) {
      const existing = await prisma.guestLink.findUnique({
        where: { linkCode }
      })

      if (!existing) break

      linkCode = generateLinkCode()
      attempts++
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: '生成链接失败,请重试' },
        { status: 500 }
      )
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10)

    // 创建访客链接
    const guestLink = await prisma.guestLink.create({
      data: {
        userId: payload.userId,
        linkCode,
        password: hashedPassword,
        label: label || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxConversations: conversationLimit,
      },
      select: {
        id: true,
        linkCode: true,
        label: true,
        isActive: true,
        expiresAt: true,
        maxConversations: true,
        conversationCount: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    console.log(`✅ 创建访客链接: ${linkCode} (用户: ${payload.userId})`)

    return NextResponse.json({
      success: true,
      guestLink,
    })

  } catch (error) {
    console.error('创建访客链接失败:', error)
    return NextResponse.json(
      { error: '创建访客链接失败' },
      { status: 500 }
    )
  }
}
