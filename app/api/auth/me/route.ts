import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extractTokenFromHeader, verifyToken } from '@/lib/jwt'

export const runtime = 'nodejs'

/**
 * GET /api/auth/me
 * 获取当前登录用户信息
 */
export async function GET(req: NextRequest) {
  try {
    // 从请求头中提取 token
    const authHeader = req.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json(
        { error: '未提供认证信息' },
        { status: 401 }
      )
    }

    // 验证 token
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: '认证信息无效或已过期' },
        { status: 401 }
      )
    }

    // 查询用户信息
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        tokens: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }

    // 将BigInt转换为字符串以支持JSON序列化
    const userWithSerializedTokens = {
      ...user,
      tokens: user.tokens.toString()
    }

    return NextResponse.json({
      success: true,
      user: userWithSerializedTokens,
    })
  } catch (error: any) {
    console.error('Get user info error:', error)
    return NextResponse.json(
      { error: error.message || '获取用户信息失败' },
      { status: 500 }
    )
  }
}
