const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

console.log('⚡ 快速部署：上传本地构建文件\n');

const conn = new Client();
let sftp;

conn.on('ready', () => {
  console.log('✅ SSH连接成功\n');

  // 步骤1: 停止服务并准备目录
  const prepareCmd = `
echo "=== 1/5 停止服务 ==="
pkill -9 -f "node server.js" || echo "无运行服务"
sleep 2

echo ""
echo "=== 2/5 备份并准备目录 ==="
cd /home/PersonalAssitant
if [ -d "deploy-package" ]; then
  mv deploy-package deploy-package.backup.$(date +%Y%m%d_%H%M%S)
  echo "已备份旧部署"
fi
mkdir -p deploy-package
echo "目录已准备"
`;

  console.log('📦 准备远程环境...\n');

  conn.exec(prepareCmd, (err, stream) => {
    if (err) {
      console.error('❌ 错误:', err);
      conn.end();
      return;
    }

    stream.on('data', (data) => process.stdout.write(data.toString()));
    stream.stderr.on('data', (data) => process.stderr.write(data.toString()));

    stream.on('close', () => {
      console.log('\n✅ 远程环境准备完成\n');
      uploadFiles();
    });
  });

}).connect({
  host: '123.57.28.44',
  port: 22,
  username: 'root',
  password: 'Zen721ViaNet',
  keepaliveInterval: 10000,
  readyTimeout: 120000
});

function uploadFiles() {
  console.log('=== 3/5 上传构建文件 ===\n');

  conn.sftp((err, sftpClient) => {
    if (err) {
      console.error('❌ SFTP错误:', err);
      conn.end();
      return;
    }

    sftp = sftpClient;

    // 打包本地文件
    const { exec } = require('child_process');
    const localDir = 'E:/Personal_Todd/personal-assistant/.next/standalone';
    const tarFile = 'E:/Personal_Todd/personal-assistant/deploy-temp.tar.gz';

    console.log('📦 打包本地文件...');

    exec(`tar -czf "${tarFile}" -C "${localDir}" .`, (err2) => {
      if (err2) {
        console.error('❌ 打包失败:', err2);
        conn.end();
        return;
      }

      const stats = fs.statSync(tarFile);
      console.log(`✅ 打包完成 (${(stats.size / 1024 / 1024).toFixed(2)} MB)\n`);
      console.log('📤 上传到服务器...');

      sftp.fastPut(
        tarFile,
        '/home/PersonalAssitant/deploy-temp.tar.gz',
        {
          step: (transferred, chunk, total) => {
            const percent = ((transferred / total) * 100).toFixed(1);
            process.stdout.write(`\r上传进度: ${percent}% (${(transferred / 1024 / 1024).toFixed(2)}/${(total / 1024 / 1024).toFixed(2)} MB)`);
          }
        },
        (err3) => {
          console.log('\n');
          fs.unlinkSync(tarFile); // 删除本地临时文件

          if (err3) {
            console.error('❌ 上传失败:', err3);
            conn.end();
            return;
          }

          console.log('✅ 上传完成\n');
          sftp.end();
          extractAndStart();
        }
      );
    });
  });
}

function extractAndStart() {
  console.log('=== 4/5 解压并配置 ===\n');

  const envContent = fs.readFileSync('E:/Personal_Todd/personal-assistant/.env', 'utf8');

  const deployCmd = `
echo "解压文件..."
cd /home/PersonalAssitant/deploy-package
tar -xzf ../deploy-temp.tar.gz
rm ../deploy-temp.tar.gz
echo "✅ 解压完成"

echo ""
echo "配置环境变量..."
cat > .env << 'ENV_EOF'
${envContent}
ENV_EOF
echo "✅ .env 已配置"
`;

  conn.exec(deployCmd, (err, stream) => {
    if (err) {
      console.error('❌ 错误:', err);
      conn.end();
      return;
    }

    stream.on('data', (data) => process.stdout.write(data.toString()));
    stream.stderr.on('data', (data) => process.stderr.write(data.toString()));

    stream.on('close', () => {
      console.log('\n✅ 配置完成\n');
      startService();
    });
  });
}

function startService() {
  console.log('=== 5/5 启动服务 ===\n');

  const startCmd = `
cd /home/PersonalAssitant/deploy-package
export MEMMACHINE_API_URL=http://localhost:8081
nohup node server.js > /tmp/next-server.log 2>&1 &
NEW_PID=$!
echo "服务已启动，PID: $NEW_PID"

sleep 5

echo ""
echo "验证服务..."
ps aux | grep "node server.js" | grep -v grep && echo "✅ 进程运行中" || echo "❌ 进程未找到"
curl -s http://localhost:3000/api/auth/me > /dev/null && echo "✅ API 正常" || echo "❌ API 失败"

echo ""
echo "查看日志:"
tail -20 /tmp/next-server.log
`;

  conn.exec(startCmd, (err, stream) => {
    if (err) {
      console.error('❌ 错误:', err);
      conn.end();
      return;
    }

    stream.on('data', (data) => process.stdout.write(data.toString()));
    stream.stderr.on('data', (data) => process.stderr.write(data.toString()));

    stream.on('close', (code) => {
      console.log('\n' + '═'.repeat(80));
      if (code === 0) {
        console.log('\n✅ 部署完成！\n');
        console.log('访问地址: http://123.57.28.44:3000\n');
      } else {
        console.log('\n⚠️ 部署可能有问题，请检查日志\n');
      }
      conn.end();
    });
  });
}

conn.on('error', (err) => {
  console.error('❌ SSH错误:', err.message);
  process.exit(1);
});

conn.on('close', () => {
  console.log('📡 连接已关闭\n');
});
