'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface FileItem {
  id: string
  filename: string
  filepath: string
  mimetype: string
  size: number
  status: string
  createdAt: string
  description?: string
  tags?: string[]
}

interface FileListResponse {
  files: FileItem[]
  total: number
  hasMore: boolean
}

export default function FileListView() {
  const { token } = useAuth()
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
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

  useEffect(() => {
    loadFiles()
  }, [])

  const loadFiles = async () => {
    try {
      setLoading(true)
      setError(null)

      const headers: HeadersInit = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/files?limit=20', { headers })

      if (!response.ok) {
        throw new Error('获取文件列表失败')
      }

      const data: FileListResponse = await response.json()
      setFiles(data.files)
      setTotal(data.total)
    } catch (err: any) {
      console.error('Load files error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'processing':
        return '⏳ 处理中'
      case 'ready':
        return '✓ 已就绪'
      case 'error':
        return '❌ 错误'
      default:
        return status
    }
  }

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith('image/')) return '🖼️'
    if (mimetype === 'application/pdf') return '📄'
    if (mimetype.startsWith('text/')) return '📝'
    return '📁'
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
        setFiles(files.filter(f => f.id !== deleteModal.fileId))
        setTotal(total - 1)
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
        <p>加载文件列表中...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        padding: '20px',
        margin: '20px',
        background: '#fee',
        border: '1px solid #fcc',
        borderRadius: '8px',
        color: '#c00'
      }}>
        ❌ {error}
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div style={{
        padding: '60px 20px',
        textAlign: 'center',
        color: '#666'
      }}>
        <p style={{ fontSize: '48px', margin: '0 0 20px' }}>📂</p>
        <p style={{ fontSize: '16px', margin: '0 0 10px' }}>还没有上传任何文件</p>
        <p style={{ fontSize: '14px', margin: 0 }}>上传文件后，它们会出现在这里</p>
      </div>
    )
  }

  return (
    <div className="file-list-container" style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minHeight: 0
    }}>
      <div className="file-list-header" style={{
        padding: '20px',
        borderBottom: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0
      }}>
        <div>
          <h3 style={{ margin: '0 0 5px', fontSize: '18px' }}>已上传文件</h3>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>共 {total} 个文件</p>
        </div>
        <button
          onClick={loadFiles}
          style={{
            padding: '8px 16px',
            background: '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          🔄 刷新
        </button>
      </div>

      <div className="file-list" style={{
        padding: '20px',
        flex: 1,
        overflowY: 'auto'
      }}>
        {files.map((file) => (
          <div
            key={file.id}
            className="file-item"
            style={{
              padding: '16px',
              marginBottom: '12px',
              background: '#fafafa',
              border: '1px solid #eee',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}
          >
            <div style={{ fontSize: '32px' }}>
              {getFileIcon(file.mimetype)}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '6px'
              }}>
                <span style={{ fontWeight: 500, fontSize: '15px' }}>
                  {file.filename}
                </span>
                <span style={{
                  fontSize: '13px',
                  padding: '2px 8px',
                  background: file.status === 'ready' ? '#d1fae5' : '#fef3c7',
                  color: file.status === 'ready' ? '#065f46' : '#92400e',
                  borderRadius: '4px'
                }}>
                  {getStatusDisplay(file.status)}
                </span>
              </div>

              <div style={{
                display: 'flex',
                gap: '16px',
                fontSize: '13px',
                color: '#666'
              }}>
                <span>📏 {formatFileSize(file.size)}</span>
                <span>🕒 {formatDate(file.createdAt)}</span>
                {file.description && (
                  <span title={file.description}>
                    📝 {file.description.length > 50
                      ? file.description.substring(0, 50) + '...'
                      : file.description
                    }
                  </span>
                )}
              </div>

              {file.tags && file.tags.length > 0 && (
                <div style={{
                  display: 'flex',
                  gap: '6px',
                  marginTop: '8px',
                  flexWrap: 'wrap'
                }}>
                  {file.tags.map((tag, index) => (
                    <span
                      key={index}
                      style={{
                        fontSize: '12px',
                        padding: '2px 8px',
                        background: '#e0e7ff',
                        color: '#3730a3',
                        borderRadius: '4px'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {file.filepath && (
                <a
                  href={file.filepath}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '8px 16px',
                    background: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    color: '#4f46e5',
                    textDecoration: 'none',
                    fontSize: '14px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  查看
                </a>
              )}
              <button
                onClick={() => handleDeleteClick(file.id, file.filename)}
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  color: '#6b7280',
                  fontSize: '12px',
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
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
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
              padding: '32px',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Progress indicator */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px', gap: '8px' }}>
              {[1, 2, 3].map(step => (
                <div key={step} style={{
                  width: '60px',
                  height: '4px',
                  background: deleteModal.step >= step ? '#6b7280' : '#e5e7eb',
                  borderRadius: '2px',
                  transition: 'background 0.3s'
                }} />
              ))}
            </div>

            {/* Step 1: Warning */}
            {deleteModal.step === 1 && (
              <>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '600' }}>
                    危险操作警告
                  </h3>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                    您即将删除重要文件
                  </p>
                </div>

                <div style={{
                  padding: '16px',
                  background: '#fef3c7',
                  border: '1px solid #fbbf24',
                  borderRadius: '8px',
                  marginBottom: '20px'
                }}>
                  <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#92400e', fontWeight: '500' }}>
                    文件名：{deleteModal.filename}
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#78350f' }}>
                    ⚠️ 删除后将无法恢复<br/>
                    ⚠️ 文件和所有相关数据都将被永久删除<br/>
                    ⚠️ MemMachine中的向量索引也会被清除
                  </p>
                </div>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  marginBottom: '20px',
                  padding: '12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  background: deleteAgreed ? '#f3f4f6' : 'white'
                }}>
                  <input
                    type="checkbox"
                    checked={deleteAgreed}
                    onChange={(e) => setDeleteAgreed(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '13px', color: '#374151' }}>
                    我理解此操作的后果，确认要删除此文件
                  </span>
                </label>
              </>
            )}

            {/* Step 2: Confirm filename */}
            {deleteModal.step === 2 && (
              <>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>✍️</div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '600' }}>
                    验证文件名
                  </h3>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                    请输入完整的文件名以确认删除
                  </p>
                </div>

                <div style={{
                  padding: '12px',
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  marginBottom: '16px'
                }}>
                  <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                    请输入：
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '14px', fontWeight: '500', color: '#111', fontFamily: 'monospace' }}>
                    {deleteModal.filename}
                  </p>
                </div>

                <input
                  type="text"
                  placeholder="在此输入文件名"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    marginBottom: '16px',
                    boxSizing: 'border-box',
                    fontFamily: 'monospace'
                  }}
                />
              </>
            )}

            {/* Step 3: Password */}
            {deleteModal.step === 3 && (
              <>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '600' }}>
                    输入删除密码
                  </h3>
                  <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
                    最后一步：验证您的身份
                  </p>
                </div>

                <input
                  type="password"
                  placeholder="请输入删除密码"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleDeleteConfirm()}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '14px',
                    marginBottom: '16px',
                    boxSizing: 'border-box'
                  }}
                />
              </>
            )}

            {deleteError && (
              <div style={{
                padding: '12px',
                background: '#fee2e2',
                border: '1px solid #fca5a5',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#991b1b',
                marginBottom: '16px'
              }}>
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancelDelete}
                style={{
                  padding: '10px 20px',
                  background: 'white',
                  border: '1px solid #d1d5db',
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
                    background: '#6b7280',
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
                  永久删除
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
