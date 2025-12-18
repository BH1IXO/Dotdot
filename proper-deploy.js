const { Client } = require('ssh2');

console.log('🚀 部署记忆修复到服务器...\n');

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH连接成功\n');

  const cmd = `
echo "=== 1. 停止当前服务 ==="
pkill -f "next start" || echo "服务未运行"
pkill -f "node.*next.*start" || echo "服务未运行"
sleep 2

echo ""
echo "=== 2. 进入源代码目录并拉取最新代码 ==="
cd /home/PersonalAssitant/personal-assistant
git fetch origin
git reset --hard origin/main
git log -1 --oneline

echo ""
echo "=== 3. 构建项目 ==="
export MEMMACHINE_API_URL=http://localhost:8081
npm run build

echo ""
echo "=== 4. 复制构建文件到部署目录 ==="
cd /home/PersonalAssitant/deploy-package
rm -rf .next/server .next/static .next/BUILD_ID
cp -r /home/PersonalAssitant/personal-assistant/.next/server .next/
cp -r /home/PersonalAssitant/personal-assistant/.next/static .next/
cp /home/PersonalAssitant/personal-assistant/.next/BUILD_ID .next/

echo ""
echo "=== 5. 验证BUILD_ID ==="
cat .next/BUILD_ID

echo ""
echo "=== 6. 启动服务 ==="
cd /home/PersonalAssitant/deploy-package
export MEMMACHINE_API_URL=http://localhost:8081
export PORT=3000
nohup npm start > /tmp/next-server.log 2>&1 &
echo "已启动服务，PID: $!"
sleep 5

echo ""
echo "=== 7. 验证服务状态 ==="
ps aux | grep "next start" | grep -v grep || echo "⚠️  未找到next start进程"
netstat -tlnp | grep :3000 || echo "⚠️  端口3000未监听"

echo ""
echo "=== 8. 测试API ==="
curl -s http://localhost:3000/api/auth/me > /dev/null && echo "✅ API响应正常" || echo "❌ API无响应"

echo ""
echo "=== 9. 检查最新日志 ==="
tail -30 /tmp/next-server.log
`;

  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('❌ 执行错误:', err);
      conn.end();
      return;
    }

    let output = '';
    stream.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });

    stream.stderr.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stderr.write(text);
    });

    stream.on('close', (code) => {
      console.log('\n' + '═'.repeat(60));

      // Extract BUILD_ID
      const buildIdMatch = output.match(/([A-Za-z0-9_-]{21})/);
      const buildId = buildIdMatch ? buildIdMatch[1] : 'unknown';

      if (code === 0 && output.includes('API响应正常')) {
        console.log(`\n✅ 部署成功! (退出代码: ${code})`);
        console.log(`📦 BUILD_ID: ${buildId}`);
        console.log(`\n修复内容:`);
        console.log(`  - 过滤否定回复（"还没有"、"你确实还没有"等）`);
        console.log(`  - 防止记忆污染恶性循环`);
        console.log(`  - 确保真实记忆能被正确检索\n`);
      } else {
        console.log(`\n⚠️  部署可能未完全成功 (退出代码: ${code})`);
        console.log(`📦 BUILD_ID: ${buildId}\n`);
      }

      conn.end();
    });
  });

}).connect({
  host: '123.57.28.44',
  port: 22,
  username: 'root',
  password: 'Zen721ViaNet',
  readyTimeout: 300000 // 5 minutes for build
});

conn.on('error', (err) => {
  console.error('❌ 连接错误:', err.message);
  process.exit(1);
});

conn.on('close', () => {
  console.log('📡 连接已关闭\n');
});
