'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function GuestEntryPage() {
  const router = useRouter()
  const params = useParams()
  const linkCode = params.linkCode as string

  const [step, setStep] = useState<'password' | 'name'>('password')
  const [password, setPassword] = useState('')
  const [guestName, setGuestName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [linkId, setLinkId] = useState('')
  const [ownerName, setOwnerName] = useState('')

  const verifyPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/guest-links/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkCode, password })
      })

      const data = await res.json()

      if (data.success) {
        setLinkId(data.linkId)
        setOwnerName(data.ownerName)
        setStep('name')
      } else {
        setError(data.error || '验证失败')
      }
    } catch (error) {
      setError('验证失败,请重试')
    } finally {
      setLoading(false)
    }
  }

  const startChat = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/guest-chat/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkId,
          guestName,
          ipAddress: null,
          userAgent: navigator.userAgent
        })
      })

      const data = await res.json()

      if (data.success) {
        localStorage.setItem(`guest-session-${linkCode}`, data.session.id)
        router.push(`/guest/${linkCode}/chat`)
      } else {
        setError(data.error || '创建会话失败')
      }
    } catch (error) {
      setError('创建会话失败,请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-secondary)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
    }}>
      <div style={{
        background: 'var(--bg-primary)',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: 'var(--shadow-lg)',
        maxWidth: '440px',
        width: '100%',
        border: '1px solid var(--border-color)'
      }}>
        {step === 'password' ? (
          <>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              marginBottom: '8px',
              textAlign: 'center',
              background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              访客入口
            </h1>
            <p style={{
              color: 'var(--text-secondary)',
              marginBottom: '32px',
              textAlign: 'center',
              fontSize: '14px'
            }}>
              请输入密码以继续
            </p>
            <form onSubmit={verifyPassword}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--text-primary)'
                }}>
                  密码
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="请输入访问密码"
                  required
                />
              </div>
              {error && (
                <p style={{
                  color: 'var(--danger-color)',
                  fontSize: '14px',
                  marginBottom: '16px',
                  textAlign: 'center'
                }}>
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: loading ? 'var(--text-secondary)' : 'var(--primary-color)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: loading ? '0.6' : '1'
                }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.background = 'var(--primary-hover)')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.background = 'var(--primary-color)')}
              >
                {loading ? '验证中...' : '验证'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              marginBottom: '8px',
              textAlign: 'center',
              background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              欢迎与 {ownerName || '我的'} 数字分身对话
            </h1>
            <p style={{
              color: 'var(--text-secondary)',
              marginBottom: '32px',
              textAlign: 'center',
              fontSize: '14px'
            }}>
              请输入您的名字以开始对话
            </p>
            <form onSubmit={startChat}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--text-primary)'
                }}>
                  您的名字
                </label>
                <input
                  type="text"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="请输入您的名字"
                  required
                />
              </div>
              {error && (
                <p style={{
                  color: 'var(--danger-color)',
                  fontSize: '14px',
                  marginBottom: '16px',
                  textAlign: 'center'
                }}>
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: loading ? 'var(--text-secondary)' : 'var(--success-color)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: loading ? '0.6' : '1'
                }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.opacity = '1')}
              >
                {loading ? '创建会话中...' : '开始对话'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
