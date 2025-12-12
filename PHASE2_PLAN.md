# 📋 Phase 2 实施计划 - MemMachine 记忆系统集成

## 🎯 目标

将 MemMachine 开源记忆层集成到个人AI助理中，实现：
- 智能记忆检索（基于语义搜索）
- 自动记忆分类（对话/知识/偏好）
- 长期记忆存储
- 个性化上下文增强

---

## 📊 当前状态 (Phase 1)

✅ **已完成：**
- DeepSeek V3 对话功能
- SQLite 简单存储
- 基础 UI 界面
- Docker 部署支持

❌ **局限性：**
- 无语义搜索（只能按时间顺序）
- 无智能记忆提取
- 无长期知识管理
- 无个性化推荐

---

## 🚀 Phase 2 升级方案

### **架构对比**

```
Phase 1 (当前)                    Phase 2 (MemMachine)
─────────────────────────────────────────────────────────
用户输入                          用户输入
   ↓                                ↓
DeepSeek V3                      MemMachine 检索记忆
   ↓                                ↓
保存到 SQLite                   构建增强上下文
                                    ↓
                                 DeepSeek V3
                                    ↓
                                 MemMachine 保存
                                    ↓
                                 自动分类存储
```

### **技术栈升级**

| 组件 | Phase 1 | Phase 2 |
|------|---------|---------|
| **对话存储** | SQLite | MemMachine Episodic Memory |
| **知识库** | ❌ 无 | MemMachine Persistent Memory |
| **用户画像** | ❌ 无 | MemMachine Profile Memory |
| **搜索方式** | SQL 查询 | 语义向量搜索 |
| **数据库** | SQLite | Neo4j + PostgreSQL |

---

## 📅 实施步骤

### **第一周：环境准备与测试**

#### **任务 1.1：部署 MemMachine 服务**
```bash
# 1. 克隆 MemMachine
cd E:\Personal_Todd
git clone https://github.com/MemMachine/MemMachine.git

# 2. 启动测试环境
cd MemMachine
docker-compose up -d

# 3. 验证服务
curl http://localhost:8000/health
```

**验收标准：**
- ✅ Neo4j 运行在 7474 端口
- ✅ PostgreSQL 运行在 5432 端口
- ✅ MemMachine API 运行在 8000 端口

#### **任务 1.2：阅读文档和 API**
- [ ] 阅读 MemMachine 官方文档
- [ ] 了解 Python SDK 用法
- [ ] 测试基本 API 调用
- [ ] 理解记忆分类逻辑

**资源：**
- 官方文档: https://docs.memmachine.ai
- GitHub: https://github.com/MemMachine/MemMachine
- Discord: https://discord.gg/usydANvKqD

#### **任务 1.3：简单集成测试**
创建测试脚本验证 MemMachine 功能：

```python
# test_memmachine.py
from memmachine import Client

client = Client(base_url="http://localhost:8000")

# 测试 1: 添加记忆
client.add_memory(
    user_id="test_user",
    content="我喜欢在晚上10点后工作",
    type="preference"
)

# 测试 2: 搜索记忆
results = client.search(
    user_id="test_user",
    query="工作习惯",
    limit=5
)
print(results)

# 测试 3: 获取用户画像
profile = client.get_profile(user_id="test_user")
print(profile)
```

---

### **第二周：集成到 Next.js 项目**

#### **任务 2.1：更新 Docker Compose**

修改 `docker-compose.yml`：

```yaml
services:
  app:
    # ... 现有配置
    depends_on:
      - memmachine
    environment:
      - MEMMACHINE_URL=http://memmachine:8000

  memmachine:
    image: memmachine/memmachine:latest
    ports:
      - "8000:8000"
    depends_on:
      - neo4j
      - postgres
    environment:
      - GRAPH_DB_URL=bolt://neo4j:7687
      - SQL_DB_URL=postgresql://postgres:mempass@postgres:5432/memmachine
    networks:
      - app-network

  neo4j:
    image: neo4j:5-community
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      - NEO4J_AUTH=neo4j/mempassword
      - NEO4J_PLUGINS=["apoc"]
    volumes:
      - neo4j_data:/data
    networks:
      - app-network

  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=mempass
      - POSTGRES_DB=memmachine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network

volumes:
  neo4j_data:
  postgres_data:
```

#### **任务 2.2：创建 MemMachine 客户端封装**

新建 `lib/memmachine.ts`：

```typescript
interface MemMachineConfig {
  baseURL: string
}

interface Memory {
  id: string
  content: string
  type: 'conversation' | 'preference' | 'knowledge'
  timestamp: Date
  relevance?: number
}

export class MemMachineClient {
  private baseURL: string

  constructor(config: MemMachineConfig) {
    this.baseURL = config.baseURL
  }

  async addMemory(params: {
    userId: string
    content: string
    type?: string
    metadata?: Record<string, any>
  }): Promise<Memory> {
    const response = await fetch(`${this.baseURL}/memories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    return response.json()
  }

  async searchMemories(params: {
    userId: string
    query: string
    limit?: number
    type?: string
  }): Promise<Memory[]> {
    const queryParams = new URLSearchParams({
      user_id: params.userId,
      query: params.query,
      limit: String(params.limit || 5),
      ...(params.type && { type: params.type }),
    })

    const response = await fetch(
      `${this.baseURL}/memories/search?${queryParams}`
    )
    return response.json()
  }

  async getUserProfile(userId: string): Promise<any> {
    const response = await fetch(`${this.baseURL}/profiles/${userId}`)
    return response.json()
  }

  async deleteMemory(memoryId: string): Promise<void> {
    await fetch(`${this.baseURL}/memories/${memoryId}`, {
      method: 'DELETE',
    })
  }
}

// 单例实例
export const memClient = new MemMachineClient({
  baseURL: process.env.MEMMACHINE_URL || 'http://localhost:8000',
})
```

#### **任务 2.3：升级对话 API**

修改 `app/api/chat/route.ts`：

```typescript
import { memClient } from '@/lib/memmachine'

export async function POST(req: NextRequest) {
  const { message, userId = 'default' } = await req.json()

  // 1. 从 MemMachine 检索相关记忆
  const relevantMemories = await memClient.searchMemories({
    userId,
    query: message,
    limit: 5,
  })

  // 2. 获取用户画像
  const userProfile = await memClient.getUserProfile(userId)

  // 3. 构建增强的上下文
  const systemPrompt = `你是用户的数字分身AI助理。

相关记忆：
${relevantMemories.map(m => `- ${m.content} (相关度: ${m.relevance})`).join('\n')}

用户画像：
${Object.entries(userProfile).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

请基于以上信息提供个性化回答。`

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: message },
  ]

  // 4. 调用 DeepSeek
  const stream = await streamChat(messages)

  // 5. 收集完整响应
  let fullResponse = ''
  const encoder = new TextEncoder()

  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || ''
          if (content) {
            fullResponse += content
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
          }
        }

        // 6. 保存对话到 MemMachine
        await memClient.addMemory({
          userId,
          content: message,
          type: 'conversation',
          metadata: {
            response: fullResponse,
            timestamp: new Date().toISOString(),
          },
        })

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

#### **任务 2.4：数据迁移脚本**

创建 `scripts/migrate-to-memmachine.ts`：

```typescript
import { prisma } from '@/lib/prisma'
import { memClient } from '@/lib/memmachine'

async function migrate() {
  console.log('开始迁移数据到 MemMachine...')

  const messages = await prisma.message.findMany({
    orderBy: { createdAt: 'asc' },
  })

  let count = 0
  for (const msg of messages) {
    await memClient.addMemory({
      userId: 'default',
      content: msg.content,
      type: msg.role === 'user' ? 'conversation' : 'response',
      metadata: {
        originalId: msg.id,
        createdAt: msg.createdAt.toISOString(),
      },
    })
    count++
    if (count % 10 === 0) {
      console.log(`已迁移 ${count}/${messages.length} 条消息`)
    }
  }

  console.log(`✅ 迁移完成！共 ${count} 条记录`)
}

migrate()
  .catch(console.error)
  .finally(() => process.exit())
```

---

### **第三周：UI 更新与测试**

#### **任务 3.1：记忆库界面实现**

更新 `app/page.tsx` 中的 `MemoryView` 组件：

```typescript
'use client'

import { useEffect, useState } from 'react'

function MemoryView() {
  const [memories, setMemories] = useState([])
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetch(`/api/memories?type=${filter}`)
      .then(res => res.json())
      .then(data => setMemories(data.memories))
  }, [filter])

  return (
    <div className="view active">
      <div className="view-header">
        <h2>记忆库</h2>
        <div className="filter-tabs">
          <button onClick={() => setFilter('all')}>全部</button>
          <button onClick={() => setFilter('conversation')}>对话</button>
          <button onClick={() => setFilter('preference')}>偏好</button>
          <button onClick={() => setFilter('knowledge')}>知识</button>
        </div>
      </div>
      <div className="memory-grid">
        {memories.map((mem: any) => (
          <div key={mem.id} className="memory-card">
            <div className="memory-header">
              <span className="memory-type">{mem.type}</span>
              <span className="memory-date">
                {new Date(mem.timestamp).toLocaleDateString()}
              </span>
            </div>
            <div className="memory-content">{mem.content}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

#### **任务 3.2：新增记忆管理 API**

创建 `app/api/memories/route.ts`：

```typescript
import { NextRequest } from 'next/server'
import { memClient } from '@/lib/memmachine'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'all'
  const userId = 'default' // Phase 4 会改为真实用户 ID

  const memories = await memClient.searchMemories({
    userId,
    query: '',
    limit: 50,
    type: type === 'all' ? undefined : type,
  })

  return Response.json({ memories })
}

export async function DELETE(req: NextRequest) {
  const { memoryId } = await req.json()
  await memClient.deleteMemory(memoryId)
  return Response.json({ success: true })
}
```

#### **任务 3.3：集成测试**

创建测试清单：
- [ ] 对话时能否检索到相关记忆
- [ ] 新对话是否保存到 MemMachine
- [ ] 记忆库界面是否正常显示
- [ ] 分类过滤是否工作
- [ ] 删除记忆功能是否正常

---

### **第四周：优化与文档**

#### **任务 4.1：性能优化**
- [ ] 记忆检索缓存（Redis）
- [ ] 分页加载（避免一次加载太多）
- [ ] 懒加载记忆库

#### **任务 4.2：更新文档**
- [ ] 更新 README.md（添加 MemMachine 说明）
- [ ] 更新 DEPLOY.md（包含 Neo4j + PostgreSQL）
- [ ] 创建 MEMMACHINE_GUIDE.md（使用指南）

#### **任务 4.3：Docker 镜像优化**
```dockerfile
# 多阶段构建优化
FROM node:20-alpine AS builder
# ... 构建步骤

FROM node:20-alpine AS runner
# 复制 MemMachine 配置
COPY --from=builder /app/memmachine.config.json ./
```

---

## 📊 预期效果对比

### **Phase 1 (当前)**
```
用户: "我去年过年的照片在哪？"
AI: "抱歉，我没有找到相关信息。"
```

### **Phase 2 (MemMachine)**
```
用户: "我去年过年的照片在哪？"

MemMachine 检索到：
1. 用户曾提到：照片在 E:\Photos\2024\春节
2. 用户偏好：喜欢全家福照片
3. 上次搜索：用了 "春节" 关键词

AI: "根据我的记忆，你的春节照片通常在 E:\Photos\2024\春节 目录下。
     上次你找的全家福照片也在那里。需要我帮你找具体的文件吗？"
```

---

## 💰 成本影响

### **Phase 1 成本**
- Vercel: 免费
- DeepSeek API: ¥2-5/月
- **总计: ¥2-5/月**

### **Phase 2 成本（新增）**

**开发环境（本地）：**
- Docker Desktop: 免费
- Neo4j Community: 免费
- PostgreSQL: 免费
- **总计: ¥0**

**生产环境（VPS）：**
- VPS (2核4G): ¥68/年
- 或 Railway/Render: ¥10-20/月
- DeepSeek API: ¥2-5/月
- **总计: ¥8-25/月**

**生产环境（托管）：**
- Neo4j Aura (免费层): 免费
- Supabase PostgreSQL: 免费
- Vercel: 免费
- **总计: ¥2-5/月（仅 AI API）**

---

## 🔧 技术难点与解决方案

### **难点 1：MemMachine API 不稳定**
**解决：** 添加错误处理和降级方案
```typescript
try {
  const memories = await memClient.search(...)
} catch (error) {
  console.error('MemMachine 错误，使用 SQLite 备份', error)
  // 降级到 Phase 1 的 SQLite 查询
}
```

### **难点 2：Neo4j 资源占用**
**解决：**
- 开发环境：限制 Docker 内存 (512MB)
- 生产环境：使用托管服务（Neo4j Aura）

### **难点 3：数据一致性**
**解决：** 双写策略
```typescript
// 同时写入 SQLite 和 MemMachine
await Promise.all([
  prisma.message.create(...),
  memClient.addMemory(...)
])
```

---

## ✅ 验收标准

Phase 2 完成需满足：

- [ ] MemMachine 服务正常运行
- [ ] 对话能检索到历史相关记忆
- [ ] 记忆自动分类（对话/偏好/知识）
- [ ] 记忆库界面显示正常
- [ ] 搜索功能工作正常
- [ ] Docker 一键部署
- [ ] 文档更新完整
- [ ] 性能可接受（<3秒响应）

---

## 📚 参考资源

- [MemMachine GitHub](https://github.com/MemMachine/MemMachine)
- [MemMachine 官网](https://memmachine.ai)
- [Neo4j 文档](https://neo4j.com/docs/)
- [Prisma + PostgreSQL](https://www.prisma.io/docs/concepts/database-connectors/postgresql)

---

## 🎯 下一步

1. **本周行动：** 克隆 MemMachine，本地测试
2. **问题咨询：** 加入 Discord 社区
3. **代码准备：** 创建 `phase2` 分支

**开始时间：** 待定
**预计完成：** 4 周后
**状态：** 📋 计划中
