#!/usr/bin/env bash
# Arcana —— 服务器首次初始化（Ubuntu 22.04 / 24.04）
#
# 在**服务器上**以 root 运行一次：
#   sudo bash deploy/setup.sh
#
# 它只做环境准备，不拉代码、不写 API Key —— 那两步你自己来。
set -euo pipefail

APP_DIR=/opt/arcana
APP_USER=arcana

echo "==> 更新软件源并安装基础工具"
apt-get update -y
apt-get install -y git curl ca-certificates

echo "==> 安装 Node.js 22 LTS"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v
git --version

echo "==> 创建运行用户 $APP_USER（无登录权限）"
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --shell /usr/sbin/nologin --home "$APP_DIR" "$APP_USER"

echo "==> 准备目录 $APP_DIR"
mkdir -p "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

echo "==> 防火墙：只放行 80 与 SSH"
if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH >/dev/null 2>&1 || true
  ufw allow 80/tcp >/dev/null 2>&1 || true
  # 8787 是开发端口，生产不该对外暴露
  ufw deny 8787/tcp >/dev/null 2>&1 || true
  yes | ufw enable >/dev/null 2>&1 || true
  ufw status numbered
fi

echo
echo "环境准备完成。接下来："
echo "  1. 把代码放到 $APP_DIR"
echo "  2. 在 $APP_DIR 建 .env 并填入 DEEPSEEK_API_KEY（chmod 600）"
echo "  3. sudo cp $APP_DIR/deploy/arcana.service /etc/systemd/system/"
echo "     sudo systemctl daemon-reload && sudo systemctl enable --now arcana"
echo
echo "注意：腾讯云轻量还需要在**控制台的防火墙**里放行 80 端口，"
echo "      服务器内部的 ufw 放行了不等于云平台放行了。"
