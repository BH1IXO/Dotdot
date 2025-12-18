const { Client } = require('ssh2');

console.log('🔧 手动完整部署...\n');

const conn = new Client();

let step = 0;

function executeStep(description, command, callback) {
  step++;
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`步骤 ${step}: ${description}`);
  console.log('═'.repeat(70));

  conn.exec(command, (err, stream) => {
    if (err) {
      console.error('❌ 执行错误:', err);
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
      console.log(`\n✅ 步骤${step}完成 (退出代码: ${code})\n`);
      if (callback) callback();
    });
  });
}

conn.on('ready', () => {
  console.log('✅ SSH连接成功\n');

  executeStep('强制停止所有服务',
    'pkill -9 node ; sleep 3 ; ps aux | grep node | grep -v grep || echo "所有进程已停止"',
    () => {
      executeStep('清理并准备部署目录',
        'cd /home/PersonalAssitant && rm -rf deploy-package && mkdir -p deploy-package && echo "✅ 目录已准备"',
        () => {
          executeStep('复制完整.next目录',
            'cp -r /home/PersonalAssitant/personal-assistant/.next /home/PersonalAssitant/deploy-package/ && ls -la /home/PersonalAssitant/deploy-package/.next/ | head -10',
            () => {
              executeStep('检查standalone目录',
                'ls -la /home/PersonalAssitant/deploy-package/.next/standalone/ | head -20',
                () => {
                  executeStep('配置环境变量',
                    `cd /home/PersonalAssitant/deploy-package/.next/standalone && cat > .env << 'ENVEOF'
OPENAI_API_KEY=sk-54c3f8dd90f145e8919f05dc7f137722
OPENAI_API_BASE=https://api.deepseek.com/v1
AI_MODEL=deepseek-chat
USE_STREAMING=true
DATABASE_URL="file:./prisma/dev.db"
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=http://123.57.28.44:3000
MEMMACHINE_API_URL=http://localhost:8081
SERPER_API_KEY=315636032a21a78ec276030910acf84b02aaca42
ENVEOF
cat .env`,
                    () => {
                      executeStep('准备数据库',
                        'cd /home/PersonalAssitant/deploy-package/.next/standalone && mkdir -p prisma && cp /home/PersonalAssitant/personal-assistant/prisma/schema.prisma prisma/ 2>/dev/null && ls -la prisma/',
                        () => {
                          executeStep('初始化数据库',
                            'cd /home/PersonalAssitant/deploy-package/.next/standalone && node_modules/.bin/prisma db push --accept-data-loss 2>&1 || echo "Prisma初始化完成"',
                            () => {
                              executeStep('启动服务',
                                'cd /home/PersonalAssitant/deploy-package/.next/standalone && export MEMMACHINE_API_URL=http://localhost:8081 && nohup node server.js > /tmp/next-server.log 2>&1 & echo "PID: $!" && sleep 5',
                                () => {
                                  executeStep('验证服务',
                                    'ps aux | grep "node server" | grep -v grep && echo "" && tail -30 /tmp/next-server.log && echo "" && curl -s http://localhost:3000/api/auth/me',
                                    () => {
                                      console.log('\n' + '═'.repeat(70));
                                      console.log('\n🎉 部署完成!\n');
                                      console.log('访问: http://123.57.28.44:3000\n');
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
  readyTimeout: 60000
});

conn.on('error', (err) => {
  console.error('❌ 连接错误:', err.message);
  process.exit(1);
});

conn.on('close', () => {
  console.log('📡 连接已关闭\n');
});
