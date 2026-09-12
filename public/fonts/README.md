# 自托管字体

两个文件，合计约 **93 KB**。全部自托管 —— 服务端 CSP 是 `font-src 'self'`，
Google Fonts 之类的外链会被直接拦掉（这是有意的，见 `server/security.ts`）。

| 文件 | 用途 | 体积 | 授权 |
|---|---|---:|---|
| `cormorant-garamond-latin.woff2` | 拉丁展示字（品牌名、Cover 标题） | 36.9 KB | OFL-1.1 |
| `lxgw-wenkai-light-subset.woff2` | 中文展示字（Cover 文案、牌组名） | 56.6 KB | OFL-1.1 |

## 为什么是这两个

**Cormorant Garamond** 是可变字体，一个文件覆盖 300–700 全部字重 ——
不需要为每个字重各下一个文件。只取 latin 子集。

**霞鹜文楷 LXGW WenKai Light** 是楷体系，笔画轻、带书写感，
是 OFL 授权里最接近「翩翩体」那种气质的一款。原文件 **26.9 MB**，
子集化到 **223 个字符**后只剩 56.6 KB（0.2%）。

## 子集化的边界 —— 这条很重要

中文展示字**只用在文案由我们自己写死的地方**：Cover、首页品牌区、牌组名。
AI 解读正文、用户输入的问题、日记内容一律**不使用**它。

原因很直接：子集里只有那 223 个字。如果拿它渲染动态文本，
缺字会逐字回退到系统字体，一句话里出现两种字形 —— 那比不用艺术字更糟。

要改动展示位文案，必须同步重新生成子集：

```bash
# 需要 fontTools + brotli
python scripts/subset-display-font.py
```

新增的字如果不在子集里，浏览器会静默回退，**不会报错**。
`deck:check` 的 L 组会拦住这种情况。
