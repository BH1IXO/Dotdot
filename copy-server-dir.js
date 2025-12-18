const { Client } = require('ssh2');

console.log('📋 复制server目录...\n');

const conn = new Client();

let step = 0;

function executeStep(desc, cmd, callback) {
  step++;
  console.log(`\n步骤${step}: ${desc}`);
  console.log('─'.repeat(60));

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
      console.log(`✅ 完成 (退出代码: ${code})\n`);
      if (callback) callback();
    });
  });
}

conn.on('ready', () => {
  console.log('✅ SSH连接成功\n');

  executeStep('停止服务',
    'killall -9 node 2>/dev/null ; sleep 3',
    () => {
      executeStep('检查源码server目录',
        'ls -la /home/PersonalAssitant/personal-assistant/.next/server/',
        () => {
          executeStep('复制server目录',
            'cp -rv /home/PersonalAssitant/personal-assistant/.next/server /home/PersonalAssitant/deploy-package/.next/',
            () => {
              executeStep('验证复制结果',
                'ls -la /home/PersonalAssitant/deploy-package/.next/server/ && echo "" && cat /home/PersonalAssitant/deploy-package/.next/server/pages-manifest.json',
                () => {
                  executeStep('启动服务',
                    'cd /home/PersonalAssitant/deploy-package && export MEMMACHINE_API_URL=http://localhost:8081 && nohup node server.js > /tmp/next-server.log 2>&1 & sleep 8',
                    () => {
                      executeStep('查看日志并测试',
                        'tail -30 /tmp/next-server.log && echo "" && curl http://localhost:3000/api/auth/me && echo "" && echo "测试静态文件:" && curl -I http://localhost:3000/_next/static/chunks/8012561c446c89dc.js 2>&1 | head -3',
                        () => {
                          console.log('\n✅ 所有步骤完成\n');
                          conn.end();
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );

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
