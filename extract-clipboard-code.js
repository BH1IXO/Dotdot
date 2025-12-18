const { Client } = require('ssh2');

console.log('📤 提取clipboard完整代码...\n');

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH连接成功\n');

  const cmd = `
echo "=== 提取包含clipboard的完整代码段 ==="
# 使用node读取文件并提取clipboard相关代码
node -e "
const fs = require('fs');
const content = fs.readFileSync('/home/PersonalAssitant/deploy-package/.next/static/chunks/735396ae49decbe1.js', 'utf8');

// 查找包含clipboard的位置
const clipboardIndex = content.indexOf('navigator.clipboard');
if (clipboardIndex > -1) {
  // 提取前后500个字符
  const start = Math.max(0, clipboardIndex - 300);
  const end = Math.min(content.length, clipboardIndex + 700);
  const snippet = content.substring(start, end);

  console.log('找到clipboard代码位置:', clipboardIndex);
  console.log('');
  console.log('代码片段:');
  console.log('----------------------------------------');
  console.log(snippet);
  console.log('----------------------------------------');
}

// 查找execCommand
const execIndex = content.indexOf('execCommand');
if (execIndex > -1) {
  const start = Math.max(0, execIndex - 200);
  const end = Math.min(content.length, execIndex + 300);
  const snippet = content.substring(start, end);

  console.log('');
  console.log('');
  console.log('找到execCommand代码位置:', execIndex);
  console.log('');
  console.log('代码片段:');
  console.log('----------------------------------------');
  console.log(snippet);
  console.log('----------------------------------------');
}
"
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
