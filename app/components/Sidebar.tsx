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
  const [userTokens, setUserTokens] = useState<number>(0)
  const [showRechargeModal, setShowRechargeModal] = useState(false)

  const navItems = [
    { id: 'chat', icon: '💬', label: '对话' },
    { id: 'memory', icon: '🧠', label: '记忆库' },
    { id: 'files', icon: '📁', label: '文件管理' },
    { id: 'knowledge', icon: '📚', label: '知识库' },
    { id: 'guest-links', icon: '🔗', label: '访客链接' },
    { id: 'guest-chats', icon: '👥', label: '访客对话' },
    { id: 'settings', icon: '⚙️', label: '设置' },
  ]

  useEffect(() => {
    loadStats()

    // 每30秒刷新一次统计信息和Token余额
    const interval = setInterval(() => {
      loadStats()
    }, 30000)

    return () => clearInterval(interval)
  }, [token])

  const loadStats = async () => {
    if (!token) {
      setStats({ messages: 0, memories: 0, files: 0 })
      setUserTokens(0)
      setLoading(false)
      return
    }

    try {
      const headers: HeadersInit = {
        'Authorization': `Bearer ${token}`
      }

      // Fetch stats from all APIs
      const [messagesRes, memoriesRes, filesRes, userRes] = await Promise.all([
        fetch('/api/chat/history?limit=1000', { headers }),
        fetch('/api/memories?type=all&limit=1000', { headers }),
        fetch('/api/files?limit=1000', { headers }),
        fetch('/api/auth/me', { headers })
      ])

      const [messagesData, memoriesData, filesData, userData] = await Promise.all([
        messagesRes.json(),
        memoriesRes.json(),
        filesRes.json(),
        userRes.json()
      ])

      setStats({
        messages: messagesData.count || 0,
        memories: memoriesData.memories?.length || 0,
        files: filesData.total || 0
      })

      if (userData.success && userData.user) {
        setUserTokens(userData.user.tokens || 0)
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
      setStats({ messages: 0, memories: 0, files: 0 })
      setUserTokens(0)
    } finally {
      setLoading(false)
    }
  }

  return (
    <aside className="sidebar">
      {/* 用户信息栏 */}
      {user && (
        <div className="user-info-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
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
          {/* Token显示和充值按钮 */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{
              padding: '10px 12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              textAlign: 'center'
            }}>
              🪙 Token: {loading ? '-' : userTokens.toLocaleString()}
            </div>
            <button
              onClick={() => setShowRechargeModal(true)}
              style={{
                padding: '8px 12px',
                background: 'rgba(102, 126, 234, 0.1)',
                border: '1px solid rgba(102, 126, 234, 0.3)',
                borderRadius: '6px',
                color: 'var(--primary-color)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(102, 126, 234, 0.2)'
                e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.5)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)'
                e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.3)'
              }}
            >
              💳 充值
            </button>
          </div>
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
              Token充值
            </h3>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '200px',
                height: '200px',
                margin: '0 auto',
                background: '#f3f4f6',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                color: '#6b7280',
                border: '2px dashed #d1d5db'
              }}>
                微信/支付宝收款码
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
                <div>10元 = 10000 Token</div>
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
                background: '#667eea',
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
    </aside>
  )
}
