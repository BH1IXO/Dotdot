'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
  id: string
  role: string
  content: string
  createdAt: string
}

export default function GuestChatPage() {
  const params = useParams()
  const linkCode = params.linkCode as string
  const [sessionId, setSessionId] = useState<string | null>(null)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [guestName, setGuestName] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 从 localStorage 获取 sessionId
    const storedSessionId = localStorage.getItem(`guest-session-${linkCode}`)
    setSessionId(storedSessionId)
  }, [linkCode])

  useEffect(() => {
    if (sessionId) {
      fetchHistory()
    }
  }, [sessionId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/guest-chat/history?sessionId=${sessionId}`)
      const data = await res.json()
      if (data.success) {
        setMessages(data.messages)
        setGuestName(data.session.guestName)
      }
    } catch (error) {
      console.error('获取历史失败:', error)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !sessionId || loading) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)

    // 添加用户消息
    const userMsg: Message = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMsg])

    // 创建一个临时的 AI 消息用于流式更新
    const aiMsg: Message = {
      id: 'ai-' + Date.now(),
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString()
    }
    setMessages(prev => [...prev, aiMsg])

    try {
      const res = await fetch('/api/guest-chat/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: userMessage
        })
      })

      if (!res.ok) {
        throw new Error('请求失败')
      }

      // 读取流式响应
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('无法读取响应流')
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
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
                  // 更新最后一条消息的内容
                  setMessages(prev => {
                    const lastIndex = prev.length - 1
                    if (lastIndex >= 0 && prev[lastIndex].role === 'assistant') {
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
                console.error('解析数据失败:', e)
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('发送失败:', error)
      alert('发送失败,请重试')
      // 移除AI消息
      setMessages(prev => prev.filter(m => m.id !== aiMsg.id))
    } finally {
      setLoading(false)
    }
  }

  if (!sessionId) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-secondary)'
      }}>
        <p style={{ color: 'var(--danger-color)', fontSize: '16px' }}>
          会话不存在,请返回重新开始
        </p>
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'var(--bg-secondary)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
    }}>
      {/* Header */}
      <div style={{
        background: 'var(--bg-primary)',
        boxShadow: 'var(--shadow-md)',
        padding: '20px 24px',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '20px',
          fontWeight: '700',
          background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          访客对话 - {guestName}
        </h1>
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            <div style={{
              maxWidth: '70%',
              padding: '12px 16px',
              borderRadius: '12px',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))'
                : 'var(--bg-primary)',
              color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
              boxShadow: 'var(--shadow-md)',
              border: msg.role === 'assistant' ? '1px solid var(--border-color)' : 'none'
            }}>
              <div style={{
                margin: 0,
                lineHeight: '1.6',
                fontSize: '14px'
              }}>
                {msg.role === 'user' ? (
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({node, ...props}) => <p style={{ margin: '0.5em 0' }} {...props} />,
                      ul: ({node, ...props}) => <ul style={{ margin: '0.5em 0', paddingLeft: '1.5em' }} {...props} />,
                      ol: ({node, ...props}) => <ol style={{ margin: '0.5em 0', paddingLeft: '1.5em' }} {...props} />,
                      li: ({node, ...props}) => <li style={{ margin: '0.25em 0' }} {...props} />,
                      code: ({node, className, children, ...props}) => {
                        const isInline = !className
                        return isInline ? (
                          <code style={{
                            background: 'rgba(0,0,0,0.05)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.9em',
                            fontFamily: 'monospace'
                          }} {...props}>{children}</code>
                        ) : (
                          <code style={{
                            display: 'block',
                            background: 'rgba(0,0,0,0.05)',
                            padding: '12px',
                            borderRadius: '6px',
                            fontSize: '0.9em',
                            fontFamily: 'monospace',
                            overflowX: 'auto',
                            whiteSpace: 'pre'
                          }} {...props}>{children}</code>
                        )
                      },
                      a: ({node, ...props}) => <a style={{ color: 'var(--primary-color)', textDecoration: 'underline' }} {...props} target="_blank" rel="noopener noreferrer" />,
                      h1: ({node, ...props}) => <h1 style={{ fontSize: '1.5em', margin: '0.5em 0', fontWeight: 'bold' }} {...props} />,
                      h2: ({node, ...props}) => <h2 style={{ fontSize: '1.3em', margin: '0.5em 0', fontWeight: 'bold' }} {...props} />,
                      h3: ({node, ...props}) => <h3 style={{ fontSize: '1.1em', margin: '0.5em 0', fontWeight: 'bold' }} {...props} />,
                      blockquote: ({node, ...props}) => <blockquote style={{ borderLeft: '4px solid var(--border-color)', paddingLeft: '1em', margin: '0.5em 0', opacity: 0.8 }} {...props} />,
                      table: ({node, ...props}) => <table style={{ borderCollapse: 'collapse', width: '100%', margin: '0.5em 0' }} {...props} />,
                      th: ({node, ...props}) => <th style={{ border: '1px solid var(--border-color)', padding: '8px', textAlign: 'left', background: 'rgba(0,0,0,0.03)' }} {...props} />,
                      td: ({node, ...props}) => <td style={{ border: '1px solid var(--border-color)', padding: '8px' }} {...props} />,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                )}
              </div>
              <p style={{
                fontSize: '11px',
                marginTop: '8px',
                marginBottom: 0,
                opacity: 0.7,
                textAlign: 'right'
              }}>
                {new Date(msg.createdAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={sendMessage} style={{
        background: 'var(--bg-primary)',
        boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)',
        padding: '20px 24px',
        borderTop: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="输入消息..."
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.2s',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--primary-color)'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              padding: '12px 24px',
              background: loading || !input.trim()
                ? 'var(--text-secondary)'
                : 'var(--success-color)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: loading || !input.trim() ? '0.6' : '1',
              minWidth: '100px'
            }}
            onMouseEnter={(e) => {
              if (!loading && input.trim()) {
                e.currentTarget.style.opacity = '0.9'
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && input.trim()) {
                e.currentTarget.style.opacity = '1'
              }
            }}
          >
            {loading ? '发送中...' : '发送'}
          </button>
        </div>
      </form>
    </div>
  )
}
