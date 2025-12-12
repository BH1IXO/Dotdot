/**
 * MemMachine 客户端封装
 * 用于与 MemMachine 记忆系统交互
 */

export interface MemMachineConfig {
  baseURL: string
  mock?: boolean // 开发模式下使用 mock 数据
}

export interface Memory {
  id: string
  content: string
  type: 'conversation' | 'preference' | 'knowledge' | 'fact'
  timestamp: Date
  relevance?: number
  metadata?: Record<string, any>
}

export interface SessionInfo {
  group_id: string
  agent_id: string[]
  user_id: string[]
  session_id: string
}

export interface AddMemoryParams {
  userId: string
  content: string
  type?: 'conversation' | 'preference' | 'knowledge' | 'fact'
  metadata?: Record<string, any>
  response?: string
}

export interface SearchMemoriesParams {
  userId: string
  query: string
  limit?: number
  type?: string
}

export class MemMachineClient {
  private baseURL: string
  private mock: boolean

  constructor(config: MemMachineConfig) {
    this.baseURL = config.baseURL
    this.mock = config.mock || false
  }

  /**
   * 添加新记忆
   */
  async addMemory(params: AddMemoryParams): Promise<Memory> {
    if (this.mock) {
      return this.mockAddMemory(params)
    }

    try {
      const session: SessionInfo = {
        group_id: 'default-group',
        agent_id: ['personal-assistant'],
        user_id: [params.userId],
        session_id: `session-${Date.now()}`,
      }

      const response = await fetch(`${this.baseURL}/v1/memories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session,
          producer: params.userId,
          produced_for: params.userId,
          episode_content: params.content,
          episode_type: 'text',
          metadata: {
            ...params.metadata,
            type: params.type || 'conversation',
            response: params.response,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`MemMachine API error: ${response.statusText}`)
      }

      const data = await response.json()
      return this.mapToMemory(data)
    } catch (error) {
      console.error('MemMachine addMemory error:', error)
      // 降级到 mock
      return this.mockAddMemory(params)
    }
  }

  /**
   * 搜索相关记忆
   */
  async searchMemories(params: SearchMemoriesParams): Promise<Memory[]> {
    if (this.mock) {
      return this.mockSearchMemories(params)
    }

    try {
      const session: SessionInfo = {
        group_id: 'default-group',
        agent_id: ['personal-assistant'],
        user_id: [params.userId],
        session_id: `search-${Date.now()}`,
      }

      const response = await fetch(`${this.baseURL}/v1/memories/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session,
          query: params.query,
          limit: params.limit || 5,
        }),
      })

      if (!response.ok) {
        throw new Error(`MemMachine API error: ${response.statusText}`)
      }

      const data = await response.json()
      return data.memories?.map((m: any) => this.mapToMemory(m)) || []
    } catch (error) {
      console.error('MemMachine searchMemories error:', error)
      // 降级到 mock
      return this.mockSearchMemories(params)
    }
  }

  /**
   * 获取用户画像
   */
  async getUserProfile(userId: string): Promise<Record<string, any>> {
    if (this.mock) {
      return this.mockGetUserProfile(userId)
    }

    try {
      const response = await fetch(`${this.baseURL}/v1/profiles/${userId}`)

      if (!response.ok) {
        throw new Error(`MemMachine API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('MemMachine getUserProfile error:', error)
      return this.mockGetUserProfile(userId)
    }
  }

  /**
   * 删除记忆
   */
  async deleteMemory(memoryId: string): Promise<void> {
    if (this.mock) {
      console.log('Mock: deleteMemory', memoryId)
      return
    }

    try {
      await fetch(`${this.baseURL}/v1/memories/${memoryId}`, {
        method: 'DELETE',
      })
    } catch (error) {
      console.error('MemMachine deleteMemory error:', error)
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    if (this.mock) {
      return true
    }

    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5秒超时
      })
      return response.ok
    } catch (error) {
      console.error('MemMachine health check failed:', error)
      return false
    }
  }

  // ==================== Mock 方法 ====================

  private mockAddMemory(params: AddMemoryParams): Memory {
    return {
      id: `mock-${Date.now()}`,
      content: params.content,
      type: params.type || 'conversation',
      timestamp: new Date(),
      metadata: params.metadata,
    }
  }

  private mockSearchMemories(params: SearchMemoriesParams): Memory[] {
    // 模拟返回一些相关记忆
    const mockMemories: Memory[] = [
      {
        id: 'mock-1',
        content: '你喜欢在晚上10点后工作，这时候效率最高',
        type: 'preference',
        timestamp: new Date(Date.now() - 86400000 * 3), // 3天前
        relevance: 0.85,
      },
      {
        id: 'mock-2',
        content: '上次提到照片通常保存在 E:\\Photos 目录',
        type: 'fact',
        timestamp: new Date(Date.now() - 86400000 * 7), // 7天前
        relevance: 0.72,
      },
      {
        id: 'mock-3',
        content: '讨论了关于 AI 发展的看法，认为 AGI 可能在2025年实现',
        type: 'conversation',
        timestamp: new Date(Date.now() - 86400000), // 1天前
        relevance: 0.68,
      },
    ]

    // 简单的关键词匹配模拟
    const query = params.query.toLowerCase()
    return mockMemories
      .filter((m) => m.content.toLowerCase().includes(query))
      .slice(0, params.limit || 5)
  }

  private mockGetUserProfile(userId: string): Record<string, any> {
    return {
      userId,
      preferences: {
        workTime: '晚上10点后',
        photoLocation: 'E:\\Photos',
      },
      interests: ['AI', '技术', '编程'],
      lastActive: new Date().toISOString(),
    }
  }

  private mapToMemory(data: any): Memory {
    return {
      id: data.id || data.episode_id || `mem-${Date.now()}`,
      content: data.content || data.episode_content || '',
      type: data.metadata?.type || data.episode_type || 'conversation',
      timestamp: new Date(data.timestamp || data.created_at || Date.now()),
      relevance: data.relevance || data.score,
      metadata: data.metadata,
    }
  }
}

// 单例实例 - 默认使用 mock 模式
export const memClient = new MemMachineClient({
  baseURL: process.env.MEMMACHINE_URL || 'http://localhost:8080',
  mock: process.env.NODE_ENV === 'development', // 开发模式默认使用 mock
})
