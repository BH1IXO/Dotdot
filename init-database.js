const { Client } = require('ssh2');

console.log('🗄️ 初始化数据库...\n');

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH连接成功\n');

  const cmd = `
echo "=== 1. 检查数据库配置 ==="
cd /home/PersonalAssitant/deploy-package
cat .env | grep DATABASE_URL

echo ""
echo "=== 2. 创建prisma目录 ==="
mkdir -p prisma
ls -la prisma/

echo ""
echo "=== 3. 复制schema ==="
cp /home/PersonalAssitant/personal-assistant/prisma/schema.prisma prisma/
cat prisma/schema.prisma | head -20

echo ""
echo "=== 4. 检查Prisma CLI ==="
which prisma || echo "需要全局安装prisma"
ls -la node_modules/.bin/prisma 2>/dev/null || echo "需要本地安装prisma"

echo ""
echo "=== 5. 生成Prisma Client ==="
npx prisma generate 2>&1 | tail -10

echo ""
echo "=== 6. 推送数据库schema ==="
npx prisma db push --accept-data-loss 2>&1 | tail -20

echo ""
echo "=== 7. 验证数据库文件 ==="
ls -lh prisma/*.db 2>/dev/null || echo "数据库文件不存在"

echo ""
echo "=== 8. 重启服务 ==="
killall -9 node 2>/dev/null
sleep 2
export MEMMACHINE_API_URL=http://localhost:8081
nohup node server.js > /tmp/next-server.log 2>&1 &
echo "服务已重启"
sleep 5

echo ""
echo "=== 9. 测试API ==="
curl -s http://localhost:3000/api/auth/me
`;

  console.log('📤 执行初始化...\n');

  conn.exec(cmd, (err, stream) => {
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
      console.log(`\n✅ 初始化完成! (退出代码: ${code})\n`);
      console.log('请刷新浏览器测试: http://123.57.28.44:3000\n');
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
