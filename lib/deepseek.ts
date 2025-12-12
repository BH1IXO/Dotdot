import OpenAI from 'openai'

// AI API 兼容 OpenAI SDK（支持 DeepSeek、通义千问、GPT 等）
const deepseek = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_BASE || 'https://api.deepseek.com/v1',
})

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * 调用 DeepSeek Chat API (流式响应)
 */
export async function streamChat(messages: ChatMessage[]) {
  const stream = await deepseek.chat.completions.create({
    model: process.env.AI_MODEL || 'deepseek-chat',
    messages: messages,
    stream: true,
    temperature: 0.1, // 极低温度，最大程度减少随机性
    max_tokens: 2000,
    frequency_penalty: 1.0, // 最大程度降低重复
    presence_penalty: 0.6, // 强烈鼓励新话题
    top_p: 0.95, // 使用核采样，提高输出质量
  })

  return stream
}

/**
 * 调用 DeepSeek Chat API (非流式)
 */
export async function chat(messages: ChatMessage[]) {
  const response = await deepseek.chat.completions.create({
    model: process.env.AI_MODEL || 'deepseek-chat',
    messages: messages,
    stream: false,
    temperature: 0.1, // 极低温度，最大程度减少随机性
    max_tokens: 2000,
    frequency_penalty: 1.0, // 最大程度降低重复
    presence_penalty: 0.6, // 强烈鼓励新话题
    top_p: 0.95, // 使用核采样，提高输出质量
  })

  return response.choices[0]?.message?.content || ''
}

export default deepseek
