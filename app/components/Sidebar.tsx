'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface SidebarProps {
  activeView: string
  onViewChange: (view: string) => void
  user: { name?: string; email: string } | null
  onLogout: () => void
}

interface Stats {
  messages: number
  memories: number
  files: number
}

export default function Sidebar({ activeView, onViewChange, user, onLogout }: SidebarProps) {
  const { token } = useAuth()
  const [stats, setStats] = useState<Stats>({ messages: 0, memories: 0, files: 0 })
  const [loading, setLoading] = useState(true)

  const navItems = [
    { id: 'chat', icon: '💬', label: '对话' },
    { id: 'memory', icon: '🧠', label: '记忆库' },
    { id: 'files', icon: '📁', label: '文件管理' },
    { id: 'knowledge', icon: '📚', label: '知识库' },
    { id: 'settings', icon: '⚙️', label: '设置' },
  ]

  useEffect(() => {
    loadStats()
  }, [token])

  const loadStats = async () => {
    if (!token) {
      setStats({ messages: 0, memories: 0, files: 0 })
      setLoading(false)
      return
    }

    try {
      const headers: HeadersInit = {
        'Authorization': `Bearer ${token}`
      }

      // Fetch stats from all APIs
      const [messagesRes, memoriesRes, filesRes] = await Promise.all([
        fetch('/api/chat/history?limit=1000', { headers }),
        fetch('/api/memories?type=all&limit=1000', { headers }),
        fetch('/api/files?limit=1000', { headers })
      ])

      const [messagesData, memoriesData, filesData] = await Promise.all([
        messagesRes.json(),
        memoriesRes.json(),
        filesRes.json()
      ])

      setStats({
        messages: messagesData.count || 0,
        memories: memoriesData.memories?.length || 0,
        files: filesData.total || 0
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
      setStats({ messages: 0, memories: 0, files: 0 })
    } finally {
      setLoading(false)
    }
  }

  return (
    <aside className="sidebar">
      {/* 用户信息栏 */}
      {user && (
        <div className="user-info-section">
          <span className="user-name">
            {user.name || user.email}
          </span>
          <button
            onClick={onLogout}
            className="btn-logout"
          >
            退出
          </button>
        </div>
      )}

      <div className="sidebar-header">
        <h1>数字分身</h1>
        <p className="subtitle">你的个人AI助理</p>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => onViewChange(item.id)}
          >
            <span className="icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="stats">
          <div className="stat-item">
            <span className="stat-label">对话记录</span>
            <span className="stat-value">{loading ? '-' : stats.messages}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">知识条目</span>
            <span className="stat-value">{loading ? '-' : stats.memories}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">文件索引</span>
            <span className="stat-value">{loading ? '-' : stats.files}</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
