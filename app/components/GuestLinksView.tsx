'use client'

import { useEffect, useState } from 'react'

interface GuestLink {
  id: string
  linkCode: string
  label: string | null
  isActive: boolean
  expiresAt: string | null
  createdAt: string
  _count?: { sessions: number }
}

export default function GuestLinksView() {
  const [links, setLinks] = useState<GuestLink[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    password: '',
    label: '',
    expiresAt: '',
    maxConversations: '10',
    unlimitedConversations: false
  })

  useEffect(() => {
    fetchLinks()
  }, [])

  const fetchLinks = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch('/api/guest-links/list', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setLinks(data.guestLinks)
      }
    } catch (error) {
      console.error('获取链接失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const createLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const token = localStorage.getItem('auth_token')

      // 处理对话次数限制
      const requestData = {
        password: formData.password,
        label: formData.label,
        expiresAt: formData.expiresAt,
        maxConversations: formData.unlimitedConversations
          ? 'unlimited'
          : parseInt(formData.maxConversations) || 10
      }

      const res = await fetch('/api/guest-links/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      })
      const data = await res.json()
      if (data.success) {
        setLinks([data.guestLink, ...links])
        setShowCreateForm(false)
        setFormData({ password: '', label: '', expiresAt: '', maxConversations: '10', unlimitedConversations: false })
        alert('链接创建成功!')
      } else {
        alert(data.error || '创建失败')
      }
    } catch (error) {
      alert('创建失败')
    } finally {
      setCreating(false)
    }
  }

  const toggleLink = async (linkId: string, isActive: boolean) => {
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch('/api/guest-links/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ linkId, isActive: !isActive })
      })
      const data = await res.json()
      if (data.success) {
        setLinks(links.map(l => l.id === linkId ? data.guestLink : l))
      }
    } catch (error) {
      alert('操作失败')
    }
  }

  const deleteLink = async (linkId: string) => {
    if (!confirm('确定删除此链接?所有相关对话也会被删除!')) return
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch('/api/guest-links/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ linkId })
      })
      const data = await res.json()
      if (data.success) {
        setLinks(links.filter(l => l.id !== linkId))
      }
    } catch (error) {
      alert('删除失败')
    }
  }

  const copyLink = (linkCode: string) => {
    const url = `${window.location.origin}/guest/${linkCode}`
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => alert('链接已复制!')).catch(() => fallbackCopy(url))
    } else {
      fallbackCopy(url)
    }
  }

  const fallbackCopy = (text: string) => {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
      document.execCommand('copy')
      alert('链接已复制!')
    } catch (err) {
      alert('复制失败，请手动复制: ' + text)
    }
    document.body.removeChild(textArea)
  }

  if (loading) return <div className="p-8">加载中...</div>

  return (
    <div className="view active">
      <div className="view-header">
        <h2>访客链接管理</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn-primary"
        >
          {showCreateForm ? '取消' : '创建新链接'}
        </button>
      </div>

      <div className="view-content">
        {showCreateForm && (
          <form onSubmit={createLink} className="create-form">
            <div className="form-group">
              <label>密码 (至少4位) *</label>
              <input
                type="password"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={4}
              />
            </div>
            <div className="form-group">
              <label>备注</label>
              <input
                type="text"
                value={formData.label}
                onChange={e => setFormData({ ...formData, label: e.target.value })}
                placeholder="例如: 给张三的链接"
              />
            </div>
            <div className="form-group">
              <label>过期时间 (可选)</label>
              <input
                type="datetime-local"
                value={formData.expiresAt}
                onChange={e => setFormData({ ...formData, expiresAt: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>总对话次数限制</label>
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={formData.unlimitedConversations}
                    onChange={e => setFormData({ ...formData, unlimitedConversations: e.target.checked })}
                    style={{ width: 'auto', marginRight: '8px' }}
                  />
                  <span>无限制</span>
                </label>
              </div>
              {!formData.unlimitedConversations && (
                <input
                  type="number"
                  value={formData.maxConversations}
                  onChange={e => setFormData({ ...formData, maxConversations: e.target.value })}
                  placeholder="默认为10次"
                  min="1"
                />
              )}
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                {formData.unlimitedConversations
                  ? '访客可以无限次对话（每次对话仍会消耗您的token）'
                  : `访客最多可以进行 ${formData.maxConversations || 10} 次对话`}
              </p>
            </div>
            <button
              type="submit"
              disabled={creating}
              className="btn-primary"
            >
              {creating ? '创建中...' : '创建'}
            </button>
          </form>
        )}

        <div className="links-list">
          {links.length === 0 ? (
            <p className="empty-state">暂无链接</p>
          ) : (
            links.map(link => (
              <div key={link.id} className="link-item">
                <div className="link-info">
                  <h3>{link.label || '未命名链接'}</h3>
                  <p>链接代码: {link.linkCode}</p>
                  <p>状态: {link.isActive ? '✅ 启用' : '❌ 禁用'}</p>
                  {link.expiresAt && (
                    <p>过期: {new Date(link.expiresAt).toLocaleString()}</p>
                  )}
                  <p>会话数: {link._count?.sessions || 0}</p>
                </div>
                <div className="link-actions">
                  <button
                    onClick={() => copyLink(link.linkCode)}
                    className="btn-secondary"
                  >
                    复制链接
                  </button>
                  <button
                    onClick={() => toggleLink(link.id, link.isActive)}
                    className="btn-secondary"
                  >
                    {link.isActive ? '禁用' : '启用'}
                  </button>
                  <button
                    onClick={() => deleteLink(link.id)}
                    className="btn-danger"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        .create-form {
          background: #f9fafb;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .form-group input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }

        .links-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .link-item {
          background: white;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .link-info h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
        }

        .link-info p {
          margin: 4px 0;
          font-size: 14px;
          color: #6b7280;
        }

        .link-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }

        .btn-primary:hover {
          background: #2563eb;
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #e5e7eb;
          color: #374151;
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
        }

        .btn-secondary:hover {
          background: #d1d5db;
        }

        .btn-danger {
          background: #ef4444;
          color: white;
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
        }

        .btn-danger:hover {
          background: #dc2626;
        }

        .empty-state {
          text-align: center;
          color: #9ca3af;
          padding: 40px;
        }
      `}</style>
    </div>
  )
}
