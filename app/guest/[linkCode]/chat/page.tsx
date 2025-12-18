'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'

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
    if (!input.trim() || !sessionId) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)

    // 立即显示用户消息
    const tempUserMsg: Message = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString()
    }
    setMessages([...messages, tempUserMsg])

    try {
      const res = await fetch('/api/guest-chat/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: userMessage
        })
      })

      const data = await res.json()

      if (data.success) {
        // 替换临时消息并添加AI回复
        setMessages(prev => [
          ...prev.filter(m => m.id !== tempUserMsg.id),
          data.userMessage,
          data.assistantMessage
        ])
      } else {
        alert('发送失败: ' + (data.error || '未知错误'))
        // 移除临时消息
        setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id))
      }
    } catch (error) {
      alert('发送失败,请重试')
      // 移除临时消息
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id))
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
              <p style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                lineHeight: '1.6',
                fontSize: '14px'
              }}>
                {msg.content}
              </p>
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
