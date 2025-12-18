const { Client } = require('ssh2');

console.log('🔍 检查包含clipboard代码的chunks...\n');

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH连接成功\n');

  const cmd = `
echo "=== 检查包含 '链接已复制' 的chunks ==="
echo ""
echo "文件1: 735396ae49decbe1.js"
echo "文件大小:"
ls -lh /home/PersonalAssitant/deploy-package/.next/static/chunks/735396ae49decbe1.js | awk '{print $5}'

echo ""
echo "搜索关键代码片段:"
echo "- 搜索 'navigator.clipboard':"
grep -o 'navigator\.clipboard[^,;)]*' /home/PersonalAssitant/deploy-package/.next/static/chunks/735396ae49decbe1.js | head -3

echo ""
echo "- 搜索 'execCommand':"
grep -o 'execCommand[^,;)]*' /home/PersonalAssitant/deploy-package/.next/static/chunks/735396ae49decbe1.js | head -3

echo ""
echo "- 搜索 '链接已复制':"
grep -o '链接已复制[^"'"'"']*' /home/PersonalAssitant/deploy-package/.next/static/chunks/735396ae49decbe1.js | head -5

echo ""
echo "- 检查是否有 fallback 相关代码:"
grep -i 'fallback' /home/PersonalAssitant/deploy-package/.next/static/chunks/735396ae49decbe1.js | wc -l

echo ""
echo "=== 查找实际的copyLink函数 ==="
echo "在735396ae49decbe1.js中查找copyLink相关代码（前50个字符）:"
strings /home/PersonalAssitant/deploy-package/.next/static/chunks/735396ae49decbe1.js | grep -i 'copylink\|copy.*link' | head -5

echo ""
echo "=== 检查文件2: ff60f7bb084b6600.js ==="
echo "文件大小:"
ls -lh /home/PersonalAssitant/deploy-package/.next/static/chunks/ff60f7bb084b6600.js | awk '{print $5}'

echo ""
echo "包含的关键字:"
grep -o 'navigator\.clipboard\|链接已复制\|execCommand' /home/PersonalAssitant/deploy-package/.next/static/chunks/ff60f7bb084b6600.js | sort -u

echo ""
echo "=== 查找GuestLinksView组件位置 ==="
echo "搜索 'GuestLinksView' 或 'guest-links':"
grep -l 'GuestLinksView\|访客链接管理' /home/PersonalAssitant/deploy-package/.next/static/chunks/*.js 2>/dev/null

echo ""
echo "=== 检查页面路由 ==="
find /home/PersonalAssitant/deploy-package/.next -name "*guest*" -type f | head -10

echo ""
echo "=== 完整性检查 ==="
echo "在735396ae49decbe1.js中提取包含clipboard的完整语句（150字符）:"
grep -o '.\{0,150\}navigator\.clipboard.\{0,150\}' /home/PersonalAssitant/deploy-package/.next/static/chunks/735396ae49decbe1.js | head -2
`;

  console.log('📤 执行检查...\n');

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
      console.log(`\n✅ 检查完成!\n`);
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
