'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ChatView from './components/ChatView'
import MemoryView from './components/MemoryView'
import Sidebar from './components/Sidebar'
import FileUpload from './components/FileUpload'
import FileListView from './components/FileListView'
import KnowledgeBaseView from './components/KnowledgeBaseView'
import FilesViewComponent from './components/FilesView'
import { useAuth } from './contexts/AuthContext'

export default function Home() {
  const router = useRouter()
  const [activeView, setActiveView] = useState('chat')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, logout, isLoading } = useAuth()

  // 路由保护:未登录跳转到登录页
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  // 移动端菜单切换处理
  const handleViewChange = (view: string) => {
    setActiveView(view)
    setMobileMenuOpen(false) // 选择后自动关闭移动菜单
  }

  // 点击遮罩层关闭菜单
  const handleOverlayClick = () => {
    setMobileMenuOpen(false)
  }

  // 加载中显示
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>加载中...</p>
      </div>
    )
  }

  // 未登录不显示内容(会被重定向)
  if (!user) {
    return null
  }

  return (
    <div className="container">
      {/* 移动端汉堡菜单按钮 */}
      <button
        className="mobile-menu-toggle"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="切换菜单"
      >
        ☰
      </button>

      {/* 移动端遮罩层 */}
      <div
        className={`sidebar-overlay ${mobileMenuOpen ? 'active' : ''}`}
        onClick={handleOverlayClick}
      />

      {/* 侧边栏 */}
      <div className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <Sidebar
          activeView={activeView}
          onViewChange={handleViewChange}
          user={user}
          onLogout={logout}
        />
      </div>

      <main className="main-content">
        {/* Views */}
        <div style={{ display: activeView === 'chat' ? 'contents' : 'none' }}>
          <ChatView />
        </div>
        <div style={{ display: activeView === 'memory' ? 'contents' : 'none' }}>
          <MemoryView />
        </div>
        <div style={{ display: activeView === 'files' ? 'contents' : 'none' }}>
          <FilesViewComponent />
        </div>
        <div style={{ display: activeView === 'knowledge' ? 'contents' : 'none' }}>
          <KnowledgeView />
        </div>
        <div style={{ display: activeView === 'settings' ? 'contents' : 'none' }}>
          <SettingsView />
        </div>
      </main>

      <style jsx>{`
        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          gap: 16px;
        }

        .loading-container p {
          font-size: 16px;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  )
}

// 其他视图组件 (暂时简化)

function FilesView() {
  return (
    <div className="view active" id="files-view">
      <div className="view-header">
        <h2>文件管理</h2>
      </div>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <FileUpload />
        <FileListView />
      </div>
    </div>
  )
}

function KnowledgeView() {
  return (
    <div className="view active" id="knowledge-view">
      <div className="view-header">
        <h2>知识库</h2>
      </div>
      <KnowledgeBaseView />
    </div>
  )
}

function SettingsView() {
  const { token } = useAuth()
  const [hasPassword, setHasPassword] = useState(false)
  const [showSetModal, setShowSetModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [message, setMessage] = useState('')

  // 设置密码相关状态
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // 重置密码相关状态
  const [oldPassword, setOldPassword] = useState('')
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [resetConfirmPassword, setResetConfirmPassword] = useState('')

  // 检查是否已设置密码
  useEffect(() => {
    const headers: HeadersInit = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    fetch('/api/settings?key=delete_password', { headers })
      .then(res => res.json())
      .then(data => setHasPassword(data.exists))
      .catch(err => console.error('Check password error:', err))
  }, [token])

  // 打开设置密码弹窗
  const handleOpenSetModal = () => {
    setShowSetModal(true)
    setNewPassword('')
    setConfirmPassword('')
    setMessage('')
  }

  // 关闭设置密码弹窗
  const handleCloseSetModal = () => {
    setShowSetModal(false)
    setNewPassword('')
    setConfirmPassword('')
    setMessage('')
  }

  // 打开重置密码弹窗
  const handleOpenResetModal = () => {
    setShowResetModal(true)
    setOldPassword('')
    setResetNewPassword('')
    setResetConfirmPassword('')
    setMessage('')
  }

  // 关闭重置密码弹窗
  const handleCloseResetModal = () => {
    setShowResetModal(false)
    setOldPassword('')
    setResetNewPassword('')
    setResetConfirmPassword('')
    setMessage('')
  }

  // 设置密码
  const handleSetPassword = async () => {
    if (!newPassword) {
      setMessage('请输入新密码')
      return
    }

    if (newPassword.length < 4) {
      setMessage('密码长度至少为4位')
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage('两次输入的密码不一致')
      return
    }

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          key: 'delete_password',
          password: newPassword
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('密码设置成功！')
        setHasPassword(true)
        setTimeout(() => {
          handleCloseSetModal()
        }, 1500)
      } else {
        setMessage(data.error || '设置失败')
      }
    } catch (error) {
      console.error('Set password error:', error)
      setMessage('设置失败，请重试')
    }
  }

  // 重置密码
  const handleResetPassword = async () => {
    if (!oldPassword) {
      setMessage('请输入原密码')
      return
    }

    if (!resetNewPassword) {
      setMessage('请输入新密码')
      return
    }

    if (resetNewPassword.length < 4) {
      setMessage('新密码长度至少为4位')
      return
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setMessage('两次输入的新密码不一致')
      return
    }

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      // 先验证原密码
      const verifyResponse = await fetch('/api/settings/verify', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          key: 'delete_password',
          password: oldPassword
        })
      })

      const verifyData = await verifyResponse.json()

      if (!verifyResponse.ok || !verifyData.valid) {
        setMessage('原密码错误')
        return
      }

      // 原密码正确，设置新密码
      const updateResponse = await fetch('/api/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          key: 'delete_password',
          password: resetNewPassword
        })
      })

      const updateData = await updateResponse.json()

      if (updateResponse.ok) {
        setMessage('密码重置成功！')
        setTimeout(() => {
          handleCloseResetModal()
        }, 1500)
      } else {
        setMessage(updateData.error || '重置失败')
      }
    } catch (error) {
      console.error('Reset password error:', error)
      setMessage('重置失败，请重试')
    }
  }

  return (
    <div className="view active" id="settings-view">
      <div className="view-header">
        <h2>设置</h2>
      </div>
      <div className="settings-container">
        <div className="settings-section">
          <h3>安全设置</h3>
          <div className="setting-item">
            <label>删除密码</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* 密码状态显示 */}
              <div style={{
                padding: '16px',
                background: hasPassword ? '#f0fdf4' : '#fef3c7',
                border: `1px solid ${hasPassword ? '#86efac' : '#fcd34d'}`,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: hasPassword ? '#166534' : '#92400e',
                    marginBottom: '4px'
                  }}>
                    {hasPassword ? '✓ 已设置删除密码' : '⚠️ 未设置删除密码'}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: hasPassword ? '#15803d' : '#a16207'
                  }}>
                    {hasPassword ? '删除文件时需要输入密码验证' : '请先设置删除密码以保护数据安全'}
                  </div>
                </div>
                <button
                  onClick={hasPassword ? handleOpenResetModal : handleOpenSetModal}
                  style={{
                    padding: '8px 16px',
                    background: hasPassword ? '#3b82f6' : '#4f46e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {hasPassword ? '重置密码' : '设置密码'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 设置密码弹窗 */}
        {showSetModal && (
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
            onClick={handleCloseSetModal}
          >
            <div
              style={{
                background: 'white',
                padding: '28px',
                borderRadius: '12px',
                maxWidth: '420px',
                width: '90%',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 20px', fontSize: '18px', color: '#1f2937' }}>
                设置删除密码
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="password"
                  placeholder="输入新密码（至少4位）"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value)
                    setMessage('')
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
                <input
                  type="password"
                  placeholder="确认新密码"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    setMessage('')
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleSetPassword()}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
                {message && (
                  <div style={{
                    padding: '10px 12px',
                    background: message.includes('成功') ? '#d1fae5' : '#fee',
                    border: `1px solid ${message.includes('成功') ? '#10b981' : '#fcc'}`,
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: message.includes('成功') ? '#065f46' : '#c00'
                  }}>
                    {message}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button
                    onClick={handleCloseSetModal}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: '#f3f4f6',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#374151',
                      fontWeight: '500'
                    }}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSetPassword}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: '#4f46e5',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    确认设置
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 重置密码弹窗 */}
        {showResetModal && (
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
            onClick={handleCloseResetModal}
          >
            <div
              style={{
                background: 'white',
                padding: '28px',
                borderRadius: '12px',
                maxWidth: '420px',
                width: '90%',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 20px', fontSize: '18px', color: '#1f2937' }}>
                重置删除密码
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="password"
                  placeholder="输入原密码"
                  value={oldPassword}
                  onChange={(e) => {
                    setOldPassword(e.target.value)
                    setMessage('')
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{
                  height: '1px',
                  background: '#e5e7eb',
                  margin: '4px 0'
                }} />
                <input
                  type="password"
                  placeholder="输入新密码（至少4位）"
                  value={resetNewPassword}
                  onChange={(e) => {
                    setResetNewPassword(e.target.value)
                    setMessage('')
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
                <input
                  type="password"
                  placeholder="确认新密码"
                  value={resetConfirmPassword}
                  onChange={(e) => {
                    setResetConfirmPassword(e.target.value)
                    setMessage('')
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleResetPassword()}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
                {message && (
                  <div style={{
                    padding: '10px 12px',
                    background: message.includes('成功') ? '#d1fae5' : '#fee',
                    border: `1px solid ${message.includes('成功') ? '#10b981' : '#fcc'}`,
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: message.includes('成功') ? '#065f46' : '#c00'
                  }}>
                    {message}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button
                    onClick={handleCloseResetModal}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: '#f3f4f6',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#374151',
                      fontWeight: '500'
                    }}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleResetPassword}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    确认重置
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="settings-section">
          <h3>AI 设置</h3>
          <div className="setting-item">
            <label>对话模型</label>
            <input type="text" value="DeepSeek V3" className="setting-input" disabled />
          </div>
          <div className="setting-item">
            <label>温度参数</label>
            <input type="number" value="0.7" className="setting-input" disabled />
          </div>
        </div>
        <div className="settings-section">
          <h3>数据库</h3>
          <div className="setting-item">
            <label>主存储</label>
            <input type="text" value="SQLite (本地)" className="setting-input" disabled />
          </div>
          <div className="setting-item">
            <label>记忆系统</label>
            <input type="text" value="🧠 MemMachine (语义搜索)" className="setting-input" disabled />
          </div>
          <div className="setting-item">
            <label>MemMachine 地址</label>
            <input type="text" value="http://localhost:8081" className="setting-input" disabled />
          </div>
        </div>
      </div>
    </div>
  )
}
