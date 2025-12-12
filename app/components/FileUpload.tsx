'use client'

import { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'

// 动态导入 pdfjs-dist（仅在需要时加载）
let pdfjsLib: any = null

// 在客户端初始化 PDF.js
async function initPdfJs() {
  if (typeof window === 'undefined') return null

  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist')
    // 使用本地 worker 文件，避免 CDN 问题
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
  }

  return pdfjsLib
}

interface UploadedFile {
  id: string
  filename: string
  url: string
  status: string
  size: number
  createdAt: string
}

export default function FileUpload() {
  const { token } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processingStatus, setProcessingStatus] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  /**
   * 在浏览器端提取 PDF 文本
   */
  const extractPdfText = async (file: File): Promise<{ text: string; pages: number }> => {
    try {
      console.log('📄 [PDF Extract] Starting extraction for:', file.name)
      setProcessingStatus('正在加载 PDF 处理库...')

      console.log('📄 [PDF Extract] Calling initPdfJs()...')
      const pdfjs = await initPdfJs()

      if (!pdfjs) {
        console.error('❌ [PDF Extract] PDF.js failed to load')
        throw new Error('PDF.js 未能加载')
      }
      console.log('✅ [PDF Extract] PDF.js loaded successfully')

      setProcessingStatus('正在读取 PDF...')
      console.log('📄 [PDF Extract] Reading file arrayBuffer...')
      const arrayBuffer = await file.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      console.log(`✅ [PDF Extract] Read ${uint8Array.length} bytes from file`)

      setProcessingStatus('正在解析 PDF 文档...')
      console.log('📄 [PDF Extract] Creating PDF document...')
      const loadingTask = pdfjs.getDocument({ data: uint8Array })
      const pdfDocument = await loadingTask.promise
      const numPages = pdfDocument.numPages
      console.log(`✅ [PDF Extract] PDF loaded successfully - ${numPages} pages`)

      setProcessingStatus(`正在提取文本 (共 ${numPages} 页)...`)
      console.log(`📄 [PDF Extract] Extracting text from ${numPages} pages...`)
      const textPromises: Promise<string>[] = []

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        textPromises.push(
          pdfDocument.getPage(pageNum).then(async (page: any) => {
            const textContent = await page.getTextContent()
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ')
            console.log(`✅ [PDF Extract] Page ${pageNum}: ${pageText.length} chars`)
            return pageText
          })
        )
      }

      const pageTexts = await Promise.all(textPromises)
      const fullText = pageTexts.join('\n\n')
      console.log(`✅ [PDF Extract] Extraction complete: ${fullText.length} total chars`)

      setProcessingStatus('文本提取完成！')
      return { text: fullText, pages: numPages }
    } catch (err: any) {
      console.error('❌ [PDF Extract] ERROR:', err)
      console.error('❌ [PDF Extract] Error stack:', err.stack)
      console.error('❌ [PDF Extract] Error name:', err.name)
      console.error('❌ [PDF Extract] Error message:', err.message)
      throw new Error(`PDF 文本提取失败: ${err.message}`)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    await uploadFile(file)
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return

    await uploadFile(file)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const uploadFile = async (file: File) => {
    setUploading(true)
    setError(null)
    setUploadedFile(null)
    setProcessingStatus('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      // 如果是 PDF 文件，先在浏览器端提取文本
      if (file.type === 'application/pdf') {
        try {
          const { text, pages } = await extractPdfText(file)
          formData.append('extractedText', text)
          formData.append('pdfPages', pages.toString())
          console.log(`📄 PDF text extracted: ${text.length} chars, ${pages} pages`)
        } catch (pdfError: any) {
          console.error('PDF extraction failed:', pdfError)
          // 即使提取失败，仍然上传文件
          setProcessingStatus('PDF 文本提取失败，仍然上传文件...')
        }
      }

      setProcessingStatus('正在上传文件...')

      const headers: HeadersInit = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers,
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '上传失败')
      }

      const data = await response.json()
      setUploadedFile(data)
      console.log('✅ File uploaded:', data)

      // 重置文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div style={{
      padding: '16px 24px',
      borderBottom: '1px solid #e5e7eb',
      background: 'white'
    }}>
      <div
        className={`upload-area ${uploading ? 'uploading' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept="image/*,application/pdf"
          style={{ display: 'none' }}
        />

        {uploading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div className="spinner"></div>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              {processingStatus || '上传中...'}
            </span>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#ede9fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>
              📎
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#1f2937',
                marginBottom: '4px'
              }}>
                拖拽文件到这里，或点击选择文件
              </div>
              <div style={{
                fontSize: '12px',
                color: '#6b7280'
              }}>
                支持：图片 (JPG, PNG, GIF) · PDF 文档 · 最大 10MB
              </div>
            </div>
            <button
              style={{
                padding: '8px 16px',
                background: '#4f46e5',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              选择文件
            </button>
          </div>
        )}
      </div>

      {error && (
        <div style={{
          marginTop: '12px',
          padding: '10px 12px',
          background: '#fee',
          border: '1px solid #fca5a5',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#dc2626',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>❌</span>
          <span>{error}</span>
        </div>
      )}

      {uploadedFile && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          background: '#f0fdf4',
          border: '1px solid #86efac',
          borderRadius: '8px',
          fontSize: '13px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
            color: '#166534',
            fontWeight: '500'
          }}>
            <span>✅</span>
            <span>上传成功</span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '8px',
            fontSize: '12px',
            color: '#374151'
          }}>
            <span style={{ fontWeight: '500' }}>文件名：</span>
            <span>{uploadedFile.filename}</span>
            <span style={{ fontWeight: '500' }}>大小：</span>
            <span>{formatFileSize(uploadedFile.size)}</span>
            <span style={{ fontWeight: '500' }}>状态：</span>
            <span>
              {uploadedFile.status === 'processing' && '⏳ 正在处理...'}
              {uploadedFile.status === 'ready' && '✓ 已就绪'}
              {uploadedFile.status === 'error' && '❌ 处理失败'}
            </span>
          </div>
        </div>
      )}

      <style jsx>{`
        .upload-area {
          border: 2px dashed #d1d5db;
          borderRadius: 12px;
          padding: 16px 20px;
          cursor: pointer;
          transition: all 0.2s;
          background: #fafafa;
        }

        .upload-area:hover {
          border-color: #8b5cf6;
          background: #faf5ff;
        }

        .upload-area.uploading {
          border-color: #8b5cf6;
          background: #f5f3ff;
          cursor: not-allowed;
        }

        .spinner {
          border: 3px solid #f3f4f6;
          border-top: 3px solid #8b5cf6;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
