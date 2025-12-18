const { Client } = require('ssh2');

console.log('🔍 提取完整的copyLink函数逻辑...\n');

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH连接成功\n');

  const cmd = `
echo "=== 提取部署代码中的完整copyLink逻辑 ==="
node -e "
const fs = require('fs');
const content = fs.readFileSync('/home/PersonalAssitant/deploy-package/.next/static/chunks/735396ae49decbe1.js', 'utf8');

// 查找onClick处理函数，包含linkCode的
const onClickRegex = /onClick:\(\)=>\{[^}]*linkCode[^}]*\}/g;
const matches = content.match(onClickRegex);

if (matches) {
  console.log('找到 onClick 复制按钮的代码:');
  console.log('');
  matches.slice(0, 2).forEach((match, i) => {
    console.log(\\\`匹配 \\\${i+1}:\\\`);
    console.log(match.replace(/},/g, '},\\\\n'));
    console.log('');
  });
}

// 查找完整的复制逻辑（包含window.location.origin）
const copyLogicIndex = content.indexOf('window.location.origin}/guest');
if (copyLogicIndex > -1) {
  const start = Math.max(0, copyLogicIndex - 500);
  const end = Math.min(content.length, copyLogicIndex + 500);
  const snippet = content.substring(start, end);

  console.log('');
  console.log('完整的复制逻辑上下文:');
  console.log('========================================');
  console.log(snippet);
  console.log('========================================');
}
"

echo ""
echo "=== 对比：本地开发环境的BUILD_ID ==="
cat /home/PersonalAssitant/personal-assistant/.next/BUILD_ID 2>/dev/null || echo "本地未构建"

echo ""
echo "=== 对比：部署环境的BUILD_ID ==="
cat /home/PersonalAssitant/deploy-package/.next/BUILD_ID
`;

  console.log('📤 执行提取...\n');

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
      console.log(`\n✅ 提取完成!\n`);
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
