import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { optionalAuthenticate } from '@/lib/auth-middleware'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/memories
 * 获取用户的记忆列表
 */
export async function GET(req: NextRequest) {
  try {
    // 可选认证
    const authUser = await optionalAuthenticate(req)
    const userId = authUser?.userId || 'default'

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'all'
    const query = searchParams.get('query') || ''
    const limit = parseInt(searchParams.get('limit') || '50')

    // 构建查询条件
    const where: any = { userId }

    if (type !== 'all') {
      where.type = type
    }

    if (query) {
      where.content = {
        contains: query
      }
    }

    // 先获取总数统计（不限制数量）- 只统计当前用户的数据
    const totalMessageCount = await prisma.message.count({ where: { userId } })
    const totalMemoryCount = await prisma.memory.count({ where: { userId } })

    // 分别统计各类型的 Memory 数量
    const knowledgeCount = await prisma.memory.count({
      where: { userId, type: 'knowledge' }
    })
    const preferenceCount = await prisma.memory.count({
      where: { userId, type: 'preference' }
    })
    const factCount = await prisma.memory.count({
      where: { userId, type: 'fact' }
    })

    // 根据类型筛选决定查询哪些数据源
    let messages: any[] = []
    let legacyMemories: any[] = []

    // 如果筛选类型是 'all' 或 'conversation'，查询 Message 表
    if (type === 'all' || type === 'conversation') {
      messages = await prisma.message.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
    }

    // 如果筛选类型是 'all' 或其他特定类型（knowledge, preference, fact），查询 Memory 表
    if (type === 'all' || (type !== 'conversation' && type !== 'all')) {
      legacyMemories = await prisma.memory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
    }

    // 合并两个数据源
    const allRecords = [
      ...messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        type: 'conversation' as const,
        timestamp: msg.createdAt,
        role: msg.role,
        source: 'message' as const,
      })),
      ...legacyMemories.map(mem => ({
        id: mem.id,
        content: mem.content,
        type: mem.type,
        timestamp: mem.createdAt,
        role: null,
        source: 'memory' as const,
      })),
    ]

    // 按时间排序并限制数量
    const sortedRecords = allRecords
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)

    // 计算统计信息（使用实际总数）
    const stats = {
      total: totalMessageCount + totalMemoryCount,
      conversation: totalMessageCount,  // 所有 Message 都是对话
      knowledge: knowledgeCount,
      preference: preferenceCount,
      fact: factCount,
    }

    // 转换为前端格式
    const formattedMemories = sortedRecords.map(record => ({
      id: record.id,
      content: record.content,
      type: record.type,
      timestamp: record.timestamp,
      role: record.role,
      metadata: { source: record.source }
    }))

    return Response.json({
      success: true,
      memories: formattedMemories,
      count: formattedMemories.length,
      stats,
    })
  } catch (error: any) {
    console.error('Get memories error:', error)
    return Response.json(
      {
        success: false,
        error: error.message || '获取记忆失败',
        memories: [],
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/memories
 * 添加新记忆
 */
export async function POST(req: NextRequest) {
  try {
    // 可选认证
    const authUser = await optionalAuthenticate(req)
    const userId = authUser?.userId || 'default'

    const body = await req.json()
    const { content, type = 'fact' } = body

    if (!content) {
      return Response.json(
        { success: false, error: '内容不能为空' },
        { status: 400 }
      )
    }

    // 验证类型
    const validTypes = ['conversation', 'knowledge', 'preference', 'fact']
    if (!validTypes.includes(type)) {
      return Response.json(
        { success: false, error: '无效的记忆类型' },
        { status: 400 }
      )
    }

    // 创建记忆
    const memory = await prisma.memory.create({
      data: {
        userId,
        type,
        content,
        metadata: JSON.stringify({})
      },
    })

    return Response.json({
      success: true,
      memory: {
        id: memory.id,
        content: memory.content,
        type: memory.type,
        timestamp: memory.createdAt,
        metadata: JSON.parse(memory.metadata)
      },
    })
  } catch (error: any) {
    console.error('Add memory error:', error)
    return Response.json(
      {
        success: false,
        error: error.message || '添加记忆失败',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/memories
 * 删除记忆
 */
export async function DELETE(req: NextRequest) {
  try {
    // 可选认证
    const authUser = await optionalAuthenticate(req)
    const userId = authUser?.userId || 'default'

    const { searchParams } = new URL(req.url)
    const memoryId = searchParams.get('id')

    if (!memoryId) {
      return Response.json(
        { success: false, error: '记忆ID不能为空' },
        { status: 400 }
      )
    }

    // 获取记忆信息并验证所有权
    const memory = await prisma.memory.findUnique({
      where: { id: memoryId }
    })

    if (!memory) {
      return Response.json(
        { success: false, error: '记忆不存在' },
        { status: 404 }
      )
    }

    if (memory.userId !== userId) {
      return Response.json(
        { success: false, error: '无权删除此记忆' },
        { status: 403 }
      )
    }

    // 删除记忆
    await prisma.memory.delete({
      where: { id: memoryId },
    })

    return Response.json({
      success: true,
      message: '记忆已删除',
    })
  } catch (error: any) {
    console.error('Delete memory error:', error)
    return Response.json(
      {
        success: false,
        error: error.message || '删除记忆失败',
      },
      { status: 500 }
    )
  }
}
