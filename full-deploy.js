const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

console.log('🚀 完整部署：本地构建 → 远程服务器\n');

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH连接成功\n');

  const deployScript = `
echo "=== 1. 停止当前服务 ==="
pkill -9 -f "node server.js"
sleep 2

echo ""
echo "=== 2. 备份当前部署 ==="
cd /home/PersonalAssitant
if [ -d "deploy-package" ]; then
  mv deploy-package deploy-package.backup.$(date +%Y%m%d_%H%M%S)
  echo "已备份"
fi

echo ""
echo "=== 3. 创建新部署目录 ==="
mkdir -p deploy-package/.next/standalone
mkdir -p deploy-package/.next/static
mkdir -p deploy-package/public

echo ""
echo "=== 4. 准备接收文件 ==="
echo "目录已准备好"
cd /home/PersonalAssitant/deploy-package
`;

  console.log('📤 执行远程准备...\n');

  conn.exec(deployScript, (err, stream) => {
    if (err) {
      console.error('❌ 执行错误:', err);
      conn.end();
      return;
    }

    stream.on('data', (data) => {
      process.stdout.write(data.toString());
    });

    stream.on('close', (code) => {
      console.log('\n✅ 远程准备完成\n');

      // 现在上传文件
      uploadFiles(conn);
    });
  });

}).connect({
  host: '123.57.28.44',
  port: 22,
  username: 'root',
  password: 'Zen721ViaNet',
  keepaliveInterval: 10000,
  readyTimeout: 60000
});

function uploadFiles(conn) {
  console.log('📦 开始上传文件...\n');

  conn.sftp((err, sftp) => {
    if (err) {
      console.error('❌ SFTP错误:', err);
      conn.end();
      return;
    }

    const localBase = 'E:/Personal_Todd/personal-assistant/.next';
    const remoteBase = '/home/PersonalAssitant/deploy-package/.next';

    // 上传关键目录
    const uploads = [
      {
        local: path.join(localBase, 'standalone'),
        remote: path.join(remoteBase, 'standalone'),
        desc: 'standalone 目录'
      }
    ];

    console.log('正在上传 standalone 目录（这可能需要几分钟）...\n');

    // 使用 rsync 方式更快
    const rsyncCmd = `
echo "使用 tar 打包并传输..."
cd "${localBase}" && tar czf - standalone | ssh -o StrictHostKeyChecking=no root@123.57.28.44 "cd ${remoteBase} && tar xzf -"
`;

    // 改用直接 tar + ssh 传输
    conn.exec(`
echo "=== 准备接收 standalone 打包 ==="
cd /home/PersonalAssitant/deploy-package/.next
echo "准备完成"
    `, (err2, stream2) => {
      if (err2) {
        console.error('❌ 错误:', err2);
        conn.end();
        return;
      }

      stream2.on('close', () => {
        console.log('✅ 目录准备完成\n');
        console.log('📤 正在传输文件（使用 tar 打包）...\n');

        // 使用本地 tar 打包然后上传
        const { exec } = require('child_process');

        exec(`cd "E:/Personal_Todd/personal-assistant/.next" && tar czf standalone.tar.gz standalone`, (err3, stdout3, stderr3) => {
          if (err3) {
            console.error('❌ 打包失败:', err3);
            console.log('尝试直接复制文件...');
            copyFilesDirectly(sftp, conn);
            return;
          }

          console.log('✅ 本地打包完成\n');
          console.log('📤 上传打包文件...\n');

          const localTar = 'E:/Personal_Todd/personal-assistant/.next/standalone.tar.gz';
          const remoteTar = '/home/PersonalAssitant/deploy-package/standalone.tar.gz';

          sftp.fastPut(localTar, remoteTar, (err4) => {
            if (err4) {
              console.error('❌ 上传失败:', err4);
              copyFilesDirectly(sftp, conn);
              return;
            }

            console.log('✅ 上传完成\n');
            console.log('📦 解压文件...\n');

            conn.exec(`
cd /home/PersonalAssitant/deploy-package
tar xzf standalone.tar.gz -C .next/
rm standalone.tar.gz
echo "解压完成"
            `, (err5, stream5) => {
              if (err5) {
                console.error('❌ 解压错误:', err5);
                conn.end();
                return;
              }

              stream5.on('close', () => {
                finishDeployment(conn);
              });
            });
          });
        });
      });
    });
  });
}

function copyFilesDirectly(sftp, conn) {
  console.log('📋 使用直接文件复制方式...\n');

  // 复制关键文件
  const keyFile = 'E:/Personal_Todd/personal-assistant/.next/server/app/api/chat/route.js';
  const remoteFile = '/home/PersonalAssitant/deploy-package/.next/standalone/.next/server/app/api/chat/route.js';

  conn.exec('mkdir -p /home/PersonalAssitant/deploy-package/.next/standalone/.next/server/app/api/chat', (err, stream) => {
    stream.on('close', () => {
      sftp.fastPut(keyFile, remoteFile, (err2) => {
        if (err2) {
          console.error('❌ 复制失败:', err2);
          conn.end();
          return;
        }

        console.log('✅ 关键文件已复制\n');
        finishDeployment(conn);
      });
    });
  });
}

function finishDeployment(conn) {
  console.log('🔧 完成部署...\n');

  const finishScript = `
echo "=== 复制 .env 文件 ==="
cp /home/PersonalAssitant/deploy-package.backup.*/\.next/standalone/.env /home/PersonalAssitant/deploy-package/.next/standalone/ 2>/dev/null || echo "警告: 未找到 .env"

echo ""
echo "=== 复制 public 和 static 文件 ==="
cp -r /home/PersonalAssitant/deploy-package.backup.*/public /home/PersonalAssitant/deploy-package/ 2>/dev/null || echo "No public"
cp -r /home/PersonalAssitant/deploy-package.backup.*/\.next/static /home/PersonalAssitant/deploy-package/.next/ 2>/dev/null || echo "No static"

echo ""
echo "=== 启动服务 ==="
cd /home/PersonalAssitant/deploy-package/.next/standalone
export MEMMACHINE_API_URL=http://localhost:8081
nohup node server.js > /tmp/next-server.log 2>&1 &
NEW_PID=$!
echo "服务已启动，PID: $NEW_PID"

sleep 5

echo ""
echo "=== 验证服务 ==="
curl -s http://localhost:3000/api/auth/me > /dev/null && echo "✅ 服务运行正常" || echo "❌ 服务启动失败"

echo ""
echo "=== 查看日志 ==="
tail -20 /tmp/next-server.log
`;

  conn.exec(finishScript, (err, stream) => {
    if (err) {
      console.error('❌ 完成错误:', err);
      conn.end();
      return;
    }

    stream.on('data', (data) => {
      process.stdout.write(data.toString());
    });

    stream.on('close', (code) => {
      console.log('\n═'.repeat(80));
      console.log('\n✅ 部署完成!\n');
      conn.end();
    });
  });
}

conn.on('error', (err) => {
  console.error('❌ SSH连接错误:', err.message);
  process.exit(1);
});

conn.on('close', () => {
  console.log('\n📡 连接已关闭\n');
});
