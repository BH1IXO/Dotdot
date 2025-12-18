/**
 * MemMachine REST API Client
 *
 * This client provides methods to interact with MemMachine's memory system
 * for semantic memory search and episodic memory storage.
 */

const MEMMACHINE_BASE_URL = process.env.MEMMACHINE_API_URL || 'http://localhost:8081'
const DEFAULT_ORG_ID = 'personal-assistant'
const DEFAULT_PROJECT_ID = 'todd-assistant'

export interface MemoryMessage {
  content: string
  producer?: string
  produced_for?: string
  timestamp?: string
  role?: string
  metadata?: Record<string, string>
}

export interface AddMemoriesRequest {
  org_id?: string
  project_id?: string
  types?: ('episodic_memory' | 'semantic_memory')[]
  messages: MemoryMessage[]
}

export interface SearchMemoriesRequest {
  org_id?: string
  project_id?: string
  query: string
  top_k?: number
  filter?: string
  types?: ('episodic_memory' | 'semantic_memory')[]
}

export interface EpisodicMemoryResult {
  uid: string
  content: string
  producer: string
  produced_for: string
  timestamp: string
  role?: string
  metadata?: Record<string, any>
  similarity_score?: number
}

export interface SemanticMemoryResult {
  uid: string
  content: string
  category: string
  metadata?: Record<string, any>
  similarity_score?: number
}

export interface SearchResult {
  status: number
  content: {
    episodic_memory: {
      long_term_memory: {
        episodes: EpisodicMemoryResult[]
      }
      short_term_memory: {
        episodes: EpisodicMemoryResult[]
        episode_summary: string[]
      }
    }
    semantic_memory: SemanticMemoryResult[]
  }
}

export interface AddMemoriesResponse {
  results: Array<{ uid: string }>
}

export interface ProjectConfig {
  embedder?: string
  reranker?: string
}

export interface CreateProjectRequest {
  org_id: string
  project_id: string
  description?: string
  config?: ProjectConfig
}

export class MemMachineClient {
  private baseUrl: string
  private orgId: string
  private projectId: string

  constructor(options?: {
    baseUrl?: string
    orgId?: string
    projectId?: string
  }) {
    this.baseUrl = options?.baseUrl || MEMMACHINE_BASE_URL
    this.orgId = options?.orgId || DEFAULT_ORG_ID
    this.projectId = options?.projectId || DEFAULT_PROJECT_ID
  }

  /**
   * Initialize the project (create if not exists)
   */
  async initProject(): Promise<void> {
    console.log('🔍 [MemMachine] INIT PROJECT:', {
      url: `${this.baseUrl}/api/v2/projects/get`,
      orgId: this.orgId,
      projectId: this.projectId,
    })

    try {
      // Try to get the project first
      const response = await fetch(`${this.baseUrl}/api/v2/projects/get`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          org_id: this.orgId,
          project_id: this.projectId,
        }),
      })

      console.log('🔍 [MemMachine] GET PROJECT RESPONSE:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      })

      if (response.ok) {
        console.log('✅ [MemMachine] Project already exists')
        return
      }

      if (response.status === 404) {
        // Project doesn't exist, create it
        console.log('🔍 [MemMachine] Creating new project...')
        const createResponse = await fetch(`${this.baseUrl}/api/v2/projects`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            org_id: this.orgId,
            project_id: this.projectId,
            description: 'Todd Personal Assistant Memory System',
            config: {
              embedder: '',
              reranker: '',
            },
          } as CreateProjectRequest),
        })

        console.log('🔍 [MemMachine] CREATE PROJECT RESPONSE:', {
          status: createResponse.status,
          statusText: createResponse.statusText,
          ok: createResponse.ok,
        })

        if (!createResponse.ok) {
          const error = await createResponse.text()
          console.error('❌ [MemMachine] Failed to create project:', error)
          throw new Error(`Failed to create project: ${error}`)
        }

        console.log('✅ [MemMachine] Project created successfully')
      } else {
        const error = await response.text()
        console.error('❌ [MemMachine] Failed to get project:', { status: response.status, error })
        throw new Error(`Failed to get project: ${error}`)
      }
    } catch (error) {
      console.error('❌ [MemMachine] Init project exception:', error)
      throw error
    }
  }

  /**
   * Add memories to MemMachine
   */
  async addMemories(messages: MemoryMessage[]): Promise<AddMemoriesResponse> {
    const requestUrl = `${this.baseUrl}/api/v2/memories`
    const requestBody = {
      org_id: this.orgId,
      project_id: this.projectId,
      messages,
    } as AddMemoriesRequest

    console.log('🔍 [MemMachine] ADD REQUEST:', {
      url: requestUrl,
      orgId: this.orgId,
      projectId: this.projectId,
      messageCount: messages.length,
      firstMessage: messages[0]?.content?.substring(0, 50),
    })

    try {
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      console.log('🔍 [MemMachine] ADD RESPONSE:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('❌ [MemMachine] ADD FAILED:', {
          status: response.status,
          error: error,
          requestBody: JSON.stringify(requestBody, null, 2),
        })
        throw new Error(`Failed to add memories: ${error}`)
      }

      const result = await response.json()
      console.log('✅ [MemMachine] ADD SUCCESS:', { resultCount: result.results?.length })
      return result
    } catch (error) {
      console.error('❌ [MemMachine] ADD EXCEPTION:', error)
      throw error
    }
  }

  /**
   * Search memories using semantic similarity
   */
  async searchMemories(
    query: string,
    options?: {
      topK?: number
      filter?: string
      types?: ('episodic_memory' | 'semantic_memory')[]
    }
  ): Promise<SearchResult> {
    const requestUrl = `${this.baseUrl}/api/v2/memories/search`
    const requestBody = {
      org_id: this.orgId,
      project_id: this.projectId,
      query,
      top_k: options?.topK || 10,
      filter: options?.filter || '',
      types: options?.types || [],
    } as SearchMemoriesRequest

    console.log('🔍 [MemMachine] SEARCH REQUEST:', {
      url: requestUrl,
      orgId: this.orgId,
      projectId: this.projectId,
      query: query.substring(0, 50),
      topK: options?.topK || 10,
      types: options?.types || [],
    })

    try {
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      console.log('🔍 [MemMachine] SEARCH RESPONSE:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      })

      if (!response.ok) {
        const error = await response.text()
        console.error('❌ [MemMachine] SEARCH FAILED:', {
          status: response.status,
          error: error,
        })
        throw new Error(`Failed to search memories: ${error}`)
      }

      const result = await response.json()
      console.log('✅ [MemMachine] SEARCH SUCCESS:', {
        episodicCount: result.content?.episodic_memory?.length || 0,
        semanticCount: result.content?.semantic_memory?.length || 0,
      })
      return result
    } catch (error) {
      console.error('❌ [MemMachine] SEARCH EXCEPTION:', error)
      throw error
    }
  }

  /**
   * Add a single user message
   */
  async addUserMessage(content: string, metadata?: Record<string, string>): Promise<void> {
    await this.addMemories([
      {
        content,
        role: 'user',
        producer: 'todd',
        produced_for: 'assistant',
        metadata,
      },
    ])
  }

  /**
   * Add a single assistant message
   */
  async addAssistantMessage(content: string, metadata?: Record<string, string>): Promise<void> {
    await this.addMemories([
      {
        content,
        role: 'assistant',
        producer: 'assistant',
        produced_for: 'todd',
        metadata,
      },
    ])
  }

  /**
   * Add a single memory with custom role and producer
   */
  async addMemory(message: MemoryMessage): Promise<void> {
    await this.addMemories([message])
  }
}

// Export singleton instance for backward compatibility (uses 'default' user)
export const memmachineClient = new MemMachineClient()

/**
 * Get or create a MemMachine client for a specific user
 * Uses per-user project_id to isolate data between users
 */
export function getMemMachineClient(userId: string): MemMachineClient {
  const projectId = `todd-assistant-${userId}`
  return new MemMachineClient({
    orgId: DEFAULT_ORG_ID,
    projectId,
  })
}
