'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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

export default function GuestChatsPage() {
  const router = useRouter()
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
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">访客对话记录</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 左侧: 会话列表 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">
            会话列表 ({sessions.length})
          </h2>
          {sessions.length === 0 ? (
            <p className="text-gray-500">暂无访客对话</p>
          ) : (
            sessions.map(session => (
              <div
                key={session.id}
                onClick={() => viewMessages(session.id)}
                className={`p-4 border rounded cursor-pointer hover:bg-gray-50 ${
                  selectedSession === session.id ? 'bg-blue-50 border-blue-500' : 'bg-white'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold">{session.guestName}</h3>
                    <p className="text-sm text-gray-600">
                      链接: {session.link.label || session.link.linkCode}
                    </p>
                    <p className="text-sm text-gray-600">
                      消息数: {session.messageCount}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(session.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 右侧: 消息详情 */}
        <div className="border rounded p-4 bg-white">
          {!selectedSession ? (
            <p className="text-gray-500 text-center py-8">
              选择一个会话查看消息
            </p>
          ) : loadingMessages ? (
            <p className="text-center py-8">加载中...</p>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              <h2 className="text-xl font-semibold sticky top-0 bg-white pb-2 border-b">
                对话内容
              </h2>
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`p-3 rounded ${
                    msg.role === 'user'
                      ? 'bg-blue-100 ml-8'
                      : 'bg-gray-100 mr-8'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-sm">
                      {msg.role === 'user' ? '访客' : '数字分身'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
