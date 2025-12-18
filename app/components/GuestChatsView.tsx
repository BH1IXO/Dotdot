'use client'

import { useEffect, useState } from 'react'

interface GuestSession {
  id: string
  guestName: string
  messageCount: number
  createdAt: string
  updatedAt: string
  link: {
    linkCode: string
    label: string | null
  }
}

interface Message {
  id: string
  role: string
  content: string
  createdAt: string
}

export default function GuestChatsView() {
  const [sessions, setSessions] = useState<GuestSession[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch('/api/guest-chat/sessions', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setSessions(data.sessions)
      }
    } catch (error) {
      console.error('获取会话列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const viewMessages = async (sessionId: string) => {
    setSelectedSession(sessionId)
    setLoadingMessages(true)
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch(`/api/guest-chat/history?sessionId=${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setMessages(data.messages)
      }
    } catch (error) {
      console.error('获取消息失败:', error)
    } finally {
      setLoadingMessages(false)
    }
  }

  if (loading) return <div className="p-8">加载中...</div>

  return (
    <div className="view active">
      <div className="view-header">
        <h2>访客对话记录</h2>
      </div>

      <div className="view-content">
        <div className="guest-chats-container">
          {/* 左侧: 会话列表 */}
          <div className="sessions-panel">
            <h3>会话列表 ({sessions.length})</h3>
            {sessions.length === 0 ? (
              <p className="empty-state">暂无访客对话</p>
            ) : (
              <div className="sessions-list">
                {sessions.map(session => (
                  <div
                    key={session.id}
                    onClick={() => viewMessages(session.id)}
                    className={`session-item ${selectedSession === session.id ? 'active' : ''}`}
                  >
                    <h4>{session.guestName}</h4>
                    <p>链接: {session.link.label || session.link.linkCode}</p>
                    <p>消息数: {session.messageCount}</p>
                    <p className="time">{new Date(session.createdAt).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 右侧: 消息详情 */}
          <div className="messages-panel">
            {!selectedSession ? (
              <p className="empty-state-center">选择一个会话查看消息</p>
            ) : loadingMessages ? (
              <p className="empty-state-center">加载中...</p>
            ) : (
              <div className="messages-container">
                <h3>对话内容</h3>
                <div className="messages-list">
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`message ${msg.role === 'user' ? 'user' : 'assistant'}`}
                    >
                      <div className="message-header">
                        <span className="role">
                          {msg.role === 'user' ? '访客' : '数字分身'}
                        </span>
                        <span className="time">
                          {new Date(msg.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="message-content">{msg.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .guest-chats-container {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 24px;
          height: calc(100vh - 200px);
        }

        .sessions-panel,
        .messages-panel {
          background: white;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .sessions-panel h3,
        .messages-panel h3 {
          padding: 16px 20px;
          margin: 0;
          border-bottom: 1px solid #e5e7eb;
          font-size: 16px;
        }

        .sessions-list {
          overflow-y: auto;
          flex: 1;
        }

        .session-item {
          padding: 16px 20px;
          border-bottom: 1px solid #f3f4f6;
          cursor: pointer;
          transition: background 0.2s;
        }

        .session-item:hover {
          background: #f9fafb;
        }

        .session-item.active {
          background: #eff6ff;
          border-left: 3px solid #3b82f6;
        }

        .session-item h4 {
          margin: 0 0 8px 0;
          font-size: 16px;
          font-weight: 600;
        }

        .session-item p {
          margin: 4px 0;
          font-size: 13px;
          color: #6b7280;
        }

        .session-item p.time {
          font-size: 12px;
          color: #9ca3af;
        }

        .messages-container {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .messages-list {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .message {
          padding: 12px 16px;
          border-radius: 8px;
        }

        .message.user {
          background: #dbeafe;
          margin-left: 60px;
        }

        .message.assistant {
          background: #f3f4f6;
          margin-right: 60px;
        }

        .message-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .message-header .role {
          font-weight: 600;
          font-size: 13px;
        }

        .message-header .time {
          font-size: 11px;
          color: #9ca3af;
        }

        .message-content {
          margin: 0;
          font-size: 14px;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .empty-state {
          text-align: center;
          color: #9ca3af;
          padding: 20px;
        }

        .empty-state-center {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #9ca3af;
        }
      `}</style>
    </div>
  )
}
