import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/crypto'
import fs from 'fs/promises'
import path from 'path'
import { optionalAuthenticate } from '@/lib/auth-middleware'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/files
 * 获取文件列表
 */
export async function GET(req: NextRequest) {
  try {
    // 可选认证
    const authUser = await optionalAuthenticate(req)
    const userId = authUser?.userId || 'default'

    const searchParams = req.nextUrl.searchParams
    const type = searchParams.get('type') // image, pdf, document
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search') // 文件名搜索

    const where: any = {
      userId,
    }

    // 类型过滤
    if (type) {
      if (type === 'image') {
        where.mimetype = { startsWith: 'image/' }
      } else if (type === 'pdf') {
        where.mimetype = 'application/pdf'
      } else if (type === 'document') {
        where.mimetype = { in: ['application/pdf', 'text/plain', 'text/markdown'] }
      }
    }

    // 文件名搜索
    if (search) {
      where.filename = { contains: search }
    }

    // 查询文件
    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          filename: true,
          filepath: true,
          thumbnailPath: true,
          mimetype: true,
          size: true,
          width: true,
          height: true,
          description: true,
          tags: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.file.count({ where }),
    ])

    // 获取每个文件的chunk数量
    const filesWithChunks = await Promise.all(
      files.map(async (file) => {
        const chunkCount = await prisma.fileChunk.count({
          where: { fileId: file.id },
        })
        return {
          ...file,
          tags: JSON.parse(file.tags || '[]'),
          chunks: chunkCount,
        }
      })
    )

    // 计算总的chunk数量（用于统计）
    const totalChunks = await prisma.fileChunk.count({
      where: {
        fileId: {
          in: files.map(f => f.id),
        },
      },
    })

    return NextResponse.json({
      files: filesWithChunks,
      total,
      totalChunks,
      hasMore: offset + limit < total,
    })

  } catch (error: any) {
    console.error('Get files error:', error)
    return NextResponse.json(
      { error: error.message || '获取文件列表失败' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/files?id=xxx&password=xxx
 * 删除文件（需要密码验证）
 */
export async function DELETE(req: NextRequest) {
  try {
    // 可选认证
    const authUser = await optionalAuthenticate(req)
    const userId = authUser?.userId || 'default'

    const searchParams = req.nextUrl.searchParams
    const fileId = searchParams.get('id')
    const password = searchParams.get('password')

    if (!fileId) {
      return NextResponse.json(
        { error: '缺少文件ID' },
        { status: 400 }
      )
    }

    if (!password) {
      return NextResponse.json(
        { error: '需要密码验证' },
        { status: 401 }
      )
    }

    // 验证密码
    const setting = await prisma.settings.findUnique({
      where: {
        userId_key: {
          userId,
          key: 'delete_password'
        }
      }
    })

    if (!setting) {
      return NextResponse.json(
        { error: '未设置删除密码，请先在设置中设置密码' },
        { status: 403 }
      )
    }

    const isValid = verifyPassword(password, setting.value)
    if (!isValid) {
      return NextResponse.json(
        { error: '密码错误' },
        { status: 401 }
      )
    }

    // 获取文件信息
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: { chunks: true }
    })

    if (!file) {
      return NextResponse.json(
        { error: '文件不存在' },
        { status: 404 }
      )
    }

    // 验证文件所有权
    if (file.userId !== userId) {
      return NextResponse.json(
        { error: '无权删除此文件' },
        { status: 403 }
      )
    }

    // 从 MemMachine 删除向量
    const memmachineUrl = process.env.MEMMACHINE_URL || 'http://localhost:8081'
    for (const chunk of file.chunks) {
      if (chunk.vectorId) {
        try {
          await fetch(`${memmachineUrl}/api/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: [chunk.vectorId] })
          })
        } catch (err) {
          console.error(`Failed to delete vector ${chunk.vectorId}:`, err)
        }
      }
    }

    // 删除文件系统中的文件
    try {
      const filePath = path.join(process.cwd(), file.filepath)
      await fs.unlink(filePath)
    } catch (err) {
      console.error('Failed to delete file from filesystem:', err)
    }

    // 删除缩略图
    if (file.thumbnailPath) {
      try {
        const thumbnailPath = path.join(process.cwd(), file.thumbnailPath)
        await fs.unlink(thumbnailPath)
      } catch (err) {
        console.error('Failed to delete thumbnail:', err)
      }
    }

    // 从数据库删除（会级联删除 chunks）
    await prisma.file.delete({
      where: { id: fileId }
    })

    return NextResponse.json({
      success: true,
      message: '文件删除成功'
    })

  } catch (error: any) {
    console.error('Delete file error:', error)
    return NextResponse.json(
      { error: error.message || '删除文件失败' },
      { status: 500 }
    )
  }
}
