#!/usr/bin/env bash
# Arcana —— 服务器首次 clone（只跑一次）
#
# 在**服务器上**以 root 运行：
#   bash bootstrap.sh <仓库地址>
#
# 公开仓库：  bash bootstrap.sh https://github.com/Jaco-Yijie/arcana.git
# 私有仓库：  先在服务器上生成 deploy key 并加到 GitHub，再用 SSH 地址
#            ssh-keygen -t ed25519 -C arcana-deploy -f ~/.ssh/id_ed25519 -N ""
#            cat ~/.ssh/id_ed25519.pub   # 贴到 GitHub 仓库 Settings → Deploy keys
#            bash bootstrap.sh git@github.com:Jaco-Yijie/arcana.git
set -euo pipefail

REPO="${1:-}"
APP_DIR="${DEPLOY_DIR:-/opt/arcana}"

if [ -z "$REPO" ]; then
  echo "用法: bash bootstrap.sh <仓库地址>"
  exit 1
fi

if [ -d "$APP_DIR/.git" ]; then
  echo "$APP_DIR 已经是一个 git 仓库，无需 bootstrap。直接用 deploy.sh 即可。"
  exit 0
fi

echo "==> clone 到 $APP_DIR"
mkdir -p "$(dirname "$APP_DIR")"
git clone "$REPO" "$APP_DIR"
cd "$APP_DIR"

echo "==> 创建 .env（Key 需要你自己填）"
if [ ! -f .env ]; then
  cp .env.example .env
  chmod 600 .env
  echo "    已从 .env.example 生成 $APP_DIR/.env"
  echo "    ⚠️  现在去填 DEEPSEEK_API_KEY：nano $APP_DIR/.env"
fi

echo "==> 安装依赖并构建"
npm ci --no-audit --no-fund
npm run build

echo "==> 安装 systemd 服务"
cp deploy/arcana.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable arcana

id -u arcana >/dev/null 2>&1 || useradd --system --shell /usr/sbin/nologin --home "$APP_DIR" arcana
chown -R arcana:arcana "$APP_DIR"

echo
echo "初始化完成。填好 .env 之后："
echo "  systemctl start arcana && systemctl status arcana"
echo
echo "之后在本机用 ./deploy/deploy.sh <IP> 更新即可。"
