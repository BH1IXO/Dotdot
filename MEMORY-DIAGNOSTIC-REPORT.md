# 记忆系统诊断报告

## 测试日期
2025-12-18

## 测试结果总结

### ✅ 本地测试通过
在本地测试中，记忆系统**工作正常**：

1. **用户消息保存** ✅
   - 消息成功保存到Prisma数据库
   - 消息成功保存到MemMachine

2. **记忆检索** ✅
   - AI成功检索到用户偏好
   - AI回复中包含："根据我们的记忆，你之前提到过**喜欢吃臭鳜鱼**"

3. **MemMachine连接** ✅
   - 本地MemMachine服务正常运行（http://localhost:8081）
   - 项目自动初始化功能正常

## 发现的潜在问题

### 问题1：去重逻辑可能过于激进

**位置**: `app/api/chat/route.ts` 第120-136行

**代码**:
```typescript
const shouldDeduplicate = history.length >= 5
if (shouldDeduplicate) {
  const recentContents = new Set(
    history.slice(-10).map((msg: any) => msg.content.trim())
  )
  filteredEpisodes = allEpisodes.filter(mem => {
    const memContent = mem.content || ''
    return !recentContents.has(memContent.trim())
  })
}
```

**问题分析**:
- 当对话历史 >= 5条消息时，系统会过滤掉最近10条对话中出现过的记忆
- 如果用户在一次对话中说了"我喜欢吃臭鳜鱼"，然后在**同一次对话**中询问，这条记忆会被去重逻辑过滤掉
- **这可能就是用户遇到的问题！**

**场景复现**:
```
用户: 我喜欢吃臭鳜鱼
AI: 哈哈，看来你对这道徽州名菜情有独钟呢！
用户: 那我们聊聊天气吧...（几条消息）
用户: 我喜欢吃什么？  ← 此时 history.length >= 5
AI: (系统去重过滤掉了"我喜欢吃臭鳜鱼"这条记忆) 我不太清楚...
```

### 问题2：访客对话topK过低

**位置**: `app/api/guest-chat/send-message/route.ts` 第72行

**代码**:
```typescript
const searchResult = await userMemClient.searchMemories(message, {
  topK: 5,  // 只检索5条记忆！
  types: [],
})
```

**问题分析**:
- 主用户对话使用 `topK: 50`
- 访客对话只使用 `topK: 5`
- 如果主用户有很多记忆，访客可能检索不到相关内容

## 建议的修复方案

### 修复1：改进去重逻辑

**方案A：提高去重阈值**
```typescript
// 从 5 条改为 10 条，减少误过滤
const shouldDeduplicate = history.length >= 10
```

**方案B：使用语义相似度而非精确匹配**
```typescript
// 只过滤完全相同的消息，而非内容相同的记忆
filteredEpisodes = allEpisodes.filter(mem => {
  const memContent = mem.content || ''
  // 只过滤完全一样的（包括标点符号）
  return !recentContents.has(memContent.trim())
})
```

**方案C（推荐）：区分用户消息和记忆**
```typescript
// 只过滤用户的原始消息，不过滤从记忆中提取的内容
const recentUserMessages = new Set(
  history
    .filter((msg: any) => msg.role === 'user')
    .slice(-5)
    .map((msg: any) => msg.content.trim())
)
filteredEpisodes = allEpisodes.filter(mem => {
  const memContent = mem.content || ''
  return !recentUserMessages.has(memContent.trim())
})
```

### 修复2：增加访客topK

```typescript
const searchResult = await userMemClient.searchMemories(message, {
  topK: 20,  // 从 5 增加到 20
  types: [],
})
```

## 测试建议

### 测试场景1：同一对话中询问
1. 开启新对话
2. 说："我喜欢吃臭鳜鱼"
3. 继续对话5-10轮
4. 询问："我喜欢吃什么？"
5. 检查AI是否记得

### 测试场景2：新对话中询问
1. 开启新对话
2. 说："我喜欢吃臭鳜鱼"
3. **关闭并开启新对话**（清空 history）
4. 询问："我喜欢吃什么？"
5. 检查AI是否记得

### 测试场景3：访客链接
1. 主用户说："我喜欢吃臭鳜鱼"
2. 等待记忆提取（约5秒）
3. 通过访客链接访问
4. 访客询问："主人喜欢吃什么？"
5. 检查是否能检索到

## 下一步行动

1. ✅ 已完成：本地测试确认记忆系统基本功能正常
2. 待完成：实现方案C（区分用户消息和记忆）
3. 待完成：增加访客topK到20
4. 待完成：在本地测试修复后的代码
5. 待完成：部署到远程服务器
6. 待完成：让用户重新测试

## 结论

**主要发现**:
- 记忆系统的存储和检索功能本身是正常的
- 问题很可能是**去重逻辑在同一对话中过滤掉了相关记忆**
- 访客对话的topK太低可能导致检索不全

**建议**:
- 优先修复去重逻辑（方案C）
- 增加访客topK
- 本地测试后再部署到服务器
