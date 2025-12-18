import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile } from 'fs/promises'
import path from 'path'
import {
  processImage,
  processPDF,
  processWord,
  processExcel,
  processTextFile,
  chunkText,
  ensureDir,
  getFileUrl,
  getFileCategory,
  isAllowedFileType,
  isAllowedFileSize,
} from '@/lib/file-processor'
import { getMemMachineClient } from '@/lib/memmachine-client'
import { optionalAuthenticate } from '@/lib/auth-middleware'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * POST /api/files/upload
 * 上传文件
 */
export async function POST(req: NextRequest) {
  try {
    // 可选认证
    const authUser = await optionalAuthenticate(req)
    const userId = authUser?.userId || 'default'

    const formData = await req.formData()

    // 详细日志：查看接收到的 FormData
    console.log('📋 [Upload API] FormData keys:', Array.from(formData.keys()))

    const file = formData.get('file') as File
    const tagsJson = formData.get('tags') as string
    const extractedText = formData.get('extractedText') as string | null  // 客户端提取的文本
    const pdfPages = formData.get('pdfPages') as string | null            // PDF 页数

    console.log('📋 [Upload API] File:', file?.name, file?.type, file?.size)
    console.log('📋 [Upload API] extractedText:', extractedText ? `${extractedText.length} chars` : 'null/undefined')
    console.log('📋 [Upload API] pdfPages:', pdfPages || 'null/undefined')

    if (!file) {
      return NextResponse.json(
        { error: '没有提供文件' },
        { status: 400 }
      )
    }

    // 验证文件类型
    if (!isAllowedFileType(file.type)) {
      return NextResponse.json(
        { error: `不支持的文件类型: ${file.type}` },
        { status: 400 }
      )
    }

    // 验证文件大小
    if (!isAllowedFileSize(file.size, 10)) {
      return NextResponse.json(
        { error: `文件过大，最大支持 10MB` },
        { status: 400 }
      )
    }

    console.log(`📁 File upload from user: ${userId}`)
    const fileId = crypto.randomUUID()
    const ext = path.extname(file.name)
    const category = getFileCategory(file.type)

    // 确保上传目录存在
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', userId)
    await ensureDir(uploadDir)

    // 保存文件
    const filename = `${fileId}${ext}`
    const filepath = path.join(uploadDir, filename)
    const arrayBuffer = await file.arrayBuffer()
    await writeFile(filepath, Buffer.from(arrayBuffer))

    console.log(`📁 File uploaded: ${filename} (${file.size} bytes, ${file.type})`)

    // 创建数据库记录
    const fileRecord = await prisma.file.create({
      data: {
        id: fileId,
        filename: file.name,
        filepath: getFileUrl(userId, fileId, ext),
        mimetype: file.type,
        size: file.size,
        userId,
        status: 'processing',
        tags: tagsJson || '[]',
      },
    })

    // 后台异步处理文件（不阻塞响应）
    processFileAsync(fileId, filepath, file.type, userId, fileRecord.id, extractedText, pdfPages)
      .catch(err => {
        console.error(`❌ Failed to process file ${fileId}:`, err)
        // 更新状态为错误
        prisma.file.update({
          where: { id: fileId },
          data: {
            status: 'error',
            errorMessage: err.message,
          },
        }).catch(console.error)
      })

    // 立即返回响应
    return NextResponse.json({
      id: fileRecord.id,
      filename: file.name,
      url: fileRecord.filepath,
      mimetype: file.type,
      size: file.size,
      status: 'processing',
      createdAt: fileRecord.createdAt,
    })

  } catch (error: any) {
    console.error('File upload error:', error)
    return NextResponse.json(
      { error: error.message || '文件上传失败' },
      { status: 500 }
    )
  }
}

/**
 * 异步处理文件（生成缩略图、提取文本、向量索引等）
 */
async function processFileAsync(
  fileId: string,
  filepath: string,
  mimetype: string,
  userId: string,
  dbId: string,
  extractedText?: string | null,
  pdfPages?: string | null
) {
  console.log(`🔄 Processing file ${fileId}...`)

  const category = getFileCategory(mimetype)
  const updateData: any = {}

  // Get user-specific MemMachine client
  const userMemClient = getMemMachineClient(userId)

  try {
    // 处理图片
    if (category === 'image') {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', userId)
      const imageData = await processImage(filepath, uploadDir, fileId)

      updateData.width = imageData.width
      updateData.height = imageData.height
      updateData.thumbnailPath = imageData.thumbnailPath

      // 生成图片描述
      const filename = path.basename(filepath, path.extname(filepath))
      const description = `图片文件: ${filename} (${imageData.width}x${imageData.height})`
      updateData.description = description

      // 索引到 MemMachine
      try {
        await userMemClient.addMemory({
          content: `[图片文件]\n文件名: ${filename}\n尺寸: ${imageData.width}x${imageData.height}\n描述: ${description}\n路径: ${filepath}`,
          role: 'user',
          producer: userId,
          produced_for: 'assistant',
          metadata: {
            fileId: dbId,
            type: 'image',
            filename: filename,
            width: imageData.width.toString(),
            height: imageData.height.toString(),
          },
        })
        console.log(`✅ Image indexed to MemMachine: ${filename}`)
      } catch (err: any) {
        console.error('Failed to index image to MemMachine:', err)
        console.error('Error details:', err.message)
      }

      console.log(`✅ Image processed: ${fileId}`)
    }

    // 处理 Word 文档
    if (category === 'word') {
      const wordData = await processWord(filepath)
      updateData.extractedText = wordData.text
      updateData.description = `Word 文档，${wordData.text.length} 字符`

      const chunks = chunkText(wordData.text)
      console.log(`📄 Word processing complete: ${wordData.text.length} chars, ${chunks.length} chunks`)

      await Promise.all(
        chunks.map((content, index) =>
          prisma.fileChunk.create({
            data: {
              fileId: dbId,
              chunkIndex: index,
              content,
            },
          })
        )
      )

      try {
        await userMemClient.addMemories(
          chunks.map((content, index) => ({
            content: `[Word文档: ${path.basename(filepath)} - 第${index + 1}块]\n${content}`,
            role: 'user',
            producer: userId,
            produced_for: 'assistant',
            metadata: {
              fileId: dbId,
              chunkIndex: index.toString(),
              type: 'word_chunk',
              filename: path.basename(filepath),
            },
          }))
        )
        console.log(`✅ Word chunks indexed to MemMachine`)
      } catch (err: any) {
        console.error('Failed to index Word to MemMachine:', err)
      }
    }

    // 处理 Excel 表格
    if (category === 'excel') {
      const excelData = await processExcel(filepath)
      updateData.extractedText = excelData.text
      updateData.description = `Excel 表格，${excelData.sheets} 个工作表`

      const chunks = chunkText(excelData.text)
      console.log(`📊 Excel processing complete: ${excelData.text.length} chars, ${chunks.length} chunks`)

      await Promise.all(
        chunks.map((content, index) =>
          prisma.fileChunk.create({
            data: {
              fileId: dbId,
              chunkIndex: index,
              content,
            },
          })
        )
      )

      try {
        await userMemClient.addMemories(
          chunks.map((content, index) => ({
            content: `[Excel表格: ${path.basename(filepath)} - 第${index + 1}块]\n${content}`,
            role: 'user',
            producer: userId,
            produced_for: 'assistant',
            metadata: {
              fileId: dbId,
              chunkIndex: index.toString(),
              type: 'excel_chunk',
              filename: path.basename(filepath),
              sheets: excelData.sheets.toString(),
            },
          }))
        )
        console.log(`✅ Excel chunks indexed to MemMachine`)
      } catch (err: any) {
        console.error('Failed to index Excel to MemMachine:', err)
      }
    }

    // 处理文本文件 (txt, md)
    if (category === 'text') {
      const textData = await processTextFile(filepath)
      updateData.extractedText = textData.text
      updateData.description = `文本文件，${textData.text.length} 字符`

      const chunks = chunkText(textData.text)
      console.log(`📝 Text processing complete: ${textData.text.length} chars, ${chunks.length} chunks`)

      await Promise.all(
        chunks.map((content, index) =>
          prisma.fileChunk.create({
            data: {
              fileId: dbId,
              chunkIndex: index,
              content,
            },
          })
        )
      )

      try {
        await userMemClient.addMemories(
          chunks.map((content, index) => ({
            content: `[文本文件: ${path.basename(filepath)} - 第${index + 1}块]\n${content}`,
            role: 'user',
            producer: userId,
            produced_for: 'assistant',
            metadata: {
              fileId: dbId,
              chunkIndex: index.toString(),
              type: 'text_chunk',
              filename: path.basename(filepath),
            },
          }))
        )
        console.log(`✅ Text chunks indexed to MemMachine`)
      } catch (err: any) {
        console.error('Failed to index text to MemMachine:', err)
      }
    }

    // 处理 PDF
    if (category === 'pdf') {
      let pdfData;
      if (extractedText && pdfPages) {
        // 使用客户端提取的文本
        pdfData = {
          text: extractedText,
          pages: parseInt(pdfPages) || 0
        };
        console.log(`📄 Using client-extracted PDF text: ${extractedText.length} chars, ${pdfPages} pages`);
      } else {
        // 回退到服务端处理（不应该发生）
        pdfData = await processPDF(filepath);
        console.log(`⚠️  Fallback to server-side PDF extraction`);
      }

      updateData.extractedText = pdfData.text
      updateData.description = `PDF 文档，共 ${pdfData.pages} 页`

      // 文本分块
      const chunks = chunkText(pdfData.text)
      console.log(`📄 PDF processing complete: ${pdfData.text.length} chars, ${chunks.length} chunks`)

      // 保存分块到数据库
      await Promise.all(
        chunks.map((content, index) =>
          prisma.fileChunk.create({
            data: {
              fileId: dbId,
              chunkIndex: index,
              content,
            },
          })
        )
      )

      // 索引到 MemMachine
      try {
        console.log(`📤 Indexing ${chunks.length} chunks to MemMachine...`)
        const memResult = await userMemClient.addMemories(
          chunks.map((content, index) => ({
            content: `[PDF文档: ${path.basename(filepath)} - 第${index + 1}块]\n${content}`,
            role: 'user',  // MemMachine 只接受 'user' 或 'assistant'
            producer: userId,
            produced_for: 'assistant',
            metadata: {
              fileId: dbId,
              chunkIndex: index.toString(),
              type: 'pdf_chunk',
              filename: path.basename(filepath),
            },
          }))
        )
        console.log(`✅ PDF chunks indexed to MemMachine successfully!`)
        console.log(`   UIDs: ${memResult.results?.map(r => r.uid).join(', ') || 'N/A'}`)
      } catch (err: any) {
        console.error('❌ CRITICAL: Failed to index PDF to MemMachine!')
        console.error('   Error:', err.message)
        console.error('   Stack:', err.stack)

        // Mark file as error to alert user about indexing failure
        await prisma.file.update({
          where: { id: dbId },
          data: {
            status: 'error',
            errorMessage: `MemMachine indexing failed: ${err.message}`,
          },
        })

        // Don't throw - file is saved but not indexed
        console.error(`⚠️  File saved to database but NOT indexed to MemMachine: ${fileId}`)
        return // Exit early, don't mark as 'ready'
      }
    }

    // 更新状态为完成
    updateData.status = 'ready'

    await prisma.file.update({
      where: { id: dbId },
      data: updateData,
    })

    console.log(`✅ File processing completed: ${fileId}`)

  } catch (error: any) {
    console.error(`❌ File processing failed: ${fileId}`, error)
    await prisma.file.update({
      where: { id: dbId },
      data: {
        status: 'error',
        errorMessage: error.message,
      },
    })
  }
}
