'use client'

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
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

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  files?: Array<{ id: string; filename: string; url: string }>
}

export default function ChatView() {
  const { token, user } = useAuth()
  const userName = user?.name || user?.email?.split('@')[0] || '用户'

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `你好！我是 ${userName} 的数字分身，我可以帮助 ${userName}：

• 📸 查找和管理照片和文件
• 📝 回忆写过的文章和笔记内容
• 💡 提供个性化建议
• 🧠 学习并记住分享的所有知识

你可以问我任何问题！当然，在 ${userName} 的授权下，你可以知道有限的内容。`,
      timestamp: '刚刚',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [webSearchEnabled, setWebSearchEnabled] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ id: string; filename: string; url: string }>>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [clearTimestamp, setClearTimestamp] = useState<string | null>(() => {
    // 从 localStorage 读取清空屏幕的时间戳
    if (typeof window !== 'undefined') {
      return localStorage.getItem('clearTimestamp')
    }
    return null
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // 清理内容中的 HTML 标签
  const cleanContent = (content: string) => {
    return content.replace(/<[^>]*>/g, '')
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 加载历史对话（会根据清空时间戳过滤）
  useEffect(() => {
    if (!historyLoaded) {
      loadChatHistory()
    }
  }, [historyLoaded])

  const loadChatHistory = async () => {
    try {
      const headers: HeadersInit = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/chat/history?limit=20', { headers })
      if (response.ok) {
        const data = await response.json()
        if (data.messages && data.messages.length > 0) {
          // 根据清空时间戳过滤消息
          let filteredMessages = data.messages
          if (clearTimestamp) {
            const clearTime = new Date(clearTimestamp)
            filteredMessages = data.messages.filter((msg: any) => {
              const msgTime = new Date(msg.createdAt)
              return msgTime > clearTime
            })
          }

          if (filteredMessages.length > 0) {
            // 将历史消息添加到当前消息列表中（在欢迎消息之后）
            const welcomeMessage = messages[0]
            const historyMessages = filteredMessages.map((msg: any) => {
              // 解析metadata中的文件信息
              let files: Array<{ id: string; filename: string; url: string }> | undefined
              try {
                const metadata = msg.metadata ? JSON.parse(msg.metadata) : {}
                files = metadata.files
              } catch (e) {
                console.error('Failed to parse message metadata:', e)
              }

              return {
                role: msg.role,
                content: msg.content,
                timestamp: new Date(msg.createdAt).toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                files,
              }
            })
            setMessages([welcomeMessage, ...historyMessages])
          }
        }
      }
    } catch (error) {
      console.error('加载历史对话失败:', error)
    } finally {
      setHistoryLoaded(true)
    }
  }

  const extractPdfText = async (file: File): Promise<{ text: string; pages: number }> => {
    try {
      console.log('📄 [ChatView PDF Extract] Starting extraction for:', file.name)

      console.log('📄 [ChatView PDF Extract] Calling initPdfJs()...')
      const pdfjs = await initPdfJs()

      if (!pdfjs) {
        console.error('❌ [ChatView PDF Extract] PDF.js failed to load')
        throw new Error('PDF.js 未能加载')
      }
      console.log('✅ [ChatView PDF Extract] PDF.js loaded successfully')

      console.log('📄 [ChatView PDF Extract] Reading file arrayBuffer...')
      const arrayBuffer = await file.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      console.log(`✅ [ChatView PDF Extract] Read ${uint8Array.length} bytes from file`)

      console.log('📄 [ChatView PDF Extract] Creating PDF document...')
      const loadingTask = pdfjs.getDocument({ data: uint8Array })
      const pdfDocument = await loadingTask.promise
      const numPages = pdfDocument.numPages
      console.log(`✅ [ChatView PDF Extract] PDF loaded successfully - ${numPages} pages`)

      console.log(`📄 [ChatView PDF Extract] Extracting text from ${numPages} pages...`)
      const textPromises: Promise<string>[] = []

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        textPromises.push(
          pdfDocument.getPage(pageNum).then(async (page: any) => {
            const textContent = await page.getTextContent()
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ')
            console.log(`✅ [ChatView PDF Extract] Page ${pageNum}: ${pageText.length} chars`)
            return pageText
          })
        )
      }

      const pageTexts = await Promise.all(textPromises)
      const fullText = pageTexts.join('\n\n')
      console.log(`✅ [ChatView PDF Extract] Extraction complete: ${fullText.length} total chars`)

      return { text: fullText, pages: numPages }
    } catch (err: any) {
      console.error('❌ [ChatView PDF Extract] ERROR:', err)
      console.error('❌ [ChatView PDF Extract] Error stack:', err.stack)
      console.error('❌ [ChatView PDF Extract] Error name:', err.name)
      console.error('❌ [ChatView PDF Extract] Error message:', err.message)
      throw new Error(`PDF 文本提取失败: ${err.message}`)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    // 如果是 PDF 文件，先在浏览器端提取文本
    if (file.type === 'application/pdf') {
      try {
        const { text, pages } = await extractPdfText(file)
        formData.append('extractedText', text)
        formData.append('pdfPages', pages.toString())
        console.log(`📄 [ChatView] PDF text extracted: ${text.length} chars, ${pages} pages`)
      } catch (pdfError: any) {
        console.error('❌ [ChatView] PDF extraction failed:', pdfError)
        // 即使提取失败，仍然上传文件
        alert('PDF文本提取失败，将使用服务器端处理')
      }
    }

    // 详细日志：查看发送的 FormData
    console.log('📋 [ChatView] FormData keys before send:', Array.from(formData.keys()))
    for (const [key, value] of formData.entries()) {
      if (key === 'file') {
        console.log(`📋 [ChatView] FormData.${key}:`, (value as File).name, (value as File).type, (value as File).size)
      } else if (key === 'extractedText') {
        console.log(`📋 [ChatView] FormData.${key}:`, (value as string).length, 'chars')
      } else {
        console.log(`📋 [ChatView] FormData.${key}:`, value)
      }
    }

    try {
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
        const errorData = await response.json().catch(() => ({ error: '文件上传失败' }))
        throw new Error(errorData.error || '文件上传失败')
      }

      const data = await response.json()
      // 替换为新上传的文件,而不是累积文件(修复文件顺序错误)
      setUploadedFiles([data])
      console.log('✅ File uploaded to chat (replacing previous):', data)

      // 清空 file input，允许重新选择相同文件
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // 轮询检查文件处理状态
      if (data.status === 'processing') {
        pollFileStatus(data.id)
      }
    } catch (error: any) {
      console.error('File upload error:', error)
      alert(error.message || '文件上传失败，请重试')
    }
  }

  const pollFileStatus = async (fileId: string) => {
    const maxAttempts = 30 // 最多轮询 30 次
    let attempts = 0

    const poll = async () => {
      try {
        const headers: HeadersInit = {}
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(`/api/files/${fileId}`, { headers })
        if (!response.ok) return

        const fileData = await response.json()

        // 更新文件状态
        setUploadedFiles((prev) =>
          prev.map((f) => f.id === fileId ? { ...f, status: fileData.status } : f)
        )

        // 如果处理完成或出错，停止轮询
        if (fileData.status === 'ready' || fileData.status === 'error') {
          console.log(`✅ File processing ${fileData.status}:`, fileId)
          return
        }

        // 继续轮询
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000) // 每秒检查一次
        }
      } catch (error) {
        console.error('Poll file status error:', error)
      }
    }

    poll()
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    // 构建消息内容，包含文件信息
    let messageContent = input
    if (uploadedFiles.length > 0) {
      messageContent += '\n\n📎 附件：\n'
      uploadedFiles.forEach(file => {
        messageContent += `• ${file.filename}\n`
      })
    }

    const userMessage: Message = {
      role: 'user',
      content: messageContent,
      timestamp: new Date().toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // 保存当前上传的文件列表
    const currentFiles = [...uploadedFiles]
    // 清空文件列表
    setUploadedFiles([])

    try {
      // 只传递最近 5 条对话作为上下文（不包括欢迎消息）
      const recentHistory = messages
        .slice(1) // 跳过第一条欢迎消息
        .slice(-5) // 只取最近 5 条
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }))

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      }

      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: input,
          history: recentHistory,
          files: currentFiles,
          webSearchEnabled: webSearchEnabled,
        }),
      })

      if (!response.ok) {
        throw new Error('请求失败')
      }

      // 创建一个临时的 AI 消息用于流式更新
      const aiMessage: Message = {
        role: 'assistant',
        content: '',
        timestamp: new Date().toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      }
      setMessages((prev) => [...prev, aiMessage])

      // 读取流式响应
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('无法读取响应流')
      }

      let buffer = '' // 添加缓冲区处理不完整的数据块

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        // 将新数据添加到缓冲区
        buffer += decoder.decode(value, { stream: true })

        // 按行分割
        const lines = buffer.split('\n')

        // 保留最后一个可能不完整的行
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') {
              break
            }
            if (data) {
              try {
                const parsed = JSON.parse(data)
                if (parsed.content) {
                  console.log('📨 Received chunk:', parsed.content.slice(0, 50))
                  // 使用函数式更新，但只修改内容，不创建新数组
                  setMessages((prev) => {
                    const lastIndex = prev.length - 1
                    if (lastIndex >= 0 && prev[lastIndex].role === 'assistant') {
                      // 创建新数组，但只更新最后一个消息
                      return [
                        ...prev.slice(0, lastIndex),
                        {
                          ...prev[lastIndex],
                          content: prev[lastIndex].content + parsed.content
                        }
                      ]
                    }
                    return prev
                  })
                }
              } catch (e) {
                console.error('解析 SSE 数据失败:', e, 'Data:', data)
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('发送消息失败:', error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '抱歉，发生了错误。请稍后再试。',
          timestamp: new Date().toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const suggestions = [
    '你好，介绍一下你自己',
    '你能帮我做什么？',
    '给我讲个笑话',
  ]

  return (
    <div className="view active" id="chat-view">
      <div className="chat-header">
        <h2>与你的数字分身对话</h2>
        <div className="chat-actions">
          <button className="btn-secondary" onClick={() => {
            setMessages([messages[0]])
            // 保存清空屏幕的时间戳
            const timestamp = new Date().toISOString()
            setClearTimestamp(timestamp)
            localStorage.setItem('clearTimestamp', timestamp)
          }}>
            清空屏幕
          </button>
        </div>
      </div>

      <div className="chat-container">
        <div className="messages" id="messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              <div className="message-avatar">{msg.role === 'user' ? '👤' : '🤖'}</div>
              <div className="message-content">
                {/* 显示文件附件 */}
                {msg.files && msg.files.length > 0 && (
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                    marginBottom: '8px'
                  }}>
                    {msg.files.map((file) => (
                      <div
                        key={file.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          background: '#f3f4f6',
                          borderRadius: '6px',
                          fontSize: '13px',
                          color: '#374151'
                        }}
                      >
                        <span>📎</span>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            textDecoration: 'underline',
                            color: '#374151',
                            cursor: 'pointer'
                          }}
                        >
                          {file.filename}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
                <div className="message-text markdown-content">
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {cleanContent(msg.content)}
                    </ReactMarkdown>
                  ) : (
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                  )}
                </div>
                <div className="message-time">{msg.timestamp}</div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area">
          {/* 上传的文件列表 */}
          {uploadedFiles.length > 0 && (
            <div style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              marginBottom: '12px',
              padding: '0 12px'
            }}>
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: '#f3f4f6',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#374151'
                  }}
                >
                  <span>📎</span>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      textDecoration: 'underline',
                      color: '#374151',
                      cursor: 'pointer'
                    }}
                  >
                    {file.filename}
                  </a>
                  <button
                    onClick={() => removeFile(file.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#6b7280',
                      fontSize: '16px',
                      padding: '0 4px'
                    }}
                    title="移除文件"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="input-container">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept="image/*,application/pdf"
              style={{ display: 'none' }}
            />
            <button
              className="btn-icon"
              title="上传文件"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              📎
            </button>
            <button
              className="btn-icon"
              title={webSearchEnabled ? '关闭网络搜索' : '开启网络搜索'}
              onClick={() => setWebSearchEnabled(!webSearchEnabled)}
              style={{
                background: webSearchEnabled ? '#ede9fe' : 'transparent',
                color: webSearchEnabled ? '#7c3aed' : '#6b7280'
              }}
            >
              🌐
            </button>
            <textarea
              id="message-input"
              placeholder={webSearchEnabled ? '试试问：今天的日期？最新的新闻？' : '试试问：你好，介绍一下你自己...'}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <button
              className="btn-send"
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? '发送中...' : '发送'}
            </button>
          </div>
          <div className="input-suggestions">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                className="suggestion"
                onClick={() => setInput(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
