const { Client } = require('ssh2');

console.log('🔍 深度检查剪贴板代码部署...\n');

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH连接成功\n');

  const cmd = `
echo "==================== 第1步：检查源代码 ===================="
echo "本地源代码中的 copyLink 和 fallbackCopy 函数："
grep -A 10 'const copyLink' /home/PersonalAssitant/personal-assistant/app/components/GuestLinksView.tsx | head -15
echo ""
grep -A 10 'const fallbackCopy' /home/PersonalAssitant/personal-assistant/app/components/GuestLinksView.tsx | head -15

echo ""
echo "==================== 第2步：检查编译后的代码 ===================="
echo "在所有 chunks 中搜索 fallbackCopy 或 fallback...Copy 模式："
for file in /home/PersonalAssitant/deploy-package/.next/static/chunks/*.js; do
  if grep -q 'fallback.*[Cc]opy' "\$file"; then
    echo "✅ 找到: \$(basename \$file)"
    grep -o 'fallback[A-Za-z]*' "\$file" | sort -u | head -5
  fi
done

echo ""
echo "==================== 第3步：搜索 execCommand ===================="
echo "搜索包含 execCommand('copy') 的文件："
grep -l "execCommand.*['\"]copy['\"]" /home/PersonalAssitant/deploy-package/.next/static/chunks/*.js 2>/dev/null

echo ""
echo "在这些文件中查找上下文（前后5行）："
for file in \$(grep -l "execCommand.*['\"]copy['\"]" /home/PersonalAssitant/deploy-package/.next/static/chunks/*.js 2>/dev/null | head -2); do
  echo ""
  echo "=== 文件: \$(basename \$file) ==="
  grep -B 3 -A 3 "execCommand.*['\"]copy['\"]" "\$file" | head -20
done

echo ""
echo "==================== 第4步：检查 BUILD_ID 和构建时间 ===================="
echo "源代码 BUILD_ID:"
cat /home/PersonalAssitant/personal-assistant/.next/BUILD_ID 2>/dev/null || echo "源代码未构建"
echo ""
echo "部署目录 BUILD_ID:"
cat /home/PersonalAssitant/deploy-package/.next/BUILD_ID
echo ""
echo "部署文件时间戳（最近5个）:"
ls -lht /home/PersonalAssitant/deploy-package/.next/static/chunks/*.js | head -5

echo ""
echo "==================== 第5步：对比 Git 状态 ===================="
cd /home/PersonalAssitant/personal-assistant
echo "当前 Git commit:"
git log -1 --oneline
echo ""
echo "GuestLinksView.tsx 最后修改："
git log -1 --format="%h %ai %s" -- app/components/GuestLinksView.tsx

echo ""
echo "==================== 第6步：测试实际访问 ===================="
echo "测试访客链接页面："
curl -s http://localhost:3000/guest-links 2>&1 | grep -o '<script[^>]*src="[^"]*"' | head -10

echo ""
echo "==================== 分析结果 ===================="
if grep -q "execCommand.*['\"]copy['\"]" /home/PersonalAssitant/deploy-package/.next/static/chunks/*.js 2>/dev/null; then
  echo "✅ fallback 复制代码已部署"
else
  echo "❌ fallback 复制代码未找到"
fi
`;

  console.log('📤 执行深度检查...\n');

  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('❌ 错误:', err);
      conn.end();
      return;
    }

    let output = '';
    stream.on('data', (data) => {
      const text = data.toString();
      process.stdout.write(text);
      output += text;
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
  readyTimeout: 90000
});

conn.on('error', (err) => {
  console.error('❌ 连接错误:', err.message);
  process.exit(1);
});

conn.on('close', () => {
  console.log('📡 连接已关闭\n');
});
