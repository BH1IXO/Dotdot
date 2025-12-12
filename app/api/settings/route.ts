import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPassword } from '@/lib/crypto'
import { optionalAuthenticate } from '@/lib/auth-middleware'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/settings?key=delete_password
 * 检查是否设置了删除密码
 */
export async function GET(req: NextRequest) {
  try {
    // 可选认证
    const authUser = await optionalAuthenticate(req)
    const userId = authUser?.userId || 'default'

    const searchParams = req.nextUrl.searchParams
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json(
        { error: '缺少参数 key' },
        { status: 400 }
      )
    }

    const setting = await prisma.settings.findUnique({
      where: {
        userId_key: {
          userId,
          key
        }
      },
      select: { id: true, key: true, createdAt: true, updatedAt: true }
    })

    return NextResponse.json({
      exists: !!setting,
      setting: setting ? { id: setting.id, key: setting.key } : null
    })

  } catch (error: any) {
    console.error('Get settings error:', error)
    return NextResponse.json(
      { error: error.message || '获取设置失败' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/settings
 * 设置删除密码
 */
export async function POST(req: NextRequest) {
  try {
    // 可选认证
    const authUser = await optionalAuthenticate(req)
    const userId = authUser?.userId || 'default'

    const body = await req.json()
    const { key, password } = body

    if (!key || !password) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    if (password.length < 4) {
      return NextResponse.json(
        { error: '密码长度至少为4位' },
        { status: 400 }
      )
    }

    // 加密密码
    const hashedPassword = hashPassword(password)

    // 保存或更新设置
    const setting = await prisma.settings.upsert({
      where: {
        userId_key: {
          userId,
          key
        }
      },
      update: { value: hashedPassword },
      create: { userId, key, value: hashedPassword }
    })

    return NextResponse.json({
      success: true,
      message: '密码设置成功'
    })

  } catch (error: any) {
    console.error('Set settings error:', error)
    return NextResponse.json(
      { error: error.message || '设置失败' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/settings/verify
 * 验证密码
 */
export async function PUT(req: NextRequest) {
  try {
    // 可选认证
    const authUser = await optionalAuthenticate(req)
    const userId = authUser?.userId || 'default'

    const body = await req.json()
    const { key, password } = body

    if (!key || !password) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    const setting = await prisma.settings.findUnique({
      where: {
        userId_key: {
          userId,
          key
        }
      }
    })

    if (!setting) {
      return NextResponse.json(
        { error: '未设置密码' },
        { status: 404 }
      )
    }

    const isValid = verifyPassword(password, setting.value)

    return NextResponse.json({
      valid: isValid
    })

  } catch (error: any) {
    console.error('Verify password error:', error)
    return NextResponse.json(
      { error: error.message || '验证失败' },
      { status: 500 }
    )
  }
}
