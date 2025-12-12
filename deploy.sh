#!/bin/bash
# ========================================
# 个人AI助理 - 一键部署脚本
# ========================================

set -e  # 遇到错误立即退出

echo "================================================"
echo "  个人AI助理 - 生产环境部署"
echo "================================================"
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: 未安装 Docker"
    echo "请先安装 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# 检查 Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ 错误: 未安装 Docker Compose"
    echo "请先安装 Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✓ Docker 已安装"
echo "✓ Docker Compose 已安装"
echo ""

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  未找到 .env 文件"
    echo "正在从模板创建..."

    if [ -f .env.production.example ]; then
        cp .env.production.example .env
        echo "✓ 已创建 .env 文件"
        echo ""
        echo "⚠️  请编辑 .env 文件，填写必需的配置:"
        echo "   - OPENAI_API_KEY (DeepSeek API Key)"
        echo "   - JWT_SECRET (随机密钥)"
        echo "   - 数据库密码等"
        echo ""
        read -p "配置完成后按回车继续..."
    else
        echo "❌ 错误: 未找到 .env.production.example"
        exit 1
    fi
fi

echo "✓ 配置文件检查完成"
echo ""

# 创建数据目录
echo "创建数据目录..."
mkdir -p data
mkdir -p public/uploads
echo "✓ 数据目录已创建"
echo ""

# 构建镜像
echo "构建 Docker 镜像..."
docker-compose -f docker-compose.prod.yml build
echo "✓ 镜像构建完成"
echo ""

# 启动服务
echo "启动服务..."
docker-compose -f docker-compose.prod.yml up -d
echo "✓ 服务启动成功"
echo ""

# 等待服务就绪
echo "等待服务就绪..."
sleep 10

# 检查服务状态
echo ""
echo "服务状态:"
docker-compose -f docker-compose.prod.yml ps
echo ""

# 显示日志
echo "最近的日志:"
docker-compose -f docker-compose.prod.yml logs --tail=20
echo ""

# 完成
echo "================================================"
echo "  ✓ 部署完成!"
echo "================================================"
echo ""
echo "访问地址: http://localhost:3000"
echo ""
echo "常用命令:"
echo "  查看日志: docker-compose -f docker-compose.prod.yml logs -f"
echo "  停止服务: docker-compose -f docker-compose.prod.yml down"
echo "  重启服务: docker-compose -f docker-compose.prod.yml restart"
echo "  查看状态: docker-compose -f docker-compose.prod.yml ps"
echo ""
echo "数据位置:"
echo "  SQLite 数据库: ./data/prod.db"
echo "  上传文件: ./public/uploads"
echo ""
echo "备份建议:"
echo "  定期备份 ./data 和 ./public/uploads 目录"
echo ""
