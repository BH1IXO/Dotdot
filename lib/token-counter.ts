/**
 * 估算文本的token数量
 *
 * 估算规则：
 * - 中文字符：约2个token
 * - 英文单词：约1.3个token
 * - 数字和符号：约1个token
 */
export function estimateTokens(text: string): number {
  if (!text) return 0

  // 统计中文字符数量（包括中文标点）
  const chineseChars = text.match(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/g) || []

  // 统计英文单词数量（连续的字母和数字）
  const englishWords = text.match(/[a-zA-Z0-9]+/g) || []

  // 统计其他字符（符号、空格等）
  const otherChars = text.replace(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/g, '')
                          .replace(/[a-zA-Z0-9]+/g, '')
                          .replace(/\s/g, '')

  // 计算总token数
  const chineseTokens = chineseChars.length * 2
  const englishTokens = Math.ceil(englishWords.length * 1.3)
  const otherTokens = otherChars.length

  return chineseTokens + englishTokens + otherTokens
}

/**
 * 估算对话消息的总token数量
 */
export function estimateMessageTokens(messages: { role: string; content: string }[]): number {
  let total = 0

  for (const message of messages) {
    // 每条消息的开销（role + formatting）约4个token
    total += 4
    total += estimateTokens(message.content)
  }

  // 整个对话的额外开销约3个token
  total += 3

  return total
}
