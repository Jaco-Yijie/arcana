# Arcana — 部署到腾讯云香港轻量（IP 直连）

面向「给朋友试用」的最小可用部署。约 30 分钟。

## 为什么是这个方案

| 决策 | 理由 |
|---|---|
| **香港**轻量，不用大陆 | 大陆服务器绑域名需要 **ICP 备案**（1–3 周，要大陆身份证/企业资质）。香港免备案，当天上线，国内访问依然稳定。 |
| **不用 Vercel / Netlify / Cloudflare** | 国内访问极不稳定（Vercel 基本不可用）；且它们以静态托管为主，而我们必须有常驻 Node 进程来藏 API Key。 |
| **不用 nginx，Node 直接监听 80** | 少一层就少一处配置。而且 nginx 默认 `proxy_read_timeout` 是 60s，我们的解读最长 180s —— 用 nginx 反而要专门去调它，不调就是所有解读都失败。 |
| 先 IP 直连，暂不上 HTTPS | 没域名就没法签证书。代价见下方「已知限制」。 |

## 一、买机器

腾讯云轻量应用服务器 → **地域选「中国香港」** → 镜像选 **Ubuntu 24.04** → 2核2G / 4M 带宽即可（约 ¥24/月起）。

买完记下**公网 IP**，并设置 root 密码或上传 SSH 公钥。

> ⚠️ **两道防火墙，都要放行 80**：
> 腾讯云控制台的「防火墙」规则 **和** 服务器内部的 ufw 是两套，只开一边不通。
> `setup.sh` 会处理服务器内部那道，控制台那道要你手动加一条 `TCP:80`。

## 二、初始化服务器

```bash
ssh root@你的IP

# 装 Node 22、建运行用户、配防火墙
curl -fsSL https://raw.githubusercontent.com/... # 或者先传代码再执行
sudo bash /opt/arcana/deploy/setup.sh
```

首次没有代码时，可以先本机跑一次同步（见第三步），再执行 `setup.sh`。

## 三、首次部署

在**本机**项目根目录：

```bash
./deploy/deploy.sh 你的IP
```

它做四件事：本机构建 → rsync 同步（**排除 `.env`**）→ 服务器 `npm ci --omit=dev` → 重启服务。

## 四、配置 API Key（只在服务器上做一次）

```bash
ssh root@你的IP
nano /opt/arcana/.env
```

填入：

```
DEEPSEEK_API_KEY=sk-你的key
DEEPSEEK_MODEL=deepseek-v4-flash
```

然后：

```bash
chmod 600 /opt/arcana/.env
chown arcana:arcana /opt/arcana/.env

cp /opt/arcana/deploy/arcana.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now arcana
systemctl status arcana
```

看到 `provider=deepseek · apiKey=已配置 · ready=true` 就成了。

访问 `http://你的IP`。

## 五、日常操作

```bash
./deploy/deploy.sh 你的IP          # 本机：更新代码并重启
ssh root@IP 'journalctl -u arcana -f'   # 看实时日志
ssh root@IP 'systemctl restart arcana'  # 重启
```

`.env` 被 `deploy.sh` 显式排除，**服务器上的 Key 不会被本机覆盖，本机的 Key 也不会被传上去**。

## 已知限制（IP 直连 / 无 HTTPS）

| 影响 | 说明 |
|---|---|
| 分享页「复制文案」失效 | `navigator.clipboard` 要求安全上下文。抽牌、解读、日记都不受影响。 |
| 部分手机浏览器禁用震动反馈 | 同上。音效不受影响。 |
| 浏览器地址栏显示「不安全」 | 朋友可能会问一句，属正常。 |
| 微信内打开可能被拦 | 微信对 http 站点有额外提示，可让朋友用系统浏览器打开。 |

要消掉这些，买个域名解析到这台机器，我再给你换成 Caddy 自动签 HTTPS —— 香港服务器绑域名**不需要备案**。

## 上线前必看：成本

朋友每点一次「开始完整解读」，就是一次真实的 DeepSeek 调用。当前配置一次约消耗 7500 token（推理占大头）。

服务端已有的两道闸：

- **每 IP 每分钟 10 次**（`server/http.ts`）—— 防连点
- **超时不自动重试**（`server/providers/deepseek.ts`）—— 失败不会翻倍烧

如果打算发到群里，建议先去 DeepSeek 控制台设置**消费限额**。

## 回滚

```bash
ssh root@IP 'systemctl stop arcana'
# 或临时切回本地示例解读（不烧 token，UI 完全可用）：
ssh root@IP 'echo "READING_PROVIDER=mock" >> /opt/arcana/.env && systemctl restart arcana'
```
