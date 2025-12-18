#!/bin/bash

echo "最终重新部署脚本"
echo "=================="

# SSH连接信息
SSH_HOST="123.57.28.44"
SSH_USER="root"
SSH_PASS="Zen721ViaNet"

# 使用sshpass执行远程命令
sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no $SSH_USER@$SSH_HOST << 'ENDSSH'

echo "=== 步骤1: 彻底清理 ==="
pkill -9 node
sleep 3
ps aux | grep node | grep -v grep || echo "✅ 所有node进程已停止"

echo ""
echo "=== 步骤2: 重新克隆代码 ==="
cd /home/PersonalAssitant
rm -rf personal-assistant
git clone https://gitee.com/toddliudada/dot.git personal-assistant
cd personal-assistant

echo ""
echo "=== 步骤3: 配置环境变量 ==="
cat > .env << 'EOF'
OPENAI_API_KEY=sk-54c3f8dd90f145e8919f05dc7f137722
OPENAI_API_BASE=https://api.deepseek.com/v1
AI_MODEL=deepseek-chat
USE_STREAMING=true
DATABASE_URL="file:./prisma/dev.db"
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=http://123.57.28.44:3000
MEMMACHINE_API_URL=http://localhost:8081
SERPER_API_KEY=315636032a21a78ec276030910acf84b02aaca42
EOF
echo "✅ .env已配置"

echo ""
echo "=== 步骤4: 安装依赖 ==="
npm install 2>&1 | tail -10

echo ""
echo "=== 步骤5: 构建项目 ==="
npm run build 2>&1 | tail -20

echo ""
echo "=== 步骤6: 准备部署 ==="
cd /home/PersonalAssitant
rm -rf deploy-package
mkdir -p deploy-package
cp -r personal-assistant/.next deploy-package/
cp personal-assistant/.env deploy-package/.next/standalone/

echo ""
echo "=== 步骤7: 初始化数据库 ==="
cd deploy-package/.next/standalone
mkdir -p prisma
cp /home/PersonalAssitant/personal-assistant/prisma/schema.prisma prisma/
node_modules/.bin/prisma db push --accept-data-loss 2>&1 || echo "数据库已就绪"

echo ""
echo "=== 步骤8: 启动服务 ==="
export MEMMACHINE_API_URL=http://localhost:8081
nohup node server.js > /tmp/next-server.log 2>&1 &
echo "PID: $!"
sleep 5

echo ""
echo "=== 步骤9: 验证 ==="
tail -30 /tmp/next-server.log
echo ""
curl -s http://localhost:3000/api/auth/me || echo "服务启动中..."

ENDSSH

echo ""
echo "部署完成！"
echo "访问: http://123.57.28.44:3000"
