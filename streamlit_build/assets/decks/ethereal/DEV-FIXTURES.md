# ⚠️ 这个牌组当前装的是开发用测试图，不是正式 Tarot artwork

以下文件全部是脚本生成的占位图，画面上明确印着 `DEV FIXTURE / NOT REAL ARTWORK`：

```
cards/major-00.webp   cards/major-01.webp   cards/major-13.webp
deck/cover.webp       deck/back.webp
thumbs/*              deck/*-thumb.webp        （由 npm run thumbs 派生）
```

## 它们为什么在这里

在 0 张真实素材的状态下，所有与 raster 资产相关的断言都是**空转**的
（`ids.every(...)` 对空数组恒为真）。这正是上一轮第三方审计指出的问题：
260 项断言全绿，却证明不了资产管线真的能跑。

留几张明确标记的测试图，是为了让下面这条链路持续被真实验证：

```
full artwork → npm run thumbs → thumbnail → manifest → resolver → 浏览器
```

## 它们不会被误当成正式交付

- `manifests.ts` 里标了 `devFixture: true`
- `isDeckPlayable('ethereal') === false` —— **永远不可用于抽牌**，无论登记多少张
- `coverage` 仍为 `none`，Deck Library 显示 `3 / 78 · 素材备齐后开放`
- 画面上印着 NOT REAL ARTWORK
- `npm run deck:check` 会单独列出 fixture 牌组

## 正式素材到位时怎么做

1. 用真图覆盖 `cards/` 与 `deck/` 下的同名文件
2. 删除 `manifests.ts` 里的 `devFixture: true` 与 `DEV_FIXTURE_ETHEREAL` 整段
3. 按真实交付登记 22 或 78 张（coverage 三档）
4. 删除本文件
5. `npm run thumbs && npm run deck:check`
