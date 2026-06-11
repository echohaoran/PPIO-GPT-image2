#!/bin/bash
set -e

PORT=${PORT:-8765}

echo "🚀 成长中心菜品图生成 - 部署脚本"
echo ""

case "${1:-help}" in
  local)
    echo "📦 启动本地服务器..."
    python3 server.py ${PORT}
    ;;
  docker)
    echo "🐳 构建并启动 Docker 容器..."
    docker-compose up -d --build
    echo "✅ 已启动: http://localhost:${PORT}"
    ;;
  stop)
    echo "🛑 停止 Docker 容器..."
    docker-compose down
    ;;
  build)
    echo "🔨 构建 Docker 镜像..."
    docker-compose build
    ;;
  nginx)
    echo "🔧 启动 Nginx 模式..."
    docker run -d \
      --name dish-image-nginx \
      -p ${PORT}:80 \
      -v "$(pwd):/usr/share/nginx/html:ro" \
      -v "$(pwd)/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
      nginx:alpine
    echo "✅ 已启动: http://localhost:${PORT}"
    ;;
  help|*)
    echo "用法: ./deploy.sh [命令]"
    echo ""
    echo "命令:"
    echo "  local    启动本地 Python 服务器"
    echo "  docker   构建并启动 Docker 容器"
    echo "  stop     停止 Docker 容器"
    echo "  build    仅构建 Docker 镜像"
    echo "  nginx    使用 Nginx 启动"
    echo ""
    echo "环境变量:"
    echo "  PORT     监听端口 (默认 8765)"
    ;;
esac
