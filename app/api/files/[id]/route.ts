import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { optionalAuthenticate } from '@/lib/auth-middleware'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/files/[id]
 * 获取单个文件的详细信息
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 可选认证
    const authUser = await optionalAuthenticate(req)
    const userId = authUser?.userId || 'default'

    // Await params in Next.js 15
    const { id: fileId } = await params

    const file = await prisma.file.findUnique({
      where: { id: fileId },
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
        { error: '无权访问此文件' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      id: file.id,
      filename: file.filename,
      url: file.filepath,
      mimetype: file.mimetype,
      size: file.size,
      status: file.status,
      description: file.description,
      createdAt: file.createdAt,
    })
  } catch (error: any) {
    console.error('Get file error:', error)
    return NextResponse.json(
      { error: error.message || '获取文件失败' },
      { status: 500 }
    )
  }
}
