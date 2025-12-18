const { Client } = require('ssh2');

console.log('🔧 重新初始化数据库表结构...\n');

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH连接成功\n');

  const cmd = `
cd /home/PersonalAssitant/deploy-package

echo "=== 1. 删除旧数据库 ==="
rm -f prisma/dev.db prisma/dev.db-journal
echo "✅ 已清理"

echo ""
echo "=== 2. 安装正确版本的Prisma ==="
npm install --force prisma@5.22.0 @prisma/client@5.22.0 2>&1 | tail -5

echo ""
echo "=== 3. 推送数据库schema ==="
npx prisma db push --accept-data-loss --force-reset 2>&1

echo ""
echo "=== 4. 验证数据库文件 ==="
ls -lh prisma/dev.db

echo ""
echo "=== 5. 重启服务 ==="
fuser -k 3000/tcp 2>/dev/null
killall -9 node 2>/dev/null
sleep 3
export MEMMACHINE_API_URL=http://localhost:8081
nohup node server.js > /tmp/next-server.log 2>&1 &
echo "服务已启动"
sleep 5

echo ""
echo "=== 6. 测试注册API ==="
curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"123456","name":"Test User"}' 2>&1
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
      console.log('现在可以注册新账号了: http://123.57.28.44:3000\n');
      conn.end();
    });
  });

}).connect({
  host: '123.57.28.44',
  port: 22,
  username: 'root',
  password: 'Zen721ViaNet',
  readyTimeout: 180000
});

conn.on('error', (err) => {
  console.error('❌ 连接错误:', err.message);
  process.exit(1);
});

conn.on('close', () => {
  console.log('📡 连接已关闭\n');
});
