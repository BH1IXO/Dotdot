/**
 * 记忆提取器 - 使用 DeepSeek 从对话中自动提取结构化记忆
 */

import { chat } from './deepseek'

export interface ExtractedMemory {
  type: 'preference' | 'fact' | 'knowledge'
  content: string
  confidence: number // 0-1 的置信度
}

/**
 * 从对话中提取结构化记忆
 * @param userMessage 用户的消息
 * @param assistantReply AI的回复
 * @param userName 用户名称
 * @returns 提取到的记忆列表
 */
export async function extractMemories(
  userMessage: string,
  assistantReply: string,
  userName: string
): Promise<ExtractedMemory[]> {
  const prompt = `你是一个记忆提取专家。请分析以下对话，提取出用户的偏好、个人事实和知识。

**用户名**: ${userName}

**对话内容**:
用户: ${userMessage}
助手: ${assistantReply}

**提取规则**:
1. **偏好 (preference)**: 用户的喜好、习惯、风格偏好
   - 例如: "我喜欢吃巧克力"、"我不喜欢早起"、"我倾向于用 TypeScript"

2. **事实 (fact)**: 关于用户的客观事实信息
   - 例如: "我住在厦门"、"我是程序员"、"我的奶奶叫李华"

3. **知识 (knowledge)**: 对话中提到的通用知识或专业信息
   - 例如: "Python 是一种编程语言"、"MemMachine 是向量数据库"

**输出格式**:
请以 JSON 数组格式输出，每个记忆包含:
- type: "preference" | "fact" | "knowledge"
- content: 记忆的具体内容（简洁的一句话）
- confidence: 0-1之间的置信度（你对这个提取结果的确定程度）

**重要**:
- 只提取明确、有价值的信息
- 如果没有可提取的记忆，返回空数组 []
- content 应该是完整、独立的陈述句
- 不要包含不确定或推测的信息
- 不要重复对话中已经很明显的临时性信息

请直接输出 JSON，不要包含其他文字。

示例输出:
[
  {"type": "preference", "content": "${userName}喜欢吃巧克力", "confidence": 0.95},
  {"type": "fact", "content": "${userName}住在厦门", "confidence": 0.9}
]`

  try {
    const response = await chat([
      {
        role: 'user',
        content: prompt
      }
    ])

    // 尝试解析 JSON 响应
    let jsonText = response.trim()

    // 移除可能的 markdown 代码块标记
    jsonText = jsonText.replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/i, '')

    const memories: ExtractedMemory[] = JSON.parse(jsonText)

    // 验证和过滤结果
    const validMemories = memories.filter(mem => {
      return (
        mem.type &&
        ['preference', 'fact', 'knowledge'].includes(mem.type) &&
        mem.content &&
        mem.content.trim().length > 0 &&
        mem.confidence >= 0.5 // 只保留置信度 >= 0.5 的记忆
      )
    })

    console.log(`✅ [MemoryExtractor] 提取了 ${validMemories.length} 条记忆`)
    return validMemories

  } catch (error: any) {
    console.error('❌ [MemoryExtractor] 提取失败:', error.message)
    // 提取失败不影响主流程，返回空数组
    return []
  }
}
