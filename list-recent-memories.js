const { Client } = require('ssh2');

console.log('📋 列出最近的所有记忆...\n');

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH连接成功\n');
  
  const userId = '24676f62-81a7-495a-9db1-477241cad05b';
  const projectId = `todd-assistant-${userId}`;
  
  const cmd = `
echo "=== 列出最近30条episodic记忆 ==="
curl -s http://localhost:8081/api/v2/memories/list -X POST -H "Content-Type: application/json" -d '{
  "org_id": "personal-assistant",
  "project_id": "${projectId}",
  "types": ["episodic"],
  "limit": 30
}' | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('status') == 0:
    episodes = data.get('content', {}).get('episodic_memory', {}).get('long_term_memory', {}).get('episodes', [])
    episodes.extend(data.get('content', {}).get('episodic_memory', {}).get('short_term_memory', {}).get('episodes', []))
    print(f'找到 {len(episodes)} 条记忆\n')
    for i, ep in enumerate(episodes[:30]):
        content = ep.get('content', '')[:100]
        created = ep.get('created_at', '')
        print(f'[{i+1}] {created}')
        print(f'    {content}...')
        print()
else:
    print('Error:', data)
" 2>&1

echo ""
echo "=== 直接搜索包含'访客'的记忆（使用grep） ==="
curl -s http://localhost:8081/api/v2/memories/list -X POST -H "Content-Type: application/json" -d '{
  "org_id": "personal-assistant",
  "project_id": "${projectId}",
  "types": ["episodic"],
  "limit": 100
}' | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('status') == 0:
    episodes = data.get('content', {}).get('episodic_memory', {}).get('long_term_memory', {}).get('episodes', [])
    episodes.extend(data.get('content', {}).get('episodic_memory', {}).get('short_term_memory', {}).get('episodes', []))
    guest_episodes = [ep for ep in episodes if '访客' in ep.get('content', '') or '2222' in ep.get('content', '') or '1111' in ep.get('content', '')]
    print(f'包含访客关键词的记忆: {len(guest_episodes)} 条\n')
    for i, ep in enumerate(guest_episodes):
        content = ep.get('content', '')[:150]
        created = ep.get('created_at', '')
        producer = ep.get('producer_id', '')
        print(f'[{i+1}] 创建时间: {created}')
        print(f'    Producer: {producer}')
        print(f'    内容: {content}...')
        print()
else:
    print('Error:', data)
" 2>&1
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
