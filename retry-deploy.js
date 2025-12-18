const { Client } = require('ssh2');
const fs = require('fs');

console.log('🔄 持续重试部署...\n');

const envContent = fs.readFileSync('E:/Personal_Todd/personal-assistant/.env', 'utf8');
let retryCount = 0;
const maxRetries = 30; // 最多尝试30次，每次间隔30秒 = 15分钟

function attemptDeploy() {
  retryCount++;
  console.log(`\n[尝试 ${retryCount}/${maxRetries}] 连接服务器... ${new Date().toLocaleTimeString()}`);

  const conn = new Client();

  const timeout = setTimeout(() => {
    console.log('⏱️  连接超时，30秒后重试...');
    conn.end();

    if (retryCount < maxRetries) {
      setTimeout(attemptDeploy, 30000); // 30秒后重试
    } else {
      console.error('\n❌ 达到最大重试次数，部署失败');
      process.exit(1);
    }
  }, 25000);

  conn.on('ready', () => {
    clearTimeout(timeout);
    console.log('✅ SSH连接成功！开始部署...\n');
    executeDeploy(conn);
  });

  conn.on('error', (err) => {
    clearTimeout(timeout);
    console.log(`⚠️  连接失败: ${err.message}`);

    if (retryCount < maxRetries) {
      setTimeout(attemptDeploy, 30000);
    } else {
      console.error('\n❌ 达到最大重试次数，部署失败');
      process.exit(1);
    }
  });

  conn.connect({
    host: '123.57.28.44',
    port: 22,
    username: 'root',
    password: 'Zen721ViaNet',
    readyTimeout: 20000
  });
}

function executeDeploy(conn) {
  console.log('═'.repeat(80));
  console.log('开始完整部署流程\n');

  let currentStep = 1;

  function executeStep(description, command, callback) {
    const stepTotal = 8;
    const progress = Math.round((currentStep / stepTotal) * 100);

    console.log(`\n${'='.repeat(80)}`);
    console.log(`步骤 ${currentStep}/${stepTotal}: ${description} [进度: ${progress}%]`);
    console.log('='.repeat(80));
    currentStep++;

    conn.exec(command, (err, stream) => {
      if (err) {
        console.error('❌ 执行错误:', err);
        conn.end();
        process.exit(1);
        return;
      }

      let output = '';
      stream.on('data', (data) => {
        const text = data.toString();
        output += text;
        process.stdout.write(text);
      });

      stream.stderr.on('data', (data) => {
        process.stderr.write(data.toString());
      });

      stream.on('close', (code) => {
        console.log(`\n✅ 步骤完成 (退出代码: ${code})\n`);
        if (callback) callback(code, output);
      });
    });
  }

  // 步骤1: 强制清理所有进程
  executeStep('强制清理所有Node和npm进程',
    'pkill -9 -f "node" ; pkill -9 -f "npm" ; sleep 3 ; ps aux | grep -E "node|npm" | grep -v grep || echo "✅ 进程已清理"',
    () => {
      // 步骤2: 清理旧目录并克隆代码
      executeStep('清理旧代码并从Gitee克隆最新代码',
        'cd /home/PersonalAssitant && rm -rf personal-assistant && git clone https://gitee.com/toddliudada/dot.git personal-assistant && ls -la personal-assistant/ | head -10',
        () => {
          // 步骤3: 配置环境变量
          const envCmd = `cd /home/PersonalAssitant/personal-assistant && cat > .env << 'ENV_EOF'
${envContent}
ENV_EOF
echo ".env 已配置" && ls -la .env`;

          executeStep('配置环境变量', envCmd, () => {
            // 步骤4: 安装依赖
            executeStep('安装项目依赖（需要3-5分钟）',
              'cd /home/PersonalAssitant/personal-assistant && npm install 2>&1 | tail -20',
              () => {
                // 步骤5: 构建项目
                executeStep('构建Next.js项目（需要2-3分钟）',
                  'cd /home/PersonalAssitant/personal-assistant && npm run build 2>&1 | tail -30',
                  () => {
                    // 步骤6: 准备部署目录
                    executeStep('准备部署目录',
                      'cd /home/PersonalAssitant && rm -rf deploy-package && mkdir -p deploy-package && cp -r personal-assistant/.next deploy-package/ && cp personal-assistant/.env deploy-package/.next/standalone/ && echo "✅ 部署目录已准备" && ls -la deploy-package/',
                      () => {
                        // 步骤7: 启动服务
                        executeStep('启动Next.js服务',
                          'cd /home/PersonalAssitant/deploy-package/.next/standalone && export MEMMACHINE_API_URL=http://localhost:8081 && nohup node server.js > /tmp/next-server.log 2>&1 & echo "PID: $!" && sleep 5',
                          () => {
                            // 步骤8: 验证服务
                            executeStep('验证服务状态',
                              'ps aux | grep "node server.js" | grep -v grep && echo "" && curl -s http://localhost:3000/api/auth/me > /dev/null && echo "✅ 服务运行正常" || (echo "❌ 服务异常，查看日志:" && tail -30 /tmp/next-server.log)',
                              (code) => {
                                console.log('\n' + '═'.repeat(80));
                                if (code === 0) {
                                  console.log('\n🎉 部署完成！服务正常运行\n');
                                  console.log('访问地址: http://123.57.28.44:3000\n');
                                } else {
                                  console.log('\n⚠️ 部署完成但服务可能有问题，请查看日志\n');
                                }
                                conn.end();
                                process.exit(0);
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
          });
        }
      );
    }
  );
}

// 开始第一次尝试
attemptDeploy();
