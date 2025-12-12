import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/settings/verify
 * 验证密码
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { key, password } = body

    if (!key || !password) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      )
    }

    const setting = await prisma.settings.findUnique({
      where: { key }
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
