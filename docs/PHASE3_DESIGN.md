# Phase 3: 文件上传与智能索引系统

## 🎯 目标

构建一个智能文件管理系统，支持图片、PDF 等文件的上传、存储、解析和语义检索。

## 📋 核心功能

### 1. 文件上传
- ✅ 支持拖拽上传
- ✅ 支持多文件批量上传
- ✅ 文件类型：图片（JPG, PNG, GIF）、PDF、文本文档
- ✅ 文件大小限制：10MB/文件
- ✅ 上传进度显示

### 2. 文件存储
- **本地存储**（Phase 3.1）
  - 存储路径：`/uploads/{userId}/{fileId}.{ext}`
  - 元数据存储在 SQLite
- **云存储**（Phase 3.2 可选）
  - 支持 AWS S3 / 阿里云 OSS
  - CDN 加速

### 3. 文件处理
- **图片处理**
  - 缩略图生成（200x200）
  - EXIF 信息提取（拍摄时间、地点）
  - 使用 DeepSeek Vision 或 GPT-4V 生成描述
- **PDF 处理**
  - 文本提取（pdf-parse）
  - 页面预览图生成
  - 分块处理（每 1000 字一块）
- **文本文档**
  - 直接读取内容
  - Markdown 渲染

### 4. 智能索引
- **向量化索引**
  - 文件内容通过 OpenAI embeddings 向量化
  - 存储到 MemMachine
  - 支持语义搜索
- **元数据索引**
  - 文件名、类型、大小
  - 上传时间、修改时间
  - 用户标签、分类

### 5. 文件检索
- **语义搜索**："帮我找去年夏天和奶奶的照片"
- **标签搜索**：按标签、分类筛选
- **时间筛选**：按日期范围查找
- **混合搜索**：结合语义 + 元数据

## 🏗️ 技术架构

### 数据库 Schema

```prisma
model File {
  id          String   @id @default(cuid())
  filename    String   // 原始文件名
  filepath    String   // 存储路径
  mimetype    String   // MIME 类型
  size        Int      // 文件大小（字节）

  // 元数据
  thumbnailPath String?  // 缩略图路径
  width       Int?      // 图片宽度
  height      Int?      // 图片高度
  duration    Int?      // 视频时长

  // AI 生成的内容
  description String?   // 文件描述
  extractedText String? // 提取的文本内容
  tags        String[]  // 标签数组

  // 时间戳
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // 关联
  userId      String   @default("default")
  chunks      FileChunk[]
}

model FileChunk {
  id        String   @id @default(cuid())
  fileId    String
  file      File     @relation(fields: [fileId], references: [id], onDelete: Cascade)

  chunkIndex Int     // 块索引
  content    String  // 块内容

  // MemMachine 向量 ID
  vectorId   String?

  createdAt  DateTime @default(now())

  @@index([fileId])
}
```

### API 设计

#### 1. POST /api/files/upload
上传文件

**Request:**
```typescript
Content-Type: multipart/form-data

file: File
tags?: string[] // 可选标签
```

**Response:**
```json
{
  "id": "file_123",
  "filename": "photo.jpg",
  "url": "/uploads/default/file_123.jpg",
  "thumbnail": "/uploads/default/file_123_thumb.jpg",
  "description": "一张在公园的照片",
  "size": 1024000,
  "createdAt": "2024-12-10T10:00:00Z"
}
```

#### 2. GET /api/files
获取文件列表

**Query Params:**
- `type`: 文件类型过滤（image/pdf/document）
- `tag`: 标签过滤
- `search`: 语义搜索关键词
- `limit`: 数量限制（默认 20）
- `offset`: 偏移量

**Response:**
```json
{
  "files": [
    {
      "id": "file_123",
      "filename": "photo.jpg",
      "thumbnail": "/uploads/...",
      "description": "...",
      "tags": ["旅行", "2023"],
      "createdAt": "2024-12-10T10:00:00Z"
    }
  ],
  "total": 100,
  "hasMore": true
}
```

#### 3. GET /api/files/:id
获取文件详情

#### 4. DELETE /api/files/:id
删除文件

#### 5. POST /api/files/:id/analyze
重新分析文件（AI 描述生成）

### 文件处理流程

```
用户上传文件
     ↓
保存到本地 /uploads
     ↓
保存元数据到数据库
     ↓
后台异步处理：
  1. 生成缩略图（图片）
  2. 提取文本（PDF）
  3. AI 生成描述（图片/文档）
  4. 文本分块
     ↓
  5. 向量化并存储到 MemMachine
     ↓
更新数据库状态
     ↓
通知前端处理完成
```

## 📦 依赖包

```json
{
  "dependencies": {
    "multer": "^1.4.5-lts.1",        // 文件上传
    "sharp": "^0.33.0",              // 图片处理
    "pdf-parse": "^1.1.1",           // PDF 解析
    "exifreader": "^4.0.0",          // EXIF 读取
    "pdf-lib": "^1.17.1",            // PDF 操作
    "mammoth": "^1.6.0"              // Word 文档转换（可选）
  }
}
```

## 🎨 UI 设计

### 文件上传区域
```
┌─────────────────────────────────────────┐
│  📎 拖拽文件到这里，或点击上传             │
│                                         │
│     [选择文件]  [从聊天上传]             │
│                                         │
│  支持：图片(JPG/PNG) PDF 文档            │
│  最大：10MB                              │
└─────────────────────────────────────────┘
```

### 文件网格视图
```
┌────────┐ ┌────────┐ ┌────────┐
│ 📷     │ │ 📄     │ │ 🖼️     │
│ photo  │ │ report │ │ design │
│ .jpg   │ │ .pdf   │ │ .png   │
│ 2.1MB  │ │ 500KB  │ │ 1.5MB  │
└────────┘ └────────┘ └────────┘
```

### 文件详情侧边栏
```
┌─────────────────────┐
│ 📷 photo.jpg        │
│ ─────────────────── │
│ 大小：2.1MB         │
│ 类型：图片          │
│ 上传：2024-12-10    │
│                     │
│ AI 描述：           │
│ 一张在海边的日落照片 │
│                     │
│ 标签：              │
│ [旅行] [2024] [海边]│
│                     │
│ [查看原图] [删除]   │
└─────────────────────┘
```

## 🚀 实现步骤

### Step 1: 数据库 Schema（今天）
- [x] 创建 File 和 FileChunk 模型
- [ ] 运行 Prisma migration

### Step 2: 文件上传 API（今天）
- [ ] 实现 /api/files/upload
- [ ] 实现文件存储逻辑
- [ ] 添加文件类型验证

### Step 3: 图片处理（明天）
- [ ] 缩略图生成
- [ ] EXIF 提取
- [ ] AI 描述生成

### Step 4: PDF 处理（明天）
- [ ] 文本提取
- [ ] 分块处理
- [ ] 向量索引

### Step 5: 前端界面（后天）
- [ ] 文件上传组件
- [ ] 文件网格视图
- [ ] 文件详情侧边栏

### Step 6: 语义搜索集成（后天）
- [ ] MemMachine 索引
- [ ] 搜索 API
- [ ] 搜索结果展示

## 📊 性能优化

1. **异步处理**：文件上传后立即返回，后台异步处理
2. **缩略图**：只加载缩略图，点击才加载原图
3. **懒加载**：滚动加载文件列表
4. **缓存**：缩略图使用 CDN 缓存
5. **压缩**：自动压缩大图片

## 🔒 安全考虑

1. **文件类型验证**：只允许白名单类型
2. **文件大小限制**：单文件 10MB
3. **病毒扫描**：集成 ClamAV（可选）
4. **用户隔离**：文件按用户 ID 隔离存储
5. **访问控制**：只能访问自己的文件

## 💡 未来扩展

- 图片 OCR 文字识别
- 视频文件支持
- 音频转文字
- 文件分享链接
- 协作编辑
