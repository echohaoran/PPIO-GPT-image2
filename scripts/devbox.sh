#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="${DEV_CONFIG_FILE:-$ROOT_DIR/.dev-server.env}"

if [[ -f "$CONFIG_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$CONFIG_FILE"
fi

DEV_HOST="${DEV_HOST:-}"
DEV_USER="${DEV_USER:-root}"
DEV_PORT="${DEV_PORT:-22}"
DEV_PATH="${DEV_PATH:-/opt/PPIO-GPT-image2}"
DEV_GIT_URL="${DEV_GIT_URL:-}"
DEV_SSH_PASS="${DEV_SSH_PASS:-}"
DEV_SYNC_ENV="${DEV_SYNC_ENV:-1}"

usage() {
  cat <<'EOF'
用法: ./scripts/devbox.sh <命令>

命令:
  bootstrap   远端创建目录、clone 项目、同步 .env，并使用 compose 启动
  push        将本地变更同步到开发环境服务器
  pull        将开发环境服务器的变更同步回本地
  deploy      在开发环境服务器执行 compose up -d --build
  status      查看开发环境 compose 服务状态
  logs        查看开发环境 compose 日志
  ssh         登录开发环境服务器

配置:
  复制 .dev-server.env.example 为 .dev-server.env 后填写开发机信息
EOF
}

require_config() {
  if [[ -z "$DEV_HOST" ]]; then
    echo "❌ 缺少 DEV_HOST，请先配置 $CONFIG_FILE"
    exit 1
  fi
}

get_git_url() {
  if [[ -n "$DEV_GIT_URL" ]]; then
    printf '%s\n' "$DEV_GIT_URL"
    return
  fi
  git -C "$ROOT_DIR" remote get-url origin
}

ssh_base() {
  local args=("-p" "$DEV_PORT" "-o" "StrictHostKeyChecking=accept-new")
  if [[ -n "$DEV_SSH_PASS" ]]; then
    sshpass -p "$DEV_SSH_PASS" ssh "${args[@]}" "$DEV_USER@$DEV_HOST" "$@"
  else
    ssh "${args[@]}" "$DEV_USER@$DEV_HOST" "$@"
  fi
}

ssh_shell() {
  local args=("-p" "$DEV_PORT" "-o" "StrictHostKeyChecking=accept-new")
  if [[ -n "$DEV_SSH_PASS" ]]; then
    sshpass -p "$DEV_SSH_PASS" ssh "${args[@]}" "$DEV_USER@$DEV_HOST"
  else
    ssh "${args[@]}" "$DEV_USER@$DEV_HOST"
  fi
}

rsync_base() {
  local ssh_cmd="ssh -p $DEV_PORT -o StrictHostKeyChecking=accept-new"
  local args=(
    -az
    --delete
    --exclude=.git
    --exclude=.DS_Store
    --exclude=node_modules
    --exclude=__pycache__
    --exclude=*.pyc
    --exclude=logs
  )
  if [[ "$DEV_SYNC_ENV" != "1" ]]; then
    args+=(--exclude=.env)
  fi

  if [[ -n "$DEV_SSH_PASS" ]]; then
    sshpass -p "$DEV_SSH_PASS" rsync -e "$ssh_cmd" "${args[@]}" "$@"
  else
    rsync -e "$ssh_cmd" "${args[@]}" "$@"
  fi
}

remote_compose() {
  local remote_dir="$1"
  ssh_base "cd '$remote_dir' && if docker compose version >/dev/null 2>&1; then docker compose $2; elif command -v docker-compose >/dev/null 2>&1; then docker-compose $2; else echo '未找到 Docker Compose'; exit 1; fi"
}

bootstrap() {
  require_config
  local git_url
  git_url="$(get_git_url)"
  echo "==> 远端准备目录"
  ssh_base "mkdir -p '$(dirname "$DEV_PATH")'"

  echo "==> 远端 clone 项目"
  ssh_base "if [[ -d '$DEV_PATH/.git' ]]; then echo '仓库已存在，跳过 clone'; else git clone '$git_url' '$DEV_PATH'; fi"

  if [[ "$DEV_SYNC_ENV" == "1" && -f "$ROOT_DIR/.env" ]]; then
    echo "==> 同步本地 .env 到开发环境服务器"
    rsync_base "$ROOT_DIR/.env" "$DEV_USER@$DEV_HOST:$DEV_PATH/.env"
  fi

  echo "==> 使用 compose 启动开发环境"
  remote_compose "$DEV_PATH" "up -d --build"
}

push_changes() {
  require_config
  echo "==> 同步本地项目到开发环境服务器"
  ssh_base "mkdir -p '$DEV_PATH'"
  rsync_base "$ROOT_DIR/" "$DEV_USER@$DEV_HOST:$DEV_PATH/"
}

pull_changes() {
  require_config
  echo "==> 同步开发环境服务器项目回本地"
  rsync_base "$DEV_USER@$DEV_HOST:$DEV_PATH/" "$ROOT_DIR/"
}

deploy_remote() {
  require_config
  echo "==> 远端 compose 构建并启动"
  remote_compose "$DEV_PATH" "up -d --build"
}

status_remote() {
  require_config
  echo "==> 远端 compose 状态"
  remote_compose "$DEV_PATH" "ps"
}

logs_remote() {
  require_config
  echo "==> 远端 compose 日志"
  remote_compose "$DEV_PATH" "logs --tail=200"
}

case "${1:-help}" in
  bootstrap)
    bootstrap
    ;;
  push)
    push_changes
    ;;
  pull)
    pull_changes
    ;;
  deploy)
    deploy_remote
    ;;
  status)
    status_remote
    ;;
  logs)
    logs_remote
    ;;
  ssh)
    require_config
    ssh_shell
    ;;
  help|--help|-h)
    usage
    ;;
  *)
    echo "❌ 未知命令: $1"
    echo ""
    usage
    exit 1
    ;;
esac
