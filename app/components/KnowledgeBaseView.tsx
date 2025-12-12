'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface FileKnowledge {
  id: string
  filename: string
  description: string
  tags: string[]
  createdAt: string
  chunks: number
}

export default function KnowledgeBaseView() {
  const { token } = useAuth()
  const [files, setFiles] = useState<FileKnowledge[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [totalChunks, setTotalChunks] = useState(0)
  const [expandedCard, setExpandedCard] = useState<'docs' | 'tags' | 'chunks' | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; fileId: string; filename: string; step: number }>({
    show: false,
    fileId: '',
    filename: '',
    step: 1
  })
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleteAgreed, setDeleteAgreed] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadKnowledge()
  }, [])

  const loadKnowledge = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true)
      setLoading(true)

      const headers: HeadersInit = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      // 获取所有已就绪的文件
      const response = await fetch('/api/files?limit=100', { headers })

      if (!response.ok) {
        throw new Error('获取知识库失败')
      }

      const data = await response.json()

      // 只显示已处理完成的文件
      const knowledgeFiles = data.files
        .filter((f: any) => f.status === 'ready')
        .map((f: any) => ({
          id: f.id,
          filename: f.filename,
          description: f.description || '无描述',
          tags: f.tags || [],
          createdAt: f.createdAt,
          chunks: f.chunks || 0
        }))

      setFiles(knowledgeFiles)
      setTotalChunks(data.totalChunks || 0)
    } catch (err: any) {
      console.error('Load knowledge error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const filteredFiles = files.filter(file =>
    file.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  const handleDeleteClick = (fileId: string, filename: string) => {
    setDeleteModal({ show: true, fileId, filename, step: 1 })
    setDeletePassword('')
    setDeleteConfirmText('')
    setDeleteError('')
    setDeleteAgreed(false)
  }

  const handleNextStep = () => {
    if (deleteModal.step === 1 && !deleteAgreed) {
      setDeleteError('请勾选确认框')
      return
    }
    if (deleteModal.step === 2 && deleteConfirmText !== deleteModal.filename) {
      setDeleteError('文件名输入不正确')
      return
    }
    setDeleteError('')
    setDeleteModal({ ...deleteModal, step: deleteModal.step + 1 })
  }

  const handleDeleteConfirm = async () => {
    if (!deletePassword) {
      setDeleteError('请输入密码')
      return
    }

    try {
      const headers: HeadersInit = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`/api/files?id=${deleteModal.fileId}&password=${encodeURIComponent(deletePassword)}`, {
        method: 'DELETE',
        headers
      })

      const data = await response.json()

      if (response.ok) {
        await loadKnowledge()
        setDeleteModal({ show: false, fileId: '', filename: '', step: 1 })
        setDeletePassword('')
        setDeleteConfirmText('')
        setDeleteAgreed(false)
      } else {
        setDeleteError(data.error || '删除失败')
      }
    } catch (error) {
      console.error('Delete file error:', error)
      setDeleteError('删除失败，请重试')
    }
  }

  const handleCancelDelete = () => {
    setDeleteModal({ show: false, fileId: '', filename: '', step: 1 })
    setDeletePassword('')
    setDeleteConfirmText('')
    setDeleteError('')
    setDeleteAgreed(false)
  }

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div className="spinner" style={{
          border: '3px solid #f3f3f3',
          borderTop: '3px solid #4f46e5',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }}></div>
        <p>加载知识库中...</p>
      </div>
    )
  }

  return (
    <div className="knowledge-container" style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0
    }}>
      <div style={{
        padding: '20px',
        flex: 1,
        overflowY: 'auto'
      }}>
        {/* 搜索框 */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <input
          type="search"
          placeholder="搜索知识..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            padding: '12px 16px',
            fontSize: '14px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            outline: 'none'
          }}
        />
        <button
          onClick={() => loadKnowledge(true)}
          disabled={loading || refreshing}
          style={{
            padding: '12px 20px',
            background: refreshing ? '#f3f4f6' : 'transparent',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: (loading || refreshing) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#6b7280',
            fontWeight: '500',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s'
          }}
        >
          {refreshing ? '⏳' : '🔄'} 刷新
        </button>
      </div>

      {/* 统计信息 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px',
        marginBottom: '30px'
      }}>
        {/* 文档总数卡片 */}
        <div
          onClick={() => setExpandedCard(expandedCard === 'docs' ? null : 'docs')}
          style={{
            padding: '20px',
            background: '#f0f9ff',
            border: expandedCard === 'docs' ? '2px solid #0369a1' : '1px solid #bae6fd',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            transform: expandedCard === 'docs' ? 'scale(1.02)' : 'scale(1)'
          }}
        >
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0369a1', marginBottom: '4px' }}>
            {files.length}
          </div>
          <div style={{ fontSize: '14px', color: '#0c4a6e', marginBottom: '8px' }}>
            文档总数 {expandedCard === 'docs' ? '▼' : '▶'}
          </div>
          <div style={{ fontSize: '12px', color: '#0284c7' }}>
            已索引：{files.length} 个PDF文档
          </div>

          {expandedCard === 'docs' && files.length > 0 && (
            <div style={{
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid #bae6fd',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0369a1', marginBottom: '8px' }}>
                文档列表：
              </div>
              {files.map((file, index) => (
                <div key={file.id} style={{
                  fontSize: '12px',
                  color: '#0c4a6e',
                  padding: '4px 0',
                  borderBottom: index < files.length - 1 ? '1px solid #e0f2fe' : 'none'
                }}>
                  {index + 1}. {file.filename} ({file.chunks} chunks)
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 标签卡片 */}
        <div
          onClick={() => setExpandedCard(expandedCard === 'tags' ? null : 'tags')}
          style={{
            padding: '20px',
            background: '#f0fdf4',
            border: expandedCard === 'tags' ? '2px solid #15803d' : '1px solid #bbf7d0',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            transform: expandedCard === 'tags' ? 'scale(1.02)' : 'scale(1)'
          }}
        >
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#15803d', marginBottom: '4px' }}>
            {(() => {
              const allTags = files.flatMap(f => f.tags || [])
              const uniqueTags = new Set(allTags)
              return uniqueTags.size
            })()}
          </div>
          <div style={{ fontSize: '14px', color: '#14532d', marginBottom: '8px' }}>
            不同标签数 {expandedCard === 'tags' ? '▼' : '▶'}
          </div>
          <div style={{ fontSize: '12px', color: '#16a34a' }}>
            总标签：{files.reduce((sum, f) => sum + (f.tags?.length || 0), 0)} 个
          </div>

          {expandedCard === 'tags' && (() => {
            const allTags = files.flatMap(f => f.tags || [])
            const tagCounts = allTags.reduce((acc, tag) => {
              acc[tag] = (acc[tag] || 0) + 1
              return acc
            }, {} as Record<string, number>)
            const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])

            return sortedTags.length > 0 ? (
              <div style={{
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid #bbf7d0',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#15803d', marginBottom: '8px' }}>
                  标签使用频率：
                </div>
                {sortedTags.map(([tag, count]) => (
                  <div key={tag} style={{
                    fontSize: '12px',
                    color: '#14532d',
                    padding: '4px 0',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span>#{tag}</span>
                    <span style={{ fontWeight: 'bold' }}>×{count}</span>
                  </div>
                ))}
              </div>
            ) : null
          })()}
        </div>

        {/* 向量索引卡片 */}
        <div
          onClick={() => setExpandedCard(expandedCard === 'chunks' ? null : 'chunks')}
          style={{
            padding: '20px',
            background: '#fefce8',
            border: expandedCard === 'chunks' ? '2px solid #a16207' : '1px solid #fef08a',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            transform: expandedCard === 'chunks' ? 'scale(1.02)' : 'scale(1)'
          }}
        >
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#a16207', marginBottom: '4px' }}>
            {totalChunks}
          </div>
          <div style={{ fontSize: '14px', color: '#713f12', marginBottom: '8px' }}>
            向量索引数 {expandedCard === 'chunks' ? '▼' : '▶'}
          </div>
          <div style={{ fontSize: '12px', color: '#ca8a04' }}>
            MemMachine 智能搜索
          </div>

          {expandedCard === 'chunks' && files.length > 0 && (
            <div style={{
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid #fef08a',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#a16207', marginBottom: '8px' }}>
                每个文档的索引：
              </div>
              {files.map((file) => (
                <div key={file.id} style={{
                  fontSize: '12px',
                  color: '#713f12',
                  padding: '4px 0',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.filename}
                  </span>
                  <span style={{ fontWeight: 'bold', marginLeft: '8px' }}>{file.chunks} 块</span>
                </div>
              ))}
              <div style={{
                marginTop: '12px',
                paddingTop: '8px',
                borderTop: '1px solid #fef08a',
                fontSize: '11px',
                color: '#ca8a04'
              }}>
                💡 文档被切分成小块便于精确搜索
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 知识列表 */}
      {filteredFiles.length === 0 ? (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center',
          color: '#666'
        }}>
          <p style={{ fontSize: '48px', margin: '0 0 20px' }}>📚</p>
          <p style={{ fontSize: '16px', margin: '0 0 10px' }}>
            {searchQuery ? '未找到匹配的知识' : '知识库为空'}
          </p>
          <p style={{ fontSize: '14px', margin: 0 }}>
            {searchQuery ? '尝试其他搜索词' : '上传文件后会自动索引到知识库'}
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gap: '16px'
        }}>
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              style={{
                padding: '20px',
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'start',
                justifyContent: 'space-between',
                marginBottom: '12px'
              }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    margin: '0 0 8px',
                    fontSize: '16px',
                    fontWeight: 500,
                    color: '#111'
                  }}>
                    📄 {file.filename}
                  </h3>
                  <p style={{
                    margin: 0,
                    fontSize: '14px',
                    color: '#666',
                    lineHeight: '1.5'
                  }}>
                    {file.description}
                  </p>
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: '8px'
                }}>
                  <div style={{
                    fontSize: '12px',
                    color: '#999',
                    whiteSpace: 'nowrap'
                  }}>
                    {formatDate(file.createdAt)}
                  </div>
                  <button
                    onClick={() => handleDeleteClick(file.id, file.filename)}
                    style={{
                      padding: '4px 10px',
                      background: 'transparent',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      color: '#6b7280',
                      fontSize: '11px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#9ca3af'
                      e.currentTarget.style.color = '#4b5563'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#d1d5db'
                      e.currentTarget.style.color = '#6b7280'
                    }}
                  >
                    移除
                  </button>
                </div>
              </div>

              {file.tags.length > 0 && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px'
                }}>
                  {file.tags.map((tag, index) => (
                    <span
                      key={index}
                      style={{
                        fontSize: '12px',
                        padding: '4px 10px',
                        background: '#e0e7ff',
                        color: '#3730a3',
                        borderRadius: '4px'
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </div>

      {/* Three-Step Delete Confirmation Modal */}
      {deleteModal.show && (
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
          onClick={handleCancelDelete}
        >
          <div
            style={{
              background: 'white',
              padding: '28px',
              borderRadius: '12px',
              maxWidth: '440px',
              width: '90%',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress Indicator */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '24px',
              alignItems: 'center'
            }}>
              {[1, 2, 3].map(step => (
                <div
                  key={step}
                  style={{
                    flex: 1,
                    height: '4px',
                    background: step <= deleteModal.step ? '#4f46e5' : '#e5e7eb',
                    borderRadius: '2px',
                    transition: 'background 0.3s'
                  }}
                />
              ))}
            </div>

            {/* Step 1: Warning */}
            {deleteModal.step === 1 && (
              <div>
                <h3 style={{
                  margin: '0 0 16px',
                  fontSize: '18px',
                  color: '#1f2937',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>⚠️</span> 删除确认
                </h3>
                <div style={{
                  background: '#fef3c7',
                  border: '1px solid #f59e0b',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '20px'
                }}>
                  <p style={{ margin: '0 0 12px', fontSize: '14px', color: '#92400e', lineHeight: '1.6' }}>
                    您即将删除文件：<br />
                    <strong style={{ fontSize: '15px' }}>{deleteModal.filename}</strong>
                  </p>
                  <p style={{ margin: '0', fontSize: '13px', color: '#92400e', lineHeight: '1.5' }}>
                    • 此操作将永久删除文件及其所有数据<br />
                    • 已索引的向量数据将从知识库中移除<br />
                    • 此操作不可撤销
                  </p>
                </div>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  padding: '12px',
                  background: '#f9fafb',
                  borderRadius: '6px',
                  marginBottom: '20px'
                }}>
                  <input
                    type="checkbox"
                    checked={deleteAgreed}
                    onChange={(e) => {
                      setDeleteAgreed(e.target.checked)
                      setDeleteError('')
                    }}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '14px', color: '#374151' }}>
                    我理解此操作的后果，并确认要删除此文件
                  </span>
                </label>
                {deleteError && (
                  <div style={{
                    padding: '10px 12px',
                    background: '#fee',
                    border: '1px solid #fcc',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#c00',
                    marginBottom: '16px'
                  }}>
                    {deleteError}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Filename Verification */}
            {deleteModal.step === 2 && (
              <div>
                <h3 style={{
                  margin: '0 0 16px',
                  fontSize: '18px',
                  color: '#1f2937',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>✍️</span> 验证文件名
                </h3>
                <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#6b7280', lineHeight: '1.6' }}>
                  为了确认这是正确的文件，请输入完整的文件名：
                </p>
                <div style={{
                  background: '#f3f4f6',
                  padding: '12px',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  border: '1px solid #e5e7eb'
                }}>
                  <code style={{ fontSize: '14px', color: '#1f2937', wordBreak: 'break-all' }}>
                    {deleteModal.filename}
                  </code>
                </div>
                <input
                  type="text"
                  placeholder="请输入文件名"
                  value={deleteConfirmText}
                  onChange={(e) => {
                    setDeleteConfirmText(e.target.value)
                    setDeleteError('')
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    marginBottom: '12px',
                    boxSizing: 'border-box',
                    fontFamily: 'monospace'
                  }}
                />
                {deleteError && (
                  <div style={{
                    padding: '10px 12px',
                    background: '#fee',
                    border: '1px solid #fcc',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#c00',
                    marginBottom: '16px'
                  }}>
                    {deleteError}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Password */}
            {deleteModal.step === 3 && (
              <div>
                <h3 style={{
                  margin: '0 0 16px',
                  fontSize: '18px',
                  color: '#1f2937',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>🔐</span> 密码验证
                </h3>
                <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#6b7280', lineHeight: '1.6' }}>
                  最后一步，请输入删除密码以完成操作：
                </p>
                <input
                  type="password"
                  placeholder="请输入删除密码"
                  value={deletePassword}
                  onChange={(e) => {
                    setDeletePassword(e.target.value)
                    setDeleteError('')
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleDeleteConfirm()}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    marginBottom: '12px',
                    boxSizing: 'border-box'
                  }}
                />
                {deleteError && (
                  <div style={{
                    padding: '10px 12px',
                    background: '#fee',
                    border: '1px solid #fcc',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#c00',
                    marginBottom: '16px'
                  }}>
                    {deleteError}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                onClick={handleCancelDelete}
                style={{
                  padding: '10px 20px',
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
              {deleteModal.step < 3 ? (
                <button
                  onClick={handleNextStep}
                  style={{
                    padding: '10px 20px',
                    background: '#4f46e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  下一步
                </button>
              ) : (
                <button
                  onClick={handleDeleteConfirm}
                  style={{
                    padding: '10px 20px',
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  确认删除
                </button>
              )}
            </div>
          </div>
        </div>
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
