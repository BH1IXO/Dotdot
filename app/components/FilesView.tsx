'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface FileRecord {
  id: string
  filename: string
  filepath: string
  mimetype: string
  size: number
  status: string
  description?: string
  extractedText?: string
  createdAt: string
  chunks?: number
}

export default function FilesView() {
  const { token } = useAuth()
  const [files, setFiles] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>('')

  useEffect(() => {
    loadFiles()
  }, [])

  const loadFiles = async () => {
    try {
      setLoading(true)
      const headers: HeadersInit = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      const response = await fetch('/api/files?limit=100', { headers })
      if (response.ok) {
        const data = await response.json()
        setFiles(data.files || [])
      }
    } catch (error) {
      console.error('Failed to load files:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      setUploadProgress(`正在上传 ${file.name}...`)

      const formData = new FormData()
      formData.append('file', file)

      const headers: HeadersInit = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers,
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setUploadProgress(`✓ ${file.name} 上传成功`)
        setTimeout(() => {
          setUploadProgress('')
          loadFiles() // 重新加载文件列表
        }, 2000)
      } else {
        const error = await response.json()
        setUploadProgress(`✗ 上传失败: ${error.error || '未知错误'}`)
        setTimeout(() => setUploadProgress(''), 3000)
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadProgress('✗ 上传失败: 网络错误')
      setTimeout(() => setUploadProgress(''), 3000)
    } finally {
      setUploading(false)
      // 清空 input 以允许重新上传同一文件
      event.target.value = ''
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith('image/')) return '🖼️'
    if (mimetype === 'application/pdf') return '📄'
    return '📎'
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      ready: { bg: '#d1fae5', text: '#065f46', label: '已索引' },
      processing: { bg: '#fef3c7', text: '#92400e', label: '处理中' },
      error: { bg: '#fee2e2', text: '#991b1b', label: '错误' },
    }
    const style = styles[status] || styles.ready
    return (
      <span style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '500',
        background: style.bg,
        color: style.text
      }}>
        {style.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="view active" id="files-view">
        <div className="view-header">
          <h2>📁 文件库</h2>
          <div className="view-actions">
            <label style={{
              padding: '10px 20px',
              background: '#9ca3af',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ fontSize: '16px' }}>📤</span>
              上传文件
            </label>
          </div>
        </div>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p>加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="view active" id="files-view">
      <div className="view-header">
        <h2>📁 文件库</h2>
        <div className="view-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {uploadProgress && (
            <span style={{
              padding: '8px 16px',
              background: uploadProgress.includes('✓') ? '#d1fae5' : uploadProgress.includes('✗') ? '#fee2e2' : '#fef3c7',
              color: uploadProgress.includes('✓') ? '#065f46' : uploadProgress.includes('✗') ? '#991b1b' : '#92400e',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {uploadProgress}
            </span>
          )}
          <button className="btn-secondary" onClick={loadFiles} disabled={uploading}>
            🔄 刷新
          </button>
          <label style={{
            padding: '10px 20px',
            background: uploading ? '#9ca3af' : '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: uploading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ fontSize: '16px' }}>📤</span>
            {uploading ? '上传中...' : '上传文件'}
            <input
              type="file"
              accept=".pdf,image/*"
              onChange={handleFileUpload}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      <div className="view-content" style={{ display: 'flex', gap: '20px' }}>
        {/* 文件列表 */}
        <div style={{ flex: '1', minWidth: '0' }}>
          {files.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: 'var(--text-secondary)'
            }}>
              <p>还没有上传文件</p>
              <p style={{ fontSize: '14px', marginTop: '8px' }}>
                在对话框中点击 📎 按钮上传文件
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px',
              padding: '20px'
            }}>
              {files.map((file) => (
                <div
                  key={file.id}
                  onClick={() => setSelectedFile(file)}
                  style={{
                    padding: '16px',
                    background: selectedFile?.id === file.id ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                    border: selectedFile?.id === file.id ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ fontSize: '32px' }}>
                      {getFileIcon(file.mimetype)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: '500',
                        marginBottom: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {file.filename}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)'
                      }}>
                        {formatFileSize(file.size)}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    {getStatusBadge(file.status)}
                    {file.chunks !== undefined && (
                      <span style={{
                        fontSize: '12px',
                        color: file.chunks === 0 ? '#dc2626' : 'var(--text-secondary)',
                        fontWeight: file.chunks === 0 ? '500' : 'normal'
                      }}>
                        {file.chunks === 0 ? '⚠️ 未索引' : `${file.chunks} 个片段`}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 文件详情 */}
        {selectedFile && (
          <div style={{
            width: '400px',
            padding: '20px',
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            borderLeft: '1px solid var(--border-color)',
            maxHeight: 'calc(100vh - 200px)',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '16px'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>文件详情</h3>
              <button
                onClick={() => setSelectedFile(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '20px',
                  color: 'var(--text-secondary)'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  文件名
                </div>
                <a
                  href={selectedFile.filepath}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    textDecoration: 'underline',
                    color: 'inherit',
                    cursor: 'pointer',
                    wordBreak: 'break-all'
                  }}
                >
                  {selectedFile.filename}
                </a>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  类型
                </div>
                <div>{selectedFile.mimetype}</div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  大小
                </div>
                <div>{formatFileSize(selectedFile.size)}</div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  状态
                </div>
                <div>{getStatusBadge(selectedFile.status)}</div>
              </div>

              {selectedFile.description && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    描述
                  </div>
                  <div>{selectedFile.description}</div>
                </div>
              )}

              {selectedFile.chunks !== undefined && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    索引片段
                  </div>
                  <div style={{
                    color: selectedFile.chunks === 0 ? '#dc2626' : 'inherit',
                    fontWeight: selectedFile.chunks === 0 ? '500' : 'normal'
                  }}>
                    {selectedFile.chunks === 0
                      ? '⚠️ 未索引到 MemMachine（可能是处理失败）'
                      : `${selectedFile.chunks} 个文本块已索引到 MemMachine`}
                  </div>
                </div>
              )}

              {selectedFile.extractedText && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    文本预览
                  </div>
                  <div style={{
                    padding: '12px',
                    background: 'var(--bg-primary)',
                    borderRadius: '4px',
                    fontSize: '12px',
                    maxHeight: '300px',
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {selectedFile.extractedText.slice(0, 1000)}
                    {selectedFile.extractedText.length > 1000 && '...'}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '12px' }}>
                <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  上传时间
                </div>
                <div>
                  {new Date(selectedFile.createdAt).toLocaleString('zh-CN')}
                </div>
              </div>

              {selectedFile.mimetype.startsWith('image/') && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    预览
                  </div>
                  <img
                    src={selectedFile.filepath}
                    alt={selectedFile.filename}
                    style={{
                      width: '100%',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)'
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
