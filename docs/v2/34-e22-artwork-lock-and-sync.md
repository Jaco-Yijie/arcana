# Phase E2.2 — 牌面完整性锁 与 真实恢复链路

> 本轮把 E1 留下的最后一个「以后再说」接完：`assets:sync` 的真实下载。
> 产品逻辑零改动。抽牌、牌义、解读、Prompt、UI 一行未动。

---

## 1. 它接的是哪一句 TODO

`scripts/assets-check.ts` 在 E1 写下的原话：

```
【本轮不下载任何东西】
--dry-run 只打印计划。真实下载留到确定 CDN 之后（Phase E2），
那时把 ARCANA_ASSET_SOURCE 指向对象存储即可，本文件的契约不用改。
```

E2 已经确定：780 个对象在 Cloudflare R2，路径形状与本地逐段相同。
契约确实没变，`--sync` 却仍然只会打印一行「真实下载尚未实现」然后 exit 1。

这不是一个可以继续挂着的 TODO —— **E2 §20 第 4 项「仓库瘦身」的前置条件就是它**：

> 仓库仍追踪 1580 个 webp（约 276MB）。牌面已在 R2，主仓库不再需要它们 ——
> 但 `public/assets/decks` 目前仍是本地开发的兜底，移除前需要先接上 `assets:sync`。

牌面一旦出 git，`assets:sync` 就从「一个便利脚本」变成**唯一的恢复机制**。
在那之前它必须真的能用，而且必须能证明取回来的字节是对的。

---

## 2. 难的不是下载，是「取回来的到底对不对」

下载本身十几行就写完了。真正的问题是 E2.1 的 ORG-04 已经证明过一次的那件事：

> 对象存储配错时最常见的表现**不是** 404，而是 **200 + 一个错误文档**。

把那段 XML 存成 `major-00.webp`，磁盘上就多了一个「存在、非空、看起来很正常」的文件。
从此 `assets:check` 全绿，而产品显示裂图 —— 一个**自己制造了自己检测不到的故障**的工具，
比没有这个工具更糟。

所以校验需要一份可信的期望值：每个对象的字节数与 sha256。

### 2.1 期望值原本只有一份，而它恰好在最需要时不存在

唯一的一份在 `deployment/manifests/artwork-manifest.json`。它有两个性质：

| 性质 | 后果 |
|---|---|
| 是 `deployment:build` 的产物，被 `.gitignore` 排除 | 新 clone 里没有 |
| `deployment:build` 要求本地牌面**已经齐备**（它就是把 `public/` 拷进包） | 牌面缺的时候生不出来 |

于是：**牌面缺失时 → 生不出 manifest → 没有期望值 → 无法校验下载**。
恰恰在唯一需要它的场景里，它一定不存在。

### 2.2 `artwork.lock.json`

切断这个循环的办法是让期望值**进 git**：

```json
{
  "contract": "v1",
  "decks": ["legacy-moonlight", "legacy-classic", "legacy-forest", "legacy-celestial", "legacy-shadow"],
  "revisions": { "legacy-moonlight": 1, "legacy-classic": 2, "…": 0 },
  "counts": { "full": 390, "thumb": 390, "total": 780, "bytes": 143900140 },
  "files": {
    "legacy-classic/cards/cups-01.webp": { "bytes": 234920, "sha256": "…" }
  }
}
```

和 `package-lock.json` 同一个性质：**记录期望，不描述任何一台机器的现状**，
所以在一个牌面还没下载的空目录上依然成立。124 KB，780 行有效内容。

`files` 用「路径 → {bytes, sha256}」的映射而不是数组：查找 O(1)，
而且 git diff 上一行就是一个对象 —— 换了哪张牌一眼看得见。

**生成时拒绝残缺**：`assets:lock` 发现本地缺失/空文件就直接退出。
从残缺的目录生成锁，等于把当时的残缺固化成「期望值」，
之后所有校验都会照着错的那份全绿 —— 那是这类工具最坏的失效方式。

---

## 3. 下载的三条硬规则

### 3.1 校验在写盘之前

```
取回字节 → WebP 魔数 → 字节数（对锁）→ sha256（对锁）→ 全过才写盘
```

校验不过的字节**根本不落到 `public/` 里**。一旦落盘，它就有了「存在且非空」这个身份，
之后每一次不带 `--verify` 的检查都会放它过。

### 3.2 写 `.part` 再 rename

这个脚本自己在输出里把「空文件」列为**传输中断的典型症状**。
直接往目标路径写，一次 Ctrl-C 就会亲手制造那个症状，而下一次 `assets:check`
只会说「有这个文件」。

先写 `<目标>.part`、校验通过后 `rename`（同目录内的 rename 是原子的），
目标路径就只有两种状态：**不存在**，或者**一份已经逐字节验过的完整文件**。

### 3.3 重试，但把重试次数说出来

`.r2.dev` 实测会间歇性掐断连接（E2.1 ORG-01b）。不重试 = flaky；
悄悄吞掉 = 掩盖掉包率。所以沿用 ORG 组的做法：
重试两次后仍失败才算失败，**需要重试才成功的对象数单独报出来**。

---

## 4. 恢复源怎么定

按可信度依次解析，第一个命中即用：

| 顺序 | 来源 | 说明 |
|---|---|---|
| 1 | 命令行参数 | `npm run assets:sync -- https://assets.example.com` |
| 2 | `ARCANA_ASSET_SOURCE` | 环境变量 |
| 3 | `dist/arcana-build.json` | **E2.1「产物自述资产根」的直接复用** —— 只在 `assetMode: "remote"` 时采用 |

第三条的意思是：如果这台机器上刚构建过一份远端资产模式的产物，
那份产物**自己记着**它用的是哪个根，那是构建期的事实，比任何运行期猜测都硬。
本轮的实测就是这么跑的 —— 一个参数都没给。

一个都没有时，打印三条恢复途径（git checkout / 对象存储 / 直接用 CDN 开发），
不猜、不默认连任何厂商的地址。

---

## 5. 两份真值不许漂移：`DEP-04i` / `DEP-04j`

现在有两份文件都在说「正确的 780 个字节流是哪些」：

| | 来源 | 性质 |
|---|---|---|
| `deployment/manifests/artwork-manifest.json` | `deployment:build` 刚从 `public/` 拷进包那一份的实测值 | 产物，不进 git |
| `artwork.lock.json` | 期望值 | **进 git** |

两份必须相等。不等只有两种可能，而且都必须在上传之前发现：

- 有人换了牌面却没跑 `assets:lock` —— 锁停在旧版，
  于是 `assets:sync` 会把刚上传的新牌面判成「sha256 不符」而拒收
- 包是用一份被改坏的 `public/` 构建的 —— 那正是锁存在的理由

`deployment:check` 因此新增两条（54 → **56** 项）：

- `DEP-04i` `artwork.lock.json` 存在
- `DEP-04j` 牌面包与锁逐字节一致（780 个对象逐一比对）

没有这一条，两份真值会各自漂移，而漂移只会在**别人 clone 之后**才炸。

---

## 6. 实测

### 6.1 锁与既有 manifest 交叉核对

`assets:lock` 从本地生成的 780 条，与 `deployment:build` 独立产出的
`artwork-manifest.json` 逐条比对：

```
lock: 780   manifest: 780
只在锁里: []   只在包里: []   sha256 不符: 0
counts 完全相同（143,900,140 字节）
```

而那份 manifest 的 sha256，E2.1 的 ORG-05 已经对 R2 上的对象验过。
三方（本地磁盘 / 部署包 / R2）指向同一批字节。

### 6.2 三种损坏 → 检出 → 恢复

人为制造五个坏文件，覆盖三类症状：

| 症状 | 造法 | 不带 `--verify` 能否检出 |
|---|---|---|
| 缺失 ×2 | `rm` | ✅ |
| 空文件 ×1 | `: >` | ✅ |
| 截断 ×1 | `head -c 3000` | ✅（字节数对锁不符） |
| 魔数对、内容错 ×1 | 手写 `RIFF…WEBP` 开头的假货 | ✅（字节数对锁不符） |

```
本地 778 个 · 缺失 2 · 空 1 · 字节数不符 2 · sha256 不符 0
  size    legacy-celestial/thumbs/pentacles-04.webp
  missing legacy-classic/cards/cups-01.webp
  missing legacy-forest/thumbs/major-00.webp
  size    legacy-moonlight/cards/major-21.webp
  empty   legacy-shadow/cards/wands-05.webp
```

`npm run assets:sync`（不给任何参数，源由产物自述）：

```
源：https://pub-…r2.dev  ← dist/arcana-build.json（产物自述资产根）
待取 5 个对象
校验：WebP 魔数 + 字节数 + sha256（对 artwork.lock.json）
取回 5 / 5 个 · 1.0 MB · 1.7s · 并发 8

完整  780 个牌面与锁逐字节一致
```

五个文件与恢复前的备份 `cmp` 逐字节相同，无 `.part` 残留。

### 6.3 三条负向测试 —— 一个从不会红的 gate 等于没有

| 场景 | 造法 | 结果 |
|---|---|---|
| **200 + SPA 兜底** | 把资产根指向带 SPA fallback 的站点 | `不是 WebP（极可能是错误页或 SPA 兜底）` · **磁盘上没有落下任何文件** |
| **sha256 不符** | 本地起一个源，返回把中间一个字节翻转过的同一张图（魔数对、长度对） | `sha256 不符（源上的不是这一版）` · **未落盘** |
| **资产根多带一段路径** | `--source https://pub-…r2.dev/legacy-classic` | `HTTP 404` · **未落盘**（E2 踩过的正是这个坑） |

第二条是关键：字节数完全相同、WebP 魔数完全正确，只有 sha256 能拦住它。

`DEP-04j` 也做了同样的自测：把锁里一条 sha256 改成 64 个 0 → gate 变红，
`assets:check --verify` 同时报出 `hash legacy-classic/cards/cups-01.webp`；改回 → 全绿。

### 6.4 全量 780 个真实取回

这才是「仓库瘦身之后 clone 下来能不能补齐」的实际场景：

```
npm run assets:sync -- --force
  待取 780 个对象（--force：不管本地有没有）
  取回 780 / 780 个 · 137.2 MB · 67.8s · 并发 8
  需要重试才成功的对象 3 个 —— 资产根在掉连接

完整  780 个牌面与锁逐字节一致
```

跑完之后 `git status public/assets/decks` **是空的** ——
从 R2 取回的 780 个对象与仓库里追踪的那份逐字节相同。
恢复链路无损这件事，到此是算出来的，不是相信的。

`需要重试才成功的对象 3 / 780`（约 0.4%）与 E2.1 的 ORG-01b 是同一个现象的更大样本：
`.r2.dev` 在掉连接。绑定 custom domain 之后这个数应当归零。

---

## 7. 本轮改动清单

| 文件 | 改动 |
|---|---|
| `artwork.lock.json` | **新增（进 git）**。780 个对象的字节数与 sha256 |
| `scripts/assets-check.ts` | 真实下载接上；新增 `--lock` / `--verify` / `--force` / `--source` / `--concurrency`；本地状态从「存在/空」细分为 `ok / missing / empty / size / hash / unlocked` |
| `scripts/deployment-check.ts` | 新增 `DEP-04i` / `DEP-04j`（54 → 56 项） |
| `package.json` | 新增 `assets:lock` |
| `.gitignore` | 忽略 `*.webp.part`（下载中间态） |
| `README.md` | 新增「牌面」一节；修正 `release:check` 45→60、`deployment:check` 53→56 |
| `deployment/README.md`、`deployment/production-checklist.md` | 同步断言数；勾选清单加一行 `assets:check` |

**产品逻辑零改动。**

---

## 8. 回归

| 检查 | 断言数 | 结果 |
|---|---:|---|
| `engine:check` | 64 | ✅ |
| `deck:check` | 338 | ✅ |
| `layout:check` | 119 | ✅ |
| `artwork:check` | 89 | ✅ |
| `reading:check` | 118 | ✅ |
| `performance:check` | 24 | ✅ |
| `release:check` | 60 | ✅ |
| `deployment:check` | **56**（原 54） | ✅ |
| `assets:check --verify` | 780 个对象逐字节 | ✅ |
| `assets:origin`（`.r2.dev`） | 9 | ✅ |
| `tsc -b` / `tsc -p tsconfig.server.json` / `oxlint` | — | ✅ 0 |

---

## 9. 这解锁了什么，以及什么仍然没做

**解锁**：E2 §20 第 4 项「仓库瘦身」的前置条件已经满足 ——
恢复机制存在、可校验、且实测无损。

**没做**：瘦身本身。把 1580 个 webp 移出 git 是一次不可逆的历史改写
（`git filter-repo` 之类），并且会让「clone 下来直接能跑」这条 README 承诺失效 ——
新开发者要先跑一次 `assets:sync`。这是产品决策，不是工程收尾，留给你。

真要做的时候，顺序是：

1. `npm run assets:lock` 确认锁是最新的（应无 diff）
2. `git rm -r --cached public/assets/decks/*/{cards,thumbs}` + `.gitignore` 加上它们
3. README 的「运行」一节改成 `npm install && npm run assets:sync -- <资产根>`
4. 在一个**干净的**新 clone 里实跑一遍 §6.4，确认 780/780

第 4 步不能省。恢复机制只有在真正空目录上跑通过一次，才算存在。
