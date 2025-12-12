# 🚀 快速部署指南

## 三种部署方式对比

| 方式 | 难度 | 成本 | 推荐场景 |
|------|------|------|----------|
| **Vercel** | ⭐ 最简单 | 免费 | 个人使用、快速上线 |
| **Docker** | ⭐⭐ 简单 | ¥10/月 | 有VPS、需要完全控制 |
| **PM2** | ⭐⭐⭐ 中等 | ¥10/月 | 传统部署方式 |

---

## 方式一：Vercel 部署（5分钟上线）

### 步骤

#### 1. 准备代码仓库
```bash
# 初始化 Git（如果还没有）
git init
git add .
git commit -m "Initial commit"

# 推送到 GitHub
git remote add origin https://github.com/your-username/personal-assistant.git
git push -u origin main
```

#### 2. 部署到 Vercel
1. 访问 [vercel.com](https://vercel.com)
2. 使用 GitHub 账号登录
3. 点击 **"Add New Project"**
4. 选择你的 `personal-assistant` 仓库
5. 点击 **"Import"**

#### 3. 配置环境变量
在 Vercel 项目设置中添加：
```
DEEPSEEK_API_KEY=sk-54c3f8dd90f145e8919f05dc7f137722
DATABASE_URL=file:./data/prod.db
```

#### 4. 部署
点击 **"Deploy"**，等待 2-3 分钟。

#### 5. 访问
部署完成后，你会得到一个 URL：
```
https://your-project.vercel.app
```

### 更新应用
每次 `git push` 到 main 分支，Vercel 会自动重新部署！

---

## 方式二：Docker 部署（推荐服务器用户）

### 前置条件
- 一台 VPS（腾讯云/阿里云/AWS/DigitalOcean）
- 已安装 Docker 和 Docker Compose

### 步骤

#### 1. 连接到服务器
```bash
ssh root@your-server-ip
```

#### 2. 安装 Docker（如果未安装）
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 3. 克隆代码
```bash
git clone https://github.com/your-username/personal-assistant.git
cd personal-assistant
```

#### 4. 配置环境变量
```bash
cp .env.example .env
nano .env
```

填写你的 DeepSeek API Key：
```
DEEPSEEK_API_KEY=sk-54c3f8dd90f145e8919f05dc7f137722
```

#### 5. 启动服务
```bash
# 创建数据目录
mkdir -p data

# 构建并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f
```

#### 6. 配置防火墙
```bash
# 开放 3000 端口
sudo ufw allow 3000
```

#### 7. 访问应用
```
http://your-server-ip:3000
```

### 使用域名（可选）

#### 安装 Nginx
```bash
sudo apt install nginx
```

#### 配置反向代理
```bash
sudo nano /etc/nginx/sites-available/personal-assistant
```

填入：
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/personal-assistant /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 配置 HTTPS（免费）
```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com
```

现在访问：`https://your-domain.com`

---

## 方式三：传统 PM2 部署

### 步骤

#### 1. 安装 Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 2. 克隆并安装
```bash
git clone https://github.com/your-username/personal-assistant.git
cd personal-assistant
npm install
```

#### 3. 配置环境变量
```bash
cp .env.example .env
nano .env
```

#### 4. 构建应用
```bash
npm run build
```

#### 5. 安装并启动 PM2
```bash
npm install -g pm2
pm2 start npm --name "personal-assistant" -- start
pm2 save
pm2 startup
```

#### 6. 查看状态
```bash
pm2 status
pm2 logs personal-assistant
```

---

## 常见问题

### Q: 如何更新应用？

**Vercel:**
```bash
git add .
git commit -m "Update"
git push
# 自动部署
```

**Docker:**
```bash
git pull
docker-compose up -d --build
```

**PM2:**
```bash
git pull
npm run build
pm2 restart personal-assistant
```

### Q: 如何备份数据？

**SQLite 数据库:**
```bash
# Docker
docker cp personal-assistant_app_1:/app/data/prod.db ./backup.db

# 本地
cp dev.db backup-$(date +%Y%m%d).db
```

### Q: 如何查看日志？

**Vercel:**
在 Vercel Dashboard → Your Project → Logs

**Docker:**
```bash
docker-compose logs -f
```

**PM2:**
```bash
pm2 logs personal-assistant
```

### Q: 数据库在哪里？

- **开发环境:** `./dev.db`
- **Docker:** `./data/prod.db`
- **Vercel:** 自动创建在临时文件系统

> ⚠️ Vercel 的文件系统是只读的，每次部署会重置！
> 生产环境建议升级到 PostgreSQL (Phase 4)

---

## 性能优化建议

### 1. 启用 CDN（Vercel 自动）
- Cloudflare
- AWS CloudFront

### 2. 数据库优化
Phase 4 升级到 PostgreSQL + 连接池

### 3. 启用缓存
```typescript
// 未来可添加 Redis 缓存
```

### 4. 监控
- Sentry（错误追踪）
- Vercel Analytics（访问分析）

---

## 安全检查清单

- [ ] API Key 已设置为环境变量
- [ ] 生产环境使用 HTTPS
- [ ] 防火墙已配置
- [ ] 定期备份数据库
- [ ] 更新依赖包 `npm audit fix`

---

**需要帮助？** 查看主 README.md 或提交 Issue。
