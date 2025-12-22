import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

/**
 * GET /api/admin/recharges
 * 获取所有用户充值记录
 */
export async function GET(req: NextRequest) {
  try {
    const recharges = await prisma.recharge.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      recharges
    })
  } catch (error) {
    console.error('获取充值记录失败:', error)
    return NextResponse.json(
      { error: '获取充值记录失败' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/recharges/confirm
 * 确认用户充值
 */
export async function POST(req: NextRequest) {
  try {
    const { rechargeId } = await req.json()

    if (!rechargeId) {
      return NextResponse.json(
        { error: '充值ID不能为空' },
        { status: 400 }
      )
    }

    // 查找充值记录
    const recharge = await prisma.recharge.findUnique({
      where: { id: rechargeId }
    })

    if (!recharge) {
      return NextResponse.json(
        { error: '充值记录不存在' },
        { status: 404 }
      )
    }

    if (recharge.status === 'completed') {
      return NextResponse.json(
        { error: '该充值已经完成' },
        { status: 400 }
      )
    }

    // 更新充值状态并给用户添加tokens
    await prisma.$transaction([
      prisma.recharge.update({
        where: { id: rechargeId },
        data: { status: 'completed' }
      }),
      prisma.user.update({
        where: { id: recharge.userId },
        data: {
          tokens: {
            increment: recharge.tokens
          }
        }
      })
    ])

    return NextResponse.json({
      success: true,
      message: '充值确认成功'
    })
  } catch (error) {
    console.error('确认充值失败:', error)
    return NextResponse.json(
      { error: '确认充值失败' },
      { status: 500 }
    )
  }
}
