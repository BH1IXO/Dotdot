# AI 服务提供商配置指南

你的应用支持多种 AI 服务，包括 DeepSeek、通义千问、智谱AI、OpenAI GPT 等。

## 📋 环境变量说明

配置非常简单，只需要在 `.env` 文件中设置 3 个变量：

```bash
OPENAI_API_KEY=你的API密钥
OPENAI_API_BASE=API基础URL
AI_MODEL=模型名称
```

## 🎯 支持的 AI 服务

### 方案一：DeepSeek（推荐，性价比高 ⭐）

**特点**：
- ✅ 价格便宜（¥1/百万tokens）
- ✅ 性能接近 GPT-4
- ✅ 支持嵌入模型（可用于 MemMachine）
- ⚠️ 可能在部分国内服务器被限制

**主应用配置**：
```bash
OPENAI_API_KEY=sk-你的DeepSeek密钥
OPENAI_API_BASE=https://api.deepseek.com/v1
AI_MODEL=deepseek-chat
```

**MemMachine 配置**（`MemMachine/configuration.yml`）：
```yaml
resources:
  embedders:
    openai_embedder:
      provider: openai
      config:
        model: "text-embedding-3-small"
        api_key: sk-你的DeepSeek密钥
        base_url: "https://api.deepseek.com/v1"
        dimensions: 1536
  language_models:
    openai_model:
      provider: openai-responses
      config:
        model: "deepseek-chat"
        api_key: sk-你的DeepSeek密钥
        base_url: "https://api.deepseek.com/v1"
```

**获取 API Key**：https://platform.deepseek.com

---

### 方案二：通义千问（阿里云服务器推荐 ⭐）

**特点**：
- ✅ 阿里云服务器访问最快
- ✅ 国内服务，稳定可靠
- ✅ 性能优秀（Qwen-Max 接近 GPT-4）
- ✅ 新用户有免费额度

**配置**：
```bash
OPENAI_API_KEY=sk-你的通义千问密钥
OPENAI_API_BASE=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_MODEL=qwen-max
```

**可选模型**：
- `qwen-max`：最强模型（推荐）
- `qwen-plus`：平衡性能与成本
- `qwen-turbo`：快速响应

**获取 API Key**：
1. 访问 https://dashscope.aliyun.com/
2. 用阿里云账号登录
3. 进入 "API-KEY 管理"
4. 创建新的 API-KEY

---

### 方案三：智谱AI（ChatGLM）

**特点**：
- ✅ 国产大模型
- ✅ 支持长上下文
- ✅ 价格合理

**配置**：
```bash
OPENAI_API_KEY=你的智谱AI密钥
OPENAI_API_BASE=https://open.bigmodel.cn/api/paas/v4/
AI_MODEL=glm-4
```

**可选模型**：
- `glm-4`：通用模型
- `glm-4-plus`：增强版

**获取 API Key**：https://open.bigmodel.cn/

---

### 方案四：OpenAI GPT（海外服务器）

**特点**：
- ✅ 最强性能
- ⚠️ 需要海外服务器
- ⚠️ 价格较高

**配置**：
```bash
OPENAI_API_KEY=sk-你的OpenAI密钥
OPENAI_API_BASE=https://api.openai.com/v1
AI_MODEL=gpt-4
```

**获取 API Key**：https://platform.openai.com/

---

## 🔄 如何切换 AI 服务

1. **修改服务器上的 `.env` 文件**：
   ```bash
   cd /opt/personal-assistant
   nano .env
   ```

2. **按照上面的配置填写对应的值**

3. **保存并重启应用**：
   ```bash
   pm2 restart personal-assistant
   ```

4. **完成！** 应用会立即使用新的 AI 服务

---

## 💡 推荐配置

### 国内阿里云服务器
```bash
OPENAI_API_KEY=sk-你的通义千问密钥
OPENAI_API_BASE=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_MODEL=qwen-max
```

### 海外服务器 + 预算充足
```bash
OPENAI_API_KEY=sk-你的OpenAI密钥
OPENAI_API_BASE=https://api.openai.com/v1
AI_MODEL=gpt-4
```

### 海外服务器 + 性价比
```bash
OPENAI_API_KEY=sk-你的DeepSeek密钥
OPENAI_API_BASE=https://api.deepseek.com/v1
AI_MODEL=deepseek-chat
```

---

## 🧪 测试配置是否正确

在服务器上执行：

```bash
cd /opt/personal-assistant
pm2 logs personal-assistant
```

然后访问应用发送一条消息，如果看到正常回复，说明配置成功！

如果看到错误，常见原因：
- API Key 错误
- API Base URL 错误
- 服务器无法访问该 API

---

## ❓ 常见问题

### Q: 我已经有 DeepSeek Key，能直接用吗？
A: 可以！按照"方案一"配置即可。

### Q: 如何测试哪个 API 在我的服务器上能访问？
A: 运行测试脚本（在部署文档中提供）

### Q: 能同时配置多个 AI 服务吗？
A: 不能，一次只能使用一个。切换时修改 `.env` 并重启即可。

### Q: 哪个 AI 服务最便宜？
A: DeepSeek 最便宜，通义千问和智谱AI 价格相近。

### Q: 推荐哪个？
A:
- 阿里云服务器 → 通义千问
- 海外服务器 + 预算充足 → OpenAI GPT-4
- 海外服务器 + 预算有限 → DeepSeek
