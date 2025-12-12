# 部署指南

本文档提供多种部署方案，帮助你将个人AI助理部署到互联网上供他人使用。

---

## 🎯 方案对比

| 方案 | 难度 | 成本 | 优势 | 适合场景 |
|------|------|------|------|----------|
| Railway | ⭐ 简单 | $5-20/月 | 零配置、自动HTTPS、Git自动部署 | **推荐！快速上线** |
| VPS (腾讯云/阿里云) | ⭐⭐⭐ 中等 | ¥68-200/年 | 完全控制、性能好 | 懂Linux运维 |
| Docker Compose (VPS) | ⭐⭐ 简单 | ¥68-200/年 | 一键部署、易维护 | **推荐！性价比高** |

---

## 方案一：Railway 部署（最简单 ⭐）

Railway 是一个现代化的云平台，支持自动部署、HTTPS、数据库等。

### 步骤 1：准备工作

1. **注册 Railway 账号**: https://railway.app
2. **安装 Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

### 步骤 2：推送代码到 GitHub

```bash
# 在项目目录下
git init
git add .
git commit -m "Initial commit"

# 创建 GitHub 仓库后
git remote add origin https://github.com/你的用户名/personal-assistant.git
git push -u origin main
```

### 步骤 3：部署主应用

1. 登录 Railway: https://railway.app
2. 点击 "New Project" → "Deploy from GitHub repo"
3. 选择 `personal-assistant` 仓库
4. 添加环境变量：

**必需的环境变量**:
```bash
OPENAI_API_KEY=sk-xxx（你的 DeepSeek API Key）
OPENAI_API_BASE=https://api.deepseek.com/v1
JWT_SECRET=你的随机密钥（至少32位）
DATABASE_URL=postgresql://postgres:xxx@containers-us-west-xxx.railway.app:7432/railway
NODE_ENV=production
```

**可选的环境变量**:
```bash
MEMMACHINE_URL=https://你的memmachine服务.up.railway.app
TAVILY_API_KEY=tvly-xxx（网络搜索功能）
```

5. Railway 会自动检测 Next.js 项目并部署
6. 等待构建完成（约 3-5 分钟）

### 步骤 4：添加 PostgreSQL 数据库

1. 在 Railway 项目中点击 "New" → "Database" → "Add PostgreSQL"
2. 复制 `DATABASE_URL` 到主应用的环境变量
3. 在主应用中运行数据库迁移：
   - 进入 "Settings" → "Service" → "Deploy"
   - 添加部署命令：`npx prisma db push`

### 步骤 5：部署 MemMachine（可选但推荐）

**方案 A: Railway 部署 MemMachine**

MemMachine 需要 PostgreSQL + Neo4j，在 Railway 上部署较复杂。建议使用外部服务：

1. **PostgreSQL**: Railway 提供（已创建）
2. **Neo4j**: 使用 Neo4j Aura 免费版
   - 注册: https://neo4j.com/cloud/aura/
   - 创建免费数据库（200MB）
   - 获取连接信息

3. **部署 MemMachine**:
   - 在 Railway 创建新服务
   - 选择 "Deploy from GitHub repo"
   - 环境变量：
     ```bash
     NEO4J_URI=neo4j+s://xxx.databases.neo4j.io
     NEO4J_USER=neo4j
     NEO4J_PASSWORD=你的密码
     DATABASE_URL=postgresql://...（使用同一个PostgreSQL）
     OPENAI_API_KEY=sk-xxx
     ```

**方案 B: 使用托管的 MemMachine 服务**

如果觉得太复杂，可以暂时不部署 MemMachine，系统会降级为普通对话模式（无长期记忆）。

### 步骤 6：访问应用

1. Railway 会自动分配域名: `https://你的项目名.up.railway.app`
2. 访问该域名即可使用
3. 自定义域名（可选）:
   - Settings → Domains → Add Custom Domain
   - 配置 DNS 记录

### 成本估算（Railway）

- 免费额度: $5/月（试用）
- 付费计划:
  - 主应用: ~$5-10/月
  - PostgreSQL: ~$5/月
  - MemMachine: ~$5-10/月
  - **总计**: $15-25/月

---

## 方案二：VPS Docker 部署（性价比高 ⭐⭐⭐）

适合有一定 Linux 基础的用户，成本低廉。

### 步骤 1：购买 VPS

推荐平台：
- **腾讯云轻量应用服务器**: ¥68/年起（2核2G）
- **阿里云ECS**: ¥99/年起
- **Vultr**: $6/月（海外，速度快）

**配置建议**:
- CPU: 2核+
- 内存: 4GB+（MemMachine 需要较多内存）
- 硬盘: 40GB+
- 系统: Ubuntu 22.04 LTS

### 步骤 2：配置服务器

SSH 连接到服务器：
```bash
ssh root@你的服务器IP
```

安装 Docker 和 Docker Compose：
```bash
# 更新系统
apt update && apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 安装 Docker Compose
apt install docker-compose -y

# 启动 Docker
systemctl start docker
systemctl enable docker
```

### 步骤 3：克隆项目

```bash
# 安装 Git
apt install git -y

# 克隆项目
cd /opt
git clone https://github.com/你的用户名/personal-assistant.git
cd personal-assistant
```

### 步骤 4：配置环境变量

创建 `.env` 文件：
```bash
nano .env
```

填入以下内容：
```bash
# DeepSeek API
OPENAI_API_KEY=sk-xxx
OPENAI_API_BASE=https://api.deepseek.com/v1

# JWT 密钥（随机生成）
JWT_SECRET=你的随机密钥至少32位

# 数据库
DATABASE_URL=file:./data/prod.db

# MemMachine
MEMMACHINE_URL=http://localhost:8081

# Tavily 搜索（可选）
TAVILY_API_KEY=tvly-xxx

# 生产环境
NODE_ENV=production
```

### 步骤 5：部署 MemMachine

```bash
# 克隆 MemMachine
cd /opt
git clone https://github.com/memmachine/memmachine.git
cd memmachine

# 创建 .env
nano .env
```

MemMachine `.env`:
```bash
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-secure-password
OPENAI_API_KEY=sk-xxx
DATABASE_URL=postgresql://postgres:password@postgres:5432/memmachine
```

启动 MemMachine:
```bash
docker-compose up -d
```

### 步骤 6：启动主应用

```bash
cd /opt/personal-assistant

# 构建并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f
```

### 步骤 7：配置 Nginx 反向代理

安装 Nginx:
```bash
apt install nginx -y
```

配置文件 `/etc/nginx/sites-available/personal-assistant`:
```nginx
server {
    listen 80;
    server_name 你的域名.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 增加超时时间（用于流式响应）
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

启用配置:
```bash
ln -s /etc/nginx/sites-available/personal-assistant /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 步骤 8：配置 HTTPS（Let's Encrypt）

```bash
# 安装 Certbot
apt install certbot python3-certbot-nginx -y

# 获取证书
certbot --nginx -d 你的域名.com

# 自动续期
certbot renew --dry-run
```

### 步骤 9：配置防火墙

```bash
# 允许 HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp  # SSH
ufw enable
```

### 访问应用

- HTTP: `http://你的域名.com`
- HTTPS: `https://你的域名.com`

### 维护命令

```bash
# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 更新应用
git pull
docker-compose up -d --build

# 备份数据库
cp data/prod.db data/prod.db.backup
```

### 成本估算（VPS）

- VPS: ¥68-200/年
- 域名: ¥30-80/年
- **总计**: ¥100-300/年

---

## 方案三：Render 部署（备选）

Render 类似 Railway，免费额度更大但速度稍慢。

### 步骤

1. 注册 Render: https://render.com
2. 创建 Web Service → 连接 GitHub 仓库
3. 配置:
   - Environment: Node
   - Build Command: `npm install && npm run build && npx prisma generate`
   - Start Command: `npm start`
4. 添加环境变量（同 Railway）
5. 部署

**免费额度**:
- 750小时/月免费（足够个人使用）
- 自动休眠（15分钟无访问）
- 重启需要30秒

---

## 域名配置

### 购买域名

推荐平台：
- **腾讯云**: https://dnspod.cloud.tencent.com
- **阿里云**: https://wanwang.aliyun.com
- **Cloudflare**: https://www.cloudflare.com（国际域名）

### DNS 配置

以腾讯云为例：
1. 进入域名管理
2. 添加记录：
   - 类型: A
   - 主机记录: @（或 www）
   - 记录值: 你的服务器IP
   - TTL: 600

**Railway/Render 配置**:
1. 添加 CNAME 记录：
   - 主机记录: @
   - 记录值: xxx.up.railway.app
2. 在 Railway/Render 控制台添加自定义域名

---

## 数据备份

### 自动备份脚本

创建 `/opt/backup.sh`:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"

mkdir -p $BACKUP_DIR

# 备份 SQLite 数据库
cp /opt/personal-assistant/data/prod.db $BACKUP_DIR/prod_$DATE.db

# 备份上传的文件
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /opt/personal-assistant/public/uploads

# 删除7天前的备份
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

设置定时任务:
```bash
chmod +x /opt/backup.sh
crontab -e
```

添加（每天凌晨3点备份）:
```
0 3 * * * /opt/backup.sh >> /var/log/backup.log 2>&1
```

---

## 监控和日志

### 查看应用日志

```bash
# Docker 日志
docker-compose logs -f personal-assistant

# Nginx 日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 性能监控

使用 PM2（如果不用 Docker）:
```bash
npm install -g pm2
pm2 start npm --name "personal-assistant" -- start
pm2 monit  # 实时监控
```

---

## 常见问题

### 1. 端口被占用

```bash
# 查看端口占用
netstat -tulpn | grep :3000

# 杀死进程
kill -9 进程ID
```

### 2. 内存不足

增加 Node.js 内存限制:
```bash
# 在 package.json 的 start 脚本中
"start": "NODE_OPTIONS='--max-old-space-size=2048' next start"
```

### 3. MemMachine 连接失败

检查服务状态:
```bash
curl http://localhost:8081/health
```

### 4. 数据库迁移失败

手动运行:
```bash
npx prisma db push
npx prisma generate
```

---

## 成本总结

| 方案 | 月成本 | 年成本 | 优势 | 劣势 |
|------|--------|--------|------|------|
| Railway | $15-25 | $180-300 | 零运维、自动HTTPS | 贵 |
| VPS (腾讯云) | ¥8-17 | ¥100-200 | 便宜、性能好 | 需运维 |
| Render 免费版 | $0 | $0 | 免费 | 会休眠 |

**推荐**:
- 学习/测试: Render 免费版
- 小团队使用: Railway
- 长期运营: VPS

---

## 下一步

部署完成后，你可以：
1. 邀请用户注册（`/register` 页面）
2. 在设置中配置删除密码
3. 上传文档构建知识库
4. 开始使用！

需要帮助？查看项目 README 或提交 Issue。
