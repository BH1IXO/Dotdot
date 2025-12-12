import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/jwt'

export const runtime = 'nodejs'

/**
 * POST /api/auth/login
 * 用户登录
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    // 验证输入
    if (!email || !password) {
      return NextResponse.json(
        { error: '邮箱和密码不能为空' },
        { status: 400 }
      )
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        createdAt: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: '邮箱或密码错误' },
        { status: 401 }
      )
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { error: '邮箱或密码错误' },
        { status: 401 }
      )
    }

    // 生成 JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
    })

    // 返回用户信息（不包含密码）
    const { passwordHash, ...userWithoutPassword } = user

    console.log('✅ User logged in:', user.email)

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      token,
    })
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: error.message || '登录失败' },
      { status: 500 }
    )
  }
}
