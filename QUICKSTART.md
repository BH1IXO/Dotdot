# 🚀 快速开始指南

## 📍 当前状态

✅ **Phase 1 已完成** - 基于 DeepSeek V3 的智能对话系统
📋 **Phase 2 已规划** - MemMachine 记忆系统集成

---

## 🎮 本地运行（5分钟）

### 1. 安装依赖
```bash
cd E:\Personal_Todd\personal-assistant
npm install
```

### 2. 启动开发服务器
```bash
npm run dev
```

### 3. 打开浏览器
访问 **http://localhost:3000**

### 4. 开始对话！
试试问：
- "你好，介绍一下你自己"
- "你能帮我做什么？"
- "给我讲个笑话"

---

## 🌐 部署到线上（推荐：Vercel）

### 方式 A：通过 Vercel 网站（最简单）

#### 1. 推送到 GitHub
```bash
# 如果还没有远程仓库，在 GitHub 创建一个
git remote add origin https://github.com/你的用户名/personal-assistant.git
git push -u origin master
```

#### 2. 导入到 Vercel
1. 访问 [vercel.com](https://vercel.com)
2. 点击 **"Add New Project"**
3. 选择你的 GitHub 仓库
4. 点击 **"Import"**

#### 3. 配置环境变量
在 Vercel 项目设置中添加：
```
DEEPSEEK_API_KEY=sk-54c3f8dd90f145e8919f05dc7f137722
```

#### 4. 部署
点击 **"Deploy"**，等待 2-3 分钟

#### 5. 访问
你会得到一个 URL：`https://你的项目.vercel.app`

---

### 方式 B：通过命令行

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录
vercel login

# 部署
vercel

# 添加环境变量
vercel env add DEEPSEEK_API_KEY
# 输入: sk-54c3f8dd90f145e8919f05dc7f137722

# 再次部署（应用环境变量）
vercel --prod
```

---

## 🐳 Docker 部署（VPS/服务器）

### 1. 确保安装 Docker
```bash
docker --version
docker-compose --version
```

### 2. 启动服务
```bash
cd E:\Personal_Todd\personal-assistant
docker-compose up -d --build
```

### 3. 查看日志
```bash
docker-compose logs -f
```

### 4. 访问
```
http://你的服务器IP:3000
```

---

## 📊 数据库管理

### 查看数据库内容
```bash
npm run db:studio
```
访问 http://localhost:5555

### 查看对话历史
打开 Prisma Studio → 选择 `Message` 表

---

## 🔧 常用命令

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm run start

# 数据库同步
npm run db:push

# 数据库管理界面
npm run db:studio

# Docker 启动
docker-compose up -d

# Docker 停止
docker-compose down

# 查看日志
docker-compose logs -f
```

---

## 🎯 下一步

### 选项 1：继续使用 Phase 1
- ✅ 功能完整，可以立即使用
- ✅ 成本低（¥2-5/月）
- ✅ 部署简单

### 选项 2：升级到 Phase 2（MemMachine）
查看 `PHASE2_PLAN.md` 了解详细计划

**开始前需要：**
1. 克隆 MemMachine 项目
2. 本地测试 MemMachine API
3. 阅读集成文档

---

## 📚 文档索引

| 文档 | 说明 |
|------|------|
| `README.md` | 项目概述和完整说明 |
| `DEPLOY.md` | 三种部署方式详解 |
| `QUICKSTART.md` | 本文档（快速开始） |
| `PHASE2_PLAN.md` | Phase 2 详细计划 |
| `PROJECT_SUMMARY.md` | 项目总结 |

---

## ❓ 常见问题

### Q: API 调用失败？
**A:** 检查 `.env` 中的 `DEEPSEEK_API_KEY` 是否正确

### Q: 端口 3000 被占用？
**A:** 修改 `package.json` 中的端口：
```json
"dev": "next dev -p 3001"
```

### Q: Vercel 部署后对话历史丢失？
**A:** Vercel 的文件系统是临时的，Phase 2 会迁移到持久化数据库

### Q: 如何更新应用？
**A:**
- Vercel: `git push` 自动部署
- Docker: `git pull && docker-compose up -d --build`

---

## 📞 获取帮助

- 查看完整文档：`README.md`
- 查看部署指南：`DEPLOY.md`
- 提交 Issue：GitHub Issues

---

**当前版本：** Phase 1 (v1.0.0)
**状态：** ✅ 可用于生产环境
**上次更新：** 2024-12-09
