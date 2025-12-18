#!/bin/bash
# 上传到服务器脚本

echo "📤 上传部署包到服务器..."
echo "请输入服务器IP地址:"
read SERVER_IP

echo "请输入服务器用户名 (默认: root):"
read SERVER_USER
SERVER_USER=${SERVER_USER:-root}

# 压缩部署包
echo "📦 压缩部署包..."
tar -czf deploy-package.tar.gz deploy-package/

# 上传到服务器
echo "📤 上传到服务器..."
scp deploy-package.tar.gz $SERVER_USER@$SERVER_IP:~/

# 在服务器上解压并部署
echo "🚀 在服务器上执行部署..."
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
cd ~
tar -xzf deploy-package.tar.gz
cd deploy-package
bash deploy-server.sh
ENDSSH

echo "✅ 部署完成!"
