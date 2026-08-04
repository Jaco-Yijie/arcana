#!/usr/bin/env bash
# Arcana —— 服务器端 git pull 部署
#
# 在**本机**运行：
#   ./deploy/deploy.sh <服务器IP>
#
# 与 rsync 版的区别：代码由服务器自己 `git pull`，本机只负责触发。
# 好处是服务器上的代码永远和某个 commit 严格对应，出问题能 `git log` 查到底是哪一版。
#
# 前提：服务器上已经 clone 过一次（见 deploy/README 或 docs/v2/13-deploy.md）。
set -euo pipefail

HOST="${1:-}"
USER="${DEPLOY_USER:-root}"
BRANCH="${DEPLOY_BRANCH:-main}"
APP_DIR="${DEPLOY_DIR:-/opt/arcana}"

if [ -z "$HOST" ]; then
  echo "用法: ./deploy/deploy.sh <服务器IP>"
  echo "可选环境变量: DEPLOY_USER(默认 root) DEPLOY_BRANCH(默认 main) DEPLOY_DIR(默认 /opt/arcana)"
  exit 1
fi

echo "==> 本机检查：确认没有未提交的改动"
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  本机有未提交的改动，服务器 git pull 拉不到它们："
  git status --short
  read -r -p "仍然继续部署已推送的版本？(y/N) " ans
  [ "$ans" = "y" ] || [ "$ans" = "Y" ] || exit 1
fi

LOCAL_SHA=$(git rev-parse --short HEAD)
echo "==> 本机 HEAD: $LOCAL_SHA ($BRANCH)"

echo "==> 服务器拉取并重建"
ssh "$USER@$HOST" bash -s <<EOF
set -euo pipefail
cd "$APP_DIR"

echo "--> git pull"
git fetch --all --prune
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"
REMOTE_SHA=\$(git rev-parse --short HEAD)
echo "    服务器 HEAD: \$REMOTE_SHA"

# 注意：这里必须装**全量**依赖，不能用 --omit=dev。
# 构建要用 vite / typescript / tailwind，它们都在 devDependencies 里。
# （运行时依赖 tsx 已经放在 dependencies，所以即使之后 prune 也不影响启动。）
echo "--> npm ci"
npm ci --no-audit --no-fund

echo "--> 构建"
npm run build

# .env 由服务器自己保管，git 里根本没有它，这里只做存在性校验
if [ ! -f "$APP_DIR/.env" ]; then
  echo "❌ $APP_DIR/.env 不存在，服务起来也会是 Mock 模式。"
  echo "   请先创建并填入 DEEPSEEK_API_KEY，然后 chmod 600。"
  exit 1
fi

chown -R arcana:arcana "$APP_DIR"

echo "--> 重启服务"
systemctl restart arcana
sleep 3
systemctl is-active arcana >/dev/null && echo "    服务已启动" || { journalctl -u arcana -n 30 --no-pager; exit 1; }

echo "--> 健康检查"
curl -fsS "localhost:\${PORT:-8080}/api/tarot/config" && echo
EOF

echo
echo "完成 → http://$HOST:${APP_PORT:-8080}  (commit $LOCAL_SHA)"
