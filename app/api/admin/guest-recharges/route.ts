import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

/**
 * GET /api/admin/guest-recharges
 * 获取所有访客充值记录
 */
export async function GET(req: NextRequest) {
  try {
    const recharges = await prisma.guestRecharge.findMany({
      include: {
        link: {
          select: {
            id: true,
            linkCode: true,
            label: true,
            user: {
              select: {
                email: true,
                name: true,
              }
            }
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
    console.error('获取访客充值记录失败:', error)
    return NextResponse.json(
      { error: '获取访客充值记录失败' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/guest-recharges/confirm
 * 确认访客充值
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
    const recharge = await prisma.guestRecharge.findUnique({
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

    // 更新充值状态并给访客链接增加配额
    await prisma.$transaction([
      prisma.guestRecharge.update({
        where: { id: rechargeId },
        data: { status: 'completed' }
      }),
      prisma.guestLink.update({
        where: { id: recharge.linkId },
        data: {
          dailyLimit: {
            increment: recharge.quota
          },
          remainingQuota: {
            increment: recharge.quota
          }
        }
      })
    ])

    return NextResponse.json({
      success: true,
      message: '访客充值确认成功'
    })
  } catch (error) {
    console.error('确认访客充值失败:', error)
    return NextResponse.json(
      { error: '确认访客充值失败' },
      { status: 500 }
    )
  }
}
