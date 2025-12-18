/**
 * 复制文本到剪贴板 - 兼容 HTTP 和 HTTPS
 *
 * 在 HTTPS 或 localhost 下使用现代 Clipboard API
 * 在 HTTP 下使用传统的 document.execCommand 方法
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // 尝试使用现代 Clipboard API (需要 HTTPS 或 localhost)
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (err) {
      // 如果失败，使用降级方案
      return fallbackCopyTextToClipboard(text)
    }
  }

  // 降级方案：使用传统方法 (支持 HTTP)
  return fallbackCopyTextToClipboard(text)
}

function fallbackCopyTextToClipboard(text: string): boolean {
  const textArea = document.createElement('textarea')
  textArea.value = text

  // 避免页面滚动
  textArea.style.position = 'fixed'
  textArea.style.top = '0'
  textArea.style.left = '0'
  textArea.style.width = '2em'
  textArea.style.height = '2em'
  textArea.style.padding = '0'
  textArea.style.border = 'none'
  textArea.style.outline = 'none'
  textArea.style.boxShadow = 'none'
  textArea.style.background = 'transparent'

  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()

  try {
    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)
    return successful
  } catch (err) {
    document.body.removeChild(textArea)
    return false
  }
}
