const { Client } = require('ssh2');

console.log('📋 列出最近的所有记忆...\n');

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH连接成功\n');
  
  const userId = '24676f62-81a7-495a-9db1-477241cad05b';
  const projectId = `todd-assistant-${userId}`;
  
  const cmd = `
echo "=== 获取最近100条episodic记忆 ==="
curl -s http://localhost:8081/api/v2/memories/list -X POST -H "Content-Type: application/json" -d '{
  "org_id": "personal-assistant",
  "project_id": "${projectId}",
  "types": ["episodic"],
  "limit": 100
}' > /tmp/memories.json

echo "总记忆数:"
cat /tmp/memories.json | grep -o '"content"' | wc -l

echo ""
echo "=== 搜索包含'访客'的记忆 ==="
grep -o '"content":"[^"]*访客[^"]*"' /tmp/memories.json | head -5

echo ""
echo "=== 搜索包含'2222'的记忆 ==="
grep -o '"content":"[^"]*2222[^"]*"' /tmp/memories.json | head -5

echo ""
echo "=== 搜索包含'1111'的记忆 ==="
grep -o '"content":"[^"]*1111[^"]*"' /tmp/memories.json | head -5
`;

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
      console.log(`\n✅ 检查完成! (退出代码: ${code})\n`);
      conn.end();
    });
  });

}).connect({
  host: '123.57.28.44',
  port: 22,
  username: 'root',
  password: 'Zen721ViaNet',
  readyTimeout: 60000
});

conn.on('error', (err) => {
  console.error('❌ 连接错误:', err.message);
  process.exit(1);
});

conn.on('close', () => {
  console.log('📡 连接已关闭\n');
});
