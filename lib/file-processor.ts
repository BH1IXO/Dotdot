/**
 * 文件处理工具
 * 处理图片缩略图生成、PDF文本提取等
 */

import sharp from 'sharp'
import path from 'path'
import fs from 'fs/promises'

export interface ProcessedImage {
  width: number
  height: number
  thumbnailPath: string
}

export interface ProcessedPDF {
  text: string
  pages: number
}

/**
 * 处理图片：生成缩略图并获取尺寸
 */
export async function processImage(
  inputPath: string,
  outputDir: string,
  filename: string
): Promise<ProcessedImage> {
  const image = sharp(inputPath)
  const metadata = await image.metadata()

  // 生成缩略图 (200x200)
  const thumbnailFilename = `${filename}_thumb.jpg`
  const thumbnailPath = path.join(outputDir, thumbnailFilename)

  await image
    .resize(200, 200, {
      fit: 'cover',
      position: 'center',
    })
    .jpeg({ quality: 80 })
    .toFile(thumbnailPath)

  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    thumbnailPath: `/uploads/${path.basename(outputDir)}/${thumbnailFilename}`,
  }
}

/**
 * 处理 PDF：提取文本内容
 * 注意：PDF 文本提取现在在客户端浏览器中完成（使用 pdfjs-dist）
 * 此函数仅作为回退，正常情况下不应被调用
 */
export async function processPDF(filePath: string): Promise<ProcessedPDF> {
  console.warn('⚠️  Server-side PDF processing should not be called - PDF text should be extracted client-side')

  // 返回占位符，提示应使用客户端提取
  return {
    text: '[PDF 文本应由客户端提取]',
    pages: 0,
  }
}

/**
 * 将长文本分块
 * @param text 原始文本
 * @param chunkSize 每块字符数
 * @param overlap 重叠字符数
 */
export function chunkText(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    chunks.push(text.slice(start, end))
    start += chunkSize - overlap
  }

  return chunks
}

/**
 * 生成文件的唯一存储路径
 */
export function generateFilePath(userId: string, fileId: string, ext: string): string {
  return path.join('public', 'uploads', userId, `${fileId}${ext}`)
}

/**
 * 获取文件的 URL 路径
 */
export function getFileUrl(userId: string, fileId: string, ext: string): string {
  return `/uploads/${userId}/${fileId}${ext}`
}

/**
 * 确保目录存在
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath)
  } catch {
    await fs.mkdir(dirPath, { recursive: true })
  }
}

/**
 * 获取文件 MIME 类型对应的分类
 */
export function getFileCategory(mimetype: string): string {
  if (mimetype.startsWith('image/')) return 'image'
  if (mimetype === 'application/pdf') return 'pdf'
  if (mimetype.startsWith('text/')) return 'text'
  if (mimetype.startsWith('video/')) return 'video'
  if (mimetype.startsWith('audio/')) return 'audio'
  return 'other'
}

/**
 * 验证文件类型是否允许
 */
export function isAllowedFileType(mimetype: string): boolean {
  const allowedTypes = [
    // 图片
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    // 文档
    'application/pdf',
    'text/plain',
    'text/markdown',
  ]
  return allowedTypes.includes(mimetype)
}

/**
 * 验证文件大小是否在限制内
 */
export function isAllowedFileSize(size: number, maxSizeMB: number = 10): boolean {
  const maxBytes = maxSizeMB * 1024 * 1024
  return size <= maxBytes
}
