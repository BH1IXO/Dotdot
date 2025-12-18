'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface GuestLink {
  id: string
  linkCode: string
  label: string | null
  isActive: boolean
  expiresAt: string | null
  createdAt: string
  _count?: { sessions: number }
}

export default function GuestLinksPage() {
  const router = useRouter()
  const [links, setLinks] = useState<GuestLink[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    password: '',
    label: '',
    expiresAt: ''
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
      const res = await fetch('/api/guest-links/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (data.success) {
        setLinks([data.guestLink, ...links])
        setShowCreateForm(false)
        setFormData({ password: '', label: '', expiresAt: '' })
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
    navigator.clipboard.writeText(url)
    alert('链接已复制!')
  }

  if (loading) return <div className="p-8">加载中...</div>

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">访客链接管理</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {showCreateForm ? '取消' : '创建新链接'}
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={createLink} className="mb-6 p-4 border rounded bg-gray-50">
          <div className="mb-4">
            <label className="block mb-2">密码 (至少4位) *</label>
            <input
              type="password"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              required
              minLength={4}
            />
          </div>
          <div className="mb-4">
            <label className="block mb-2">备注</label>
            <input
              type="text"
              value={formData.label}
              onChange={e => setFormData({ ...formData, label: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              placeholder="例如: 给张三的链接"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-2">过期时间 (可选)</label>
            <input
              type="datetime-local"
              value={formData.expiresAt}
              onChange={e => setFormData({ ...formData, expiresAt: e.target.value })}
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {creating ? '创建中...' : '创建'}
          </button>
        </form>
      )}

      <div className="space-y-4">
        {links.length === 0 ? (
          <p className="text-gray-500">暂无链接</p>
        ) : (
          links.map(link => (
            <div key={link.id} className="p-4 border rounded bg-white shadow">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-lg">
                    {link.label || '未命名链接'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    链接代码: {link.linkCode}
                  </p>
                  <p className="text-sm text-gray-600">
                    状态: {link.isActive ? '✅ 启用' : '❌ 禁用'}
                  </p>
                  {link.expiresAt && (
                    <p className="text-sm text-gray-600">
                      过期: {new Date(link.expiresAt).toLocaleString()}
                    </p>
                  )}
                  <p className="text-sm text-gray-600">
                    会话数: {link._count?.sessions || 0}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyLink(link.linkCode)}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  >
                    复制链接
                  </button>
                  <button
                    onClick={() => toggleLink(link.id, link.isActive)}
                    className={`px-3 py-1 rounded text-sm ${
                      link.isActive
                        ? 'bg-yellow-500 hover:bg-yellow-600'
                        : 'bg-green-500 hover:bg-green-600'
                    } text-white`}
                  >
                    {link.isActive ? '禁用' : '启用'}
                  </button>
                  <button
                    onClick={() => deleteLink(link.id)}
                    className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
