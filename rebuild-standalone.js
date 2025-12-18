const { Client } = require('ssh2');

console.log('🔄 重新构建standalone部署...\n');

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH连接成功\n');

  const rebuildCmd = `
echo "=== 1. 停止服务 ==="
pkill -9 -f "node server.js"
sleep 2

echo ""
echo "=== 2. 清理并重新复制 standalone ==="
cd /home/PersonalAssitant
rm -rf deploy-package
mkdir -p deploy-package

echo "复制完整的 .next 目录..."
cp -r personal-assistant/.next deploy-package/

echo ""
echo "=== 3. 检查 standalone 内容 ==="
ls -la deploy-package/.next/standalone/ | head -15

echo ""
echo "=== 4. 配置环境变量 ==="
cd deploy-package/.next/standalone
cat > .env << 'ENV_EOF'
# ==================== AI 配置（统一使用 DeepSeek）====================
OPENAI_API_KEY=sk-54c3f8dd90f145e8919f05dc7f137722
OPENAI_API_BASE=https://api.deepseek.com/v1
AI_MODEL=deepseek-chat
USE_STREAMING=true

# ==================== 数据库配置 ====================
DATABASE_URL="file:./prisma/dev.db"

# ==================== 应用配置 ====================
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=http://123.57.28.44:3000

# ==================== MemMachine 配置 ====================
MEMMACHINE_API_URL=http://localhost:8081

# ==================== Serper API 配置 ====================
SERPER_API_KEY=315636032a21a78ec276030910acf84b02aaca42
ENV_EOF
echo "✅ .env 已配置"

echo ""
echo "=== 5. 创建数据库目录并初始化 ==="
mkdir -p prisma
if [ -f "/home/PersonalAssitant/personal-assistant/prisma/schema.prisma" ]; then
  cp /home/PersonalAssitant/personal-assistant/prisma/schema.prisma prisma/
  echo "✅ Schema 已复制"
fi

# 检查是否有node_modules/.bin/prisma
if [ -f "node_modules/.bin/prisma" ]; then
  echo "初始化数据库..."
  node_modules/.bin/prisma db push --accept-data-loss 2>&1 | tail -10
else
  echo "⚠️  Prisma CLI 不存在，跳过数据库初始化"
fi

echo ""
echo "=== 6. 启动服务 ==="
export MEMMACHINE_API_URL=http://localhost:8081
nohup node server.js > /tmp/next-server.log 2>&1 &
NEW_PID=$!
echo "✅ 服务已启动，PID: $NEW_PID"
sleep 5

echo ""
echo "=== 7. 查看日志 ==="
tail -30 /tmp/next-server.log

echo ""
echo "=== 8. 测试API ==="
curl -s http://localhost:3000/api/auth/me && echo ""
`;

  console.log('📤 执行重建...\n');

  conn.exec(rebuildCmd, (err, stream) => {
    if (err) {
      console.error('❌ 错误:', err);
      conn.end();
      return;
    }

    stream.on('data', (data) => {
      process.stdout.write(data.toString());
    });

    stream.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });

    stream.on('close', (code) => {
      console.log('\n' + '═'.repeat(60));
      console.log(`\n✅ 重建完成! (退出代码: ${code})\n`);
      console.log('访问: http://123.57.28.44:3000\n');
      conn.end();
    });
  });

}).connect({
  host: '123.57.28.44',
  port: 22,
  username: 'root',
  password: 'Zen721ViaNet',
  readyTimeout: 90000
});

conn.on('error', (err) => {
  console.error('❌ 连接错误:', err.message);
  process.exit(1);
});

conn.on('close', () => {
  console.log('📡 连接已关闭\n');
});
