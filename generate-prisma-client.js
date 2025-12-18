const { Client } = require('ssh2');

console.log('🔧 生成 Prisma Client...\n');

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH连接成功\n');

  const fixCmd = `
cd /home/PersonalAssitant/deploy-package/.next/standalone

echo "=== 1. 生成 Prisma Client ==="
npx prisma generate 2>&1 | tail -20

echo ""
echo "=== 2. 验证安装 ==="
ls -la node_modules/@prisma/client/ | head -10

echo ""
echo "=== 3. 推送数据库模式 ==="
npx prisma db push 2>&1 | tail -10

echo ""
echo "=== 4. 重启服务 ==="
pkill -9 -f "node server.js"
sleep 2
export MEMMACHINE_API_URL=http://localhost:8081
nohup node server.js > /tmp/next-server.log 2>&1 &
NEW_PID=$!
echo "✅ 服务已重启，PID: $NEW_PID"
sleep 5

echo ""
echo "=== 5. 查看启动日志 ==="
tail -30 /tmp/next-server.log

echo ""
echo "=== 6. 测试API ==="
curl -s http://localhost:3000/api/auth/me && echo ""
`;

  console.log('📤 执行修复...\n');

  conn.exec(fixCmd, (err, stream) => {
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
      console.log(`\n✅ 完成! (退出代码: ${code})\n`);
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
