'use client'

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAuth } from '../contexts/AuthContext'

interface Memory {
  id: string
  content: string
  type: 'conversation' | 'preference' | 'knowledge' | 'fact'
  timestamp: Date
  relevance?: number
  role?: string | null
  metadata?: Record<string, any>
}

export default function MemoryView() {
  const { token } = useAuth()
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    conversation: 0,
    knowledge: 0,
    preference: 0,
    fact: 0,
  })
  const [refreshing, setRefreshing] = useState(false)

  // Load memories on mount
  useEffect(() => {
    loadMemories()
  }, [filterType])

  const loadMemories = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    setLoading(true)
    try {
      const headers: HeadersInit = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(
        `/api/memories?type=${filterType}&query=${searchQuery}&limit=50`,
        { headers }
      )
      const data = await response.json()
      if (data.success) {
        setMemories(data.memories || [])
        if (data.stats) {
          setStats(data.stats)
        }
      }
    } catch (error) {
      console.error('Failed to load memories:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleSearch = () => {
    loadMemories()
  }

  // 清理内容中的 HTML 标签
  const cleanContent = (content: string) => {
    return content.replace(/<[^>]*>/g, '')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条记忆吗？')) return

    try {
      const headers: HeadersInit = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`/api/memories?id=${id}`, {
        method: 'DELETE',
        headers
      })
      const data = await response.json()
      if (data.success) {
        setMemories(memories.filter((m) => m.id !== id))
        setStats({
          ...stats,
          total: stats.total - 1
        })
      }
    } catch (error) {
      console.error('Failed to delete memory:', error)
      alert('删除失败，请重试')
    }
  }

  const handleAddMemory = async (content: string, type: string) => {
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/memories', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content,
          type,
        }),
      })
      const data = await response.json()
      if (data.success) {
        setMemories([data.memory, ...memories])
        setShowAddModal(false)
        loadMemories() // 重新加载以更新统计
      }
    } catch (error) {
      console.error('Failed to add memory:', error)
      alert('添加失败，请重试')
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'conversation':
        return '💬'
      case 'preference':
        return '⭐'
      case 'knowledge':
        return '📚'
      case 'fact':
        return '📌'
      default:
        return '📝'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'conversation':
        return '对话'
      case 'preference':
        return '偏好'
      case 'knowledge':
        return '知识'
      case 'fact':
        return '事实'
      default:
        return '未知'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'conversation':
        return '#3b82f6' // blue
      case 'preference':
        return '#f59e0b' // amber
      case 'knowledge':
        return '#8b5cf6' // purple
      case 'fact':
        return '#10b981' // green
      default:
        return '#6b7280' // gray
    }
  }

  const formatDate = (timestamp: Date | string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatRelativeTime = (timestamp: Date | string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return '今天'
    if (days === 1) return '昨天'
    if (days < 7) return `${days}天前`
    if (days < 30) return `${Math.floor(days / 7)}周前`
    if (days < 365) return `${Math.floor(days / 30)}个月前`
    return `${Math.floor(days / 365)}年前`
  }

  return (
    <div className="view active" id="memory-view" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '24px 32px',
        borderBottom: '1px solid #e5e7eb',
        background: 'white'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <h2 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              🧠 记忆库
            </h2>
            <button
              onClick={() => loadMemories(true)}
              disabled={loading || refreshing}
              style={{
                padding: '8px 12px',
                background: refreshing ? '#f3f4f6' : 'transparent',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: (loading || refreshing) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: '#6b7280',
                transition: 'all 0.2s'
              }}
            >
              {refreshing ? '⏳' : '🔄'} 刷新
            </button>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '10px 20px',
              background: '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{ fontSize: '16px' }}>+</span>
            添加记忆
          </button>
        </div>

        {/* Search Bar */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <input
            type="search"
            placeholder="搜索记忆内容..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            style={{
              flex: 1,
              padding: '10px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              padding: '10px 24px',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              color: '#374151'
            }}
          >
            搜索
          </button>
        </div>

        {/* Filter Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto'
        }}>
          {[
            { key: 'all', label: '全部', icon: '📋' },
            { key: 'conversation', label: '对话', icon: '💬' },
            { key: 'knowledge', label: '知识', icon: '📚' },
            { key: 'preference', label: '偏好', icon: '⭐' },
            { key: 'fact', label: '事实', icon: '📌' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterType(tab.key)}
              style={{
                padding: '8px 16px',
                background: filterType === tab.key ? '#ede9fe' : 'white',
                border: `1px solid ${filterType === tab.key ? '#8b5cf6' : '#e5e7eb'}`,
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                color: filterType === tab.key ? '#7c3aed' : '#6b7280',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {tab.key !== 'all' && stats[tab.key as keyof typeof stats] > 0 && (
                <span style={{
                  background: filterType === tab.key ? '#7c3aed' : '#e5e7eb',
                  color: filterType === tab.key ? 'white' : '#6b7280',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>
                  {stats[tab.key as keyof typeof stats]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        padding: '20px 32px',
        background: '#f9fafb',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}>
          {[
            { label: '总记忆数', value: stats.total, icon: '📊', color: '#6366f1' },
            { label: '对话记忆', value: stats.conversation, icon: '💬', color: '#3b82f6' },
            { label: '知识记忆', value: stats.knowledge, icon: '📚', color: '#8b5cf6' },
            { label: '偏好记忆', value: stats.preference, icon: '⭐', color: '#f59e0b' },
            { label: '事实记忆', value: stats.fact, icon: '📌', color: '#10b981' }
          ].map((stat) => (
            <div key={stat.label} style={{
              background: 'white',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: `${stat.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                {stat.icon}
              </div>
              <div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#1f2937'
                }}>
                  {stat.value}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginTop: '2px'
                }}>
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Memory List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px 32px'
      }}>
        {loading ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '400px',
            gap: '16px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '4px solid #f3f4f6',
              borderTop: '4px solid #4f46e5',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ color: '#6b7280', fontSize: '14px' }}>加载记忆中...</p>
          </div>
        ) : memories.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '400px',
            gap: '16px'
          }}>
            <div style={{ fontSize: '64px' }}>🧠</div>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#1f2937' }}>
              暂无记忆
            </h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280', textAlign: 'center', maxWidth: '400px' }}>
              {searchQuery
                ? '未找到匹配的记忆，试试其他搜索词'
                : '开始对话或手动添加记忆，构建你的个人知识库'}
            </p>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {memories.map((memory) => (
              <div key={memory.id} style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '16px 20px',
                transition: 'all 0.2s',
                cursor: 'default'
              }}>
                {/* Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    background: `${getTypeColor(memory.type)}15`,
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: getTypeColor(memory.type)
                  }}>
                    <span>{getTypeIcon(memory.type)}</span>
                    {getTypeLabel(memory.type)}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <span style={{
                      fontSize: '12px',
                      color: '#9ca3af'
                    }} title={formatDate(memory.timestamp)}>
                      {formatRelativeTime(memory.timestamp)}
                    </span>
                    <button
                      onClick={() => handleDelete(memory.id)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb',
                        background: 'white',
                        color: '#9ca3af',
                        fontSize: '18px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#fee'
                        e.currentTarget.style.borderColor = '#fca5a5'
                        e.currentTarget.style.color = '#dc2626'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white'
                        e.currentTarget.style.borderColor = '#e5e7eb'
                        e.currentTarget.style.color = '#9ca3af'
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div style={{
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: '#374151'
                }}>
                  {memory.role && (
                    <div style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      marginBottom: '8px',
                      marginRight: '8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      background: memory.role === 'user' ? '#dbeafe' : '#f3e8ff',
                      color: memory.role === 'user' ? '#1e40af' : '#6b21a8'
                    }}>
                      {memory.role === 'user' ? '👤 用户' : '🤖 AI'}
                    </div>
                  )}
                  <div className="markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {cleanContent(memory.content)}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* Metadata */}
                {memory.metadata && memory.metadata.response && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#6b7280',
                    borderLeft: '3px solid #e5e7eb'
                  }}>
                    <strong style={{ color: '#4b5563', display: 'block', marginBottom: '8px' }}>AI回复：</strong>
                    <div className="markdown-content" style={{ fontSize: '13px' }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {cleanContent(memory.metadata.response.slice(0, 300) + (memory.metadata.response.length > 300 ? '...' : ''))}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Memory Modal */}
      {showAddModal && (
        <AddMemoryModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddMemory}
        />
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

interface AddMemoryModalProps {
  onClose: () => void
  onAdd: (content: string, type: string) => void
}

function AddMemoryModal({ onClose, onAdd }: AddMemoryModalProps) {
  const [content, setContent] = useState('')
  const [type, setType] = useState('fact')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) {
      alert('请输入记忆内容')
      return
    }
    onAdd(content, type)
    setContent('')
  }

  return (
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
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          padding: '28px',
          borderRadius: '16px',
          maxWidth: '520px',
          width: '90%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            添加新记忆
          </h3>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: 'none',
              background: '#f3f4f6',
              color: '#6b7280',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              记忆类型
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#1f2937',
                background: 'white',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="fact">📌 事实 (客观信息)</option>
              <option value="preference">⭐ 偏好 (个人喜好)</option>
              <option value="knowledge">📚 知识 (学习内容)</option>
              <option value="conversation">💬 对话 (交流记录)</option>
            </select>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              记忆内容
            </label>
            <textarea
              rows={5}
              placeholder="输入要记住的内容..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#1f2937',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                lineHeight: '1.5'
              }}
            />
          </div>

          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                color: '#374151'
              }}
            >
              取消
            </button>
            <button
              type="submit"
              style={{
                padding: '10px 24px',
                background: '#4f46e5',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              添加记忆
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
