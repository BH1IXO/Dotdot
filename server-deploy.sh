#!/bin/bash

# ================================================================
# Personal Assistant 服务器端部署脚本
# 直接在服务器上运行此脚本完成部署
# ================================================================

set -e  # 遇到错误立即退出

echo "========================================"
echo "  Personal Assistant 部署脚本"
echo "========================================"
echo ""

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 步骤计数
STEP=0

function step() {
  STEP=$((STEP + 1))
  echo ""
  echo -e "${GREEN}[步骤 $STEP]${NC} $1"
  echo "----------------------------------------"
}

function error() {
  echo -e "${RED}❌ 错误: $1${NC}"
  exit 1
}

function success() {
  echo -e "${GREEN}✅ $1${NC}"
}

function warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# ================================================================
# 第1步：停止当前服务
# ================================================================
step "停止当前服务"

echo "正在停止node进程..."
killall -9 node 2>/dev/null || echo "没有运行中的node进程"
fuser -k 3000/tcp 2>/dev/null || echo "端口3000未被占用"
sleep 3

if ps aux | grep -v grep | grep "node server.js" > /dev/null; then
  error "服务停止失败，请手动停止"
else
  success "服务已停止"
fi

# ================================================================
# 第2步：进入源代码目录
# ================================================================
step "检查源代码目录"

cd /home/PersonalAssitant/personal-assistant || error "源代码目录不存在"
success "已进入源代码目录: $(pwd)"

# ================================================================
# 第3步：拉取最新代码
# ================================================================
step "拉取最新代码"

echo "当前Git状态:"
git log -1 --oneline

echo ""
echo "正在拉取..."
git pull origin main || warning "Git pull失败，使用当前代码继续"

echo ""
echo "最新commit:"
git log -1 --oneline
success "代码已更新"

# ================================================================
# 第4步：检查源代码修复
# ================================================================
step "验证源代码包含clipboard修复"

if grep -q "fallbackCopy" app/components/GuestLinksView.tsx; then
  success "GuestLinksView.tsx 包含 fallbackCopy 函数"
else
  error "GuestLinksView.tsx 缺少 fallbackCopy 函数"
fi

if grep -q "execCommand.*copy" app/components/GuestLinksView.tsx; then
  success "GuestLinksView.tsx 包含 execCommand('copy')"
else
  error "GuestLinksView.tsx 缺少 execCommand('copy')"
fi

if grep -q "fallbackCopy" app/guest-links/page.tsx; then
  success "guest-links/page.tsx 包含 fallbackCopy 函数"
else
  error "guest-links/page.tsx 缺少 fallbackCopy 函数"
fi

# ================================================================
# 第5步：安装依赖（如果需要）
# ================================================================
step "检查依赖"

if [ -f "package-lock.json" ]; then
  echo "检查依赖是否需要更新..."
  # 只在package.json有变化时才安装
  if ! npm ls > /dev/null 2>&1; then
    warning "检测到依赖问题，正在安装..."
    npm install || error "npm install 失败"
    success "依赖已安装"
  else
    success "依赖无需更新"
  fi
else
  warning "跳过依赖检查"
fi

# ================================================================
# 第6步：清理旧构建
# ================================================================
step "清理旧构建文件"

if [ -d ".next" ]; then
  echo "删除旧的 .next 目录..."
  rm -rf .next
  success "旧构建已清理"
else
  echo ".next 目录不存在，跳过清理"
fi

# ================================================================
# 第7步：构建项目
# ================================================================
step "构建项目（这可能需要2-5分钟）"

export MEMMACHINE_API_URL=http://localhost:8081

echo "开始构建..."
npm run build || error "构建失败"

echo ""
success "构建成功！"

# ================================================================
# 第8步：验证构建结果
# ================================================================
step "验证构建结果"

if [ ! -f ".next/BUILD_ID" ]; then
  error "BUILD_ID 文件不存在"
fi

BUILD_ID=$(cat .next/BUILD_ID)
echo "BUILD_ID: $BUILD_ID"

echo ""
echo "构建的文件数量:"
CHUNK_COUNT=$(find .next/static/chunks -name "*.js" | wc -l)
echo "  - JavaScript chunks: $CHUNK_COUNT"

echo ""
echo "验证clipboard代码存在..."
if grep -q '链接已复制' .next/static/chunks/*.js 2>/dev/null; then
  success "Clipboard 代码已编译到 bundle"
else
  warning "未找到clipboard代码，但继续部署"
fi

# ================================================================
# 第9步：备份当前部署（可选）
# ================================================================
step "备份当前部署"

DEPLOY_DIR="/home/PersonalAssitant/deploy-package"
BACKUP_DIR="/home/PersonalAssitant/deploy-backup-$(date +%Y%m%d-%H%M%S)"

if [ -d "$DEPLOY_DIR/.next" ]; then
  echo "创建备份: $BACKUP_DIR"
  mkdir -p "$BACKUP_DIR"
  cp -r "$DEPLOY_DIR/.next" "$BACKUP_DIR/" 2>/dev/null || true
  success "备份完成"
else
  echo "无需备份（首次部署）"
fi

# ================================================================
# 第10步：清理部署目录
# ================================================================
step "清理部署目录"

cd "$DEPLOY_DIR" || error "部署目录不存在: $DEPLOY_DIR"

echo "删除旧的static和server目录..."
rm -rf .next/static .next/server
rm -f .next/BUILD_ID
success "部署目录已清理"

# ================================================================
# 第11步：复制新构建文件
# ================================================================
step "复制新构建文件到部署目录"

SOURCE_DIR="/home/PersonalAssitant/personal-assistant/.next"

echo "复制 static 目录..."
cp -r "$SOURCE_DIR/static" .next/ || error "复制 static 失败"
success "static 目录已复制"

echo "复制 server 目录..."
cp -r "$SOURCE_DIR/server" .next/ || error "复制 server 失败"
success "server 目录已复制"

echo "复制 BUILD_ID..."
cp "$SOURCE_DIR/BUILD_ID" .next/ || error "复制 BUILD_ID 失败"
success "BUILD_ID 已复制"

# 如果standalone有更新，也复制（通常不需要）
if [ -d "$SOURCE_DIR/standalone" ]; then
  echo "检测到 standalone 目录，跳过复制（使用现有）"
fi

# ================================================================
# 第12步：验证部署文件
# ================================================================
step "验证部署文件"

DEPLOY_BUILD_ID=$(cat .next/BUILD_ID)
echo "部署目录 BUILD_ID: $DEPLOY_BUILD_ID"

if [ "$BUILD_ID" != "$DEPLOY_BUILD_ID" ]; then
  error "BUILD_ID 不匹配！源: $BUILD_ID, 部署: $DEPLOY_BUILD_ID"
fi

echo ""
echo "部署的 chunks 数量:"
DEPLOY_CHUNK_COUNT=$(find .next/static/chunks -name "*.js" | wc -l)
echo "  - JavaScript chunks: $DEPLOY_CHUNK_COUNT"

echo ""
echo "验证clipboard代码..."
if grep -q '链接已复制' .next/static/chunks/*.js 2>/dev/null; then
  success "Clipboard 代码已部署"
else
  warning "未在部署文件中找到clipboard代码"
fi

success "部署文件验证通过"

# ================================================================
# 第13步：启动服务
# ================================================================
step "启动服务"

export MEMMACHINE_API_URL=http://localhost:8081

echo "后台启动服务..."
nohup node server.js > /tmp/next-server.log 2>&1 &
PID=$!

echo "服务 PID: $PID"
sleep 5

# ================================================================
# 第14步：验证服务运行
# ================================================================
step "验证服务运行状态"

if ps -p $PID > /dev/null; then
  success "服务进程运行中 (PID: $PID)"
else
  error "服务启动失败"
fi

echo ""
echo "检查端口监听..."
if netstat -tlnp | grep :3000 > /dev/null; then
  success "端口 3000 正在监听"
else
  error "端口 3000 未监听"
fi

echo ""
echo "测试 API 响应..."
API_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" http://localhost:3000/api/auth/me)
HTTP_CODE=$(echo "$API_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "200" ]; then
  success "API 响应正常 (HTTP $HTTP_CODE)"
else
  warning "API 响应异常 (HTTP $HTTP_CODE)"
fi

# ================================================================
# 完成
# ================================================================
echo ""
echo "========================================"
echo -e "${GREEN}   ✅ 部署完成！${NC}"
echo "========================================"
echo ""
echo "📊 部署信息:"
echo "  - BUILD_ID: $BUILD_ID"
echo "  - 进程 PID: $PID"
echo "  - 文件数量: $DEPLOY_CHUNK_COUNT JavaScript chunks"
echo "  - 日志文件: /tmp/next-server.log"
echo ""
echo "🌐 访问地址:"
echo "  - 内部: http://localhost:3000"
echo "  - 外部: http://123.57.28.44:3000"
echo ""
echo "📝 下一步操作:"
echo "  1. 在浏览器中访问: http://123.57.28.44:3000"
echo "  2. 强制刷新浏览器: Ctrl+Shift+R"
echo "  3. 登录并测试访客链接复制功能"
echo ""
echo "🔍 查看日志:"
echo "  tail -f /tmp/next-server.log"
echo ""
echo "🔄 重启服务:"
echo "  killall -9 node && cd $DEPLOY_DIR && nohup node server.js > /tmp/next-server.log 2>&1 &"
echo ""
