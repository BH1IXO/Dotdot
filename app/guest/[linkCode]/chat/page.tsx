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
  const [dailyLimit, setDailyLimit] = useState(10)
  const [remainingQuota, setRemainingQuota] = useState(10)
  const [maxConversations, setMaxConversations] = useState<number | null>(null)
  const [conversationCount, setConversationCount] = useState(0)
  const [showRechargeModal, setShowRechargeModal] = useState(false)
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
        // 更新配额信息
        if (data.session.link) {
          setDailyLimit(data.session.link.dailyLimit || 10)
          setRemainingQuota(data.session.link.remainingQuota || 10)
          setMaxConversations(data.session.link.maxConversations)
          setConversationCount(data.session.link.conversationCount || 0)
        }
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

    // 创建一个临时的 AI 消息，初始内容为"思考中..."
    const aiMsg: Message = {
      id: 'ai-' + Date.now(),
      role: 'assistant',
      content: '💭 思考中...',
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
        if (res.status === 429) {
          const errorData = await res.json()
          // 更新配额信息
          if (errorData.dailyLimit !== undefined) {
            setDailyLimit(errorData.dailyLimit)
            setRemainingQuota(errorData.remainingQuota || 0)
          }
          if (errorData.maxConversations !== undefined) {
            setMaxConversations(errorData.maxConversations)
            setConversationCount(errorData.conversationCount || 0)
          }
          // 显示具体的错误信息
          alert(errorData.error || '问答次数已用尽，请充值后继续')
          // 移除临时AI消息
          setMessages(prev => prev.filter(m => m.id !== aiMsg.id))
          setLoading(false)
          return
        }
        throw new Error('请求失败')
      }

      // 读取流式响应
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('无法读取响应流')
      }

      let buffer = ''
      let messageCompleted = false
      let hasReceivedContent = false  // 标记是否已接收到内容

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
              messageCompleted = true
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
                      const currentContent = prev[lastIndex].content
                      // 如果当前显示"思考中..."且这是第一次收到内容，则完全替换
                      const isThinking = currentContent.includes('思考中')
                      let newContent: string

                      if (isThinking && !hasReceivedContent) {
                        // 第一次收到内容，完全替换"思考中..."
                        newContent = parsed.content
                      } else {
                        // 后续内容追加
                        newContent = currentContent + parsed.content
                      }

                      return [
                        ...prev.slice(0, lastIndex),
                        {
                          ...prev[lastIndex],
                          content: newContent
                        }
                      ]
                    }
                    return prev
                  })
                  // 标记已接收到内容（在setMessages之后，确保下次循环时hasReceivedContent已经是true）
                  hasReceivedContent = true
                }
              } catch (e) {
                console.error('解析数据失败:', e)
              }
            }
          }
        }
      }

      // 消息发送成功后，减少剩余配额并增加总对话计数
      if (messageCompleted) {
        setRemainingQuota(prev => Math.max(0, prev - 1))
        setConversationCount(prev => prev + 1)
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
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
        {/* 对话次数和充值按钮 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          background: (maxConversations === null || conversationCount < maxConversations) ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          borderRadius: '6px',
          color: 'white',
          fontSize: '13px'
        }}>
          <span style={{ fontWeight: '500' }}>
            总对话次数: {conversationCount} / {maxConversations === null ? '无限' : maxConversations} 次
          </span>
          <button
            onClick={() => setShowRechargeModal(true)}
            style={{
              padding: '4px 12px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
          >
            充值
          </button>
        </div>
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
            disabled={loading || !input.trim() || remainingQuota <= 0}
            style={{
              padding: '12px 24px',
              background: loading || !input.trim() || remainingQuota <= 0
                ? 'var(--text-secondary)'
                : 'var(--success-color)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading || !input.trim() || remainingQuota <= 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: loading || !input.trim() || remainingQuota <= 0 ? '0.6' : '1',
              minWidth: '100px'
            }}
            onMouseEnter={(e) => {
              if (!loading && input.trim() && remainingQuota > 0) {
                e.currentTarget.style.opacity = '0.9'
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && input.trim() && remainingQuota > 0) {
                e.currentTarget.style.opacity = '1'
              }
            }}
          >
            {remainingQuota <= 0 ? '次数已用尽' : loading ? '发送中...' : '发送'}
          </button>
        </div>
      </form>

      {/* 充值弹窗 */}
      {showRechargeModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowRechargeModal(false)}
        >
          <div
            style={{
              background: 'white',
              padding: '28px',
              borderRadius: '12px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 20px', fontSize: '18px', color: '#1f2937' }}>
              访客充值
            </h3>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '240px',
                height: '240px',
                margin: '0 auto',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
              }}>
                <img
                  src="/qrcode.png"
                  alt="微信支付二维码"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />
              </div>
              <div style={{
                marginTop: '16px',
                padding: '12px',
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#166534'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>充值说明</div>
                <div>10元 = 100次问答</div>
                <div style={{ fontSize: '12px', marginTop: '4px', color: '#15803d' }}>
                  付款后请联系管理员确认到账
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowRechargeModal(false)}
              style={{
                width: '100%',
                padding: '10px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
