'use client'

import { useState, useEffect } from 'react'

interface UserRecharge {
  id: string
  userId: string
  amount: number
  tokens: number
  status: string
  createdAt: string
  user: {
    email: string
    name?: string
  }
}

interface GuestRecharge {
  id: string
  linkId: string
  amount: number
  quota: number
  status: string
  createdAt: string
  link: {
    linkCode: string
    label?: string
    user: {
      email: string
      name?: string
    }
  }
}

export default function AdminPage() {
  const [userRecharges, setUserRecharges] = useState<UserRecharge[]>([])
  const [guestRecharges, setGuestRecharges] = useState<GuestRecharge[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'user' | 'guest'>('user')

  useEffect(() => {
    loadRecharges()
  }, [])

  const loadRecharges = async () => {
    setLoading(true)
    try {
      const [userRes, guestRes] = await Promise.all([
        fetch('/api/admin/recharges'),
        fetch('/api/admin/guest-recharges')
      ])

      const [userData, guestData] = await Promise.all([
        userRes.json(),
        guestRes.json()
      ])

      if (userData.success) {
        setUserRecharges(userData.recharges)
      }

      if (guestData.success) {
        setGuestRecharges(guestData.recharges)
      }
    } catch (error) {
      console.error('加载充值记录失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const confirmUserRecharge = async (rechargeId: string) => {
    if (!confirm('确认完成此充值？')) return

    try {
      const res = await fetch('/api/admin/recharges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rechargeId })
      })

      const data = await res.json()

      if (data.success) {
        alert('充值确认成功')
        loadRecharges()
      } else {
        alert(data.error || '确认失败')
      }
    } catch (error) {
      console.error('确认充值失败:', error)
      alert('确认失败,请重试')
    }
  }

  const confirmGuestRecharge = async (rechargeId: string) => {
    if (!confirm('确认完成此访客充值？')) return

    try {
      const res = await fetch('/api/admin/guest-recharges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rechargeId })
      })

      const data = await res.json()

      if (data.success) {
        alert('访客充值确认成功')
        loadRecharges()
      } else {
        alert(data.error || '确认失败')
      }
    } catch (error) {
      console.error('确认访客充值失败:', error)
      alert('确认失败,请重试')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-secondary)',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '700',
          marginBottom: '24px',
          color: 'var(--text-primary)'
        }}>
          充值管理后台
        </h1>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          borderBottom: '2px solid var(--border-color)'
        }}>
          <button
            onClick={() => setActiveTab('user')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'user' ? 'var(--primary-color)' : 'transparent',
              color: activeTab === 'user' ? 'white' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            用户充值 ({userRecharges.filter(r => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveTab('guest')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'guest' ? 'var(--primary-color)' : 'transparent',
              color: activeTab === 'guest' ? 'white' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            访客充值 ({guestRecharges.filter(r => r.status === 'pending').length})
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
            加载中...
          </div>
        ) : (
          <>
            {/* 用户充值列表 */}
            {activeTab === 'user' && (
              <div style={{
                background: 'var(--bg-primary)',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-md)'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)' }}>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)' }}>用户</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)' }}>金额</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)' }}>Token</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)' }}>状态</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)' }}>时间</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)' }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userRecharges.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          暂无充值记录
                        </td>
                      </tr>
                    ) : (
                      userRecharges.map((recharge) => (
                        <tr key={recharge.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '16px', fontSize: '14px' }}>
                            <div>{recharge.user.name || recharge.user.email}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{recharge.user.email}</div>
                          </td>
                          <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: 'var(--primary-color)' }}>
                            ¥{recharge.amount}
                          </td>
                          <td style={{ padding: '16px', fontSize: '14px' }}>
                            {recharge.tokens} Token
                          </td>
                          <td style={{ padding: '16px', fontSize: '14px' }}>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '500',
                              background: recharge.status === 'completed' ? '#d1fae5' : '#fef3c7',
                              color: recharge.status === 'completed' ? '#065f46' : '#92400e'
                            }}>
                              {recharge.status === 'completed' ? '已完成' : '待确认'}
                            </span>
                          </td>
                          <td style={{ padding: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                            {new Date(recharge.createdAt).toLocaleString('zh-CN')}
                          </td>
                          <td style={{ padding: '16px' }}>
                            {recharge.status === 'pending' && (
                              <button
                                onClick={() => confirmUserRecharge(recharge.id)}
                                style={{
                                  padding: '6px 16px',
                                  background: 'var(--success-color)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                  fontWeight: '500'
                                }}
                              >
                                确认
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 访客充值列表 */}
            {activeTab === 'guest' && (
              <div style={{
                background: 'var(--bg-primary)',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-md)'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)' }}>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)' }}>链接</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)' }}>所属用户</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)' }}>金额</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)' }}>问答次数</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)' }}>状态</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)' }}>时间</th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)' }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guestRecharges.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          暂无访客充值记录
                        </td>
                      </tr>
                    ) : (
                      guestRecharges.map((recharge) => (
                        <tr key={recharge.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '16px', fontSize: '14px' }}>
                            <div>{recharge.link.label || recharge.link.linkCode}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{recharge.link.linkCode}</div>
                          </td>
                          <td style={{ padding: '16px', fontSize: '14px' }}>
                            {recharge.link.user.name || recharge.link.user.email}
                          </td>
                          <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: 'var(--primary-color)' }}>
                            ¥{recharge.amount}
                          </td>
                          <td style={{ padding: '16px', fontSize: '14px' }}>
                            {recharge.quota} 次
                          </td>
                          <td style={{ padding: '16px', fontSize: '14px' }}>
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '500',
                              background: recharge.status === 'completed' ? '#d1fae5' : '#fef3c7',
                              color: recharge.status === 'completed' ? '#065f46' : '#92400e'
                            }}>
                              {recharge.status === 'completed' ? '已完成' : '待确认'}
                            </span>
                          </td>
                          <td style={{ padding: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                            {new Date(recharge.createdAt).toLocaleString('zh-CN')}
                          </td>
                          <td style={{ padding: '16px' }}>
                            {recharge.status === 'pending' && (
                              <button
                                onClick={() => confirmGuestRecharge(recharge.id)}
                                style={{
                                  padding: '6px 16px',
                                  background: 'var(--success-color)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                  fontWeight: '500'
                                }}
                              >
                                确认
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
