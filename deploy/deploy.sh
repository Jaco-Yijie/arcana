#!/usr/bin/env bash
# Arcana —— 从本机把代码推到服务器并重启
#
# 在**本机**项目根目录运行：
#   ./deploy/deploy.sh <服务器IP>
#
# 例：./deploy/deploy.sh 43.130.xx.xx
set -euo pipefail

HOST="${1:-}"
USER="${DEPLOY_USER:-root}"
APP_DIR=/opt/arcana

if [ -z "$HOST" ]; then
  echo "用法: ./deploy/deploy.sh <服务器IP>"
  exit 1
fi

echo "==> 本地构建（先在本机构建，服务器只跑不编译，省内存也更快）"
npm run build

echo "==> 同步文件到 $USER@$HOST:$APP_DIR"
# 关键：--exclude '.env'
# 服务器上的 .env 才是真的那份，绝不能被本机的覆盖掉，更不能把本机 Key 传上去
rsync -az --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude 'docs' \
  ./ "$USER@$HOST:$APP_DIR/"

echo "==> 安装生产依赖并重启"
ssh "$USER@$HOST" bash -s <<EOF
set -euo pipefail
cd $APP_DIR
# tsx 已经放在 dependencies 里，所以 --omit=dev 之后服务仍然起得来
npm ci --omit=dev
chown -R arcana:arcana $APP_DIR
systemctl restart arcana
sleep 3
systemctl is-active arcana && echo "服务已启动"
curl -s localhost/api/tarot/config && echo
EOF

echo
echo "完成 → http://$HOST"
