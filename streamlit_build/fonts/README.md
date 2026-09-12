# 自托管字体 · Visual Identity V3

三份 WOFF2，总计约 113.5 KiB，保留现有 OFL 授权；`font-display: swap`，无外部字体请求。

| 字体 | 用途 | 大小 |
|---|---|---:|
| Cinzel | 品牌、英文辅助铭文 | 13.9 KiB |
| Cormorant Garamond | 拉丁动态标题、仪式按钮回退 | 36.9 KiB |
| LXGW WenKai Light 子集 | 中文固定标题、章节、引导语、主要按钮 | 62.8 KiB |

`--font-display` 为固定中文展示字体，`--font-inscription` 协调 Cinzel 与文楷。`--font-ritual` 使用 Cormorant + 完整系统楷体回退链，不包含中文子集，以安全呈现 AI 主题与摘录。系统未提供楷体时退回宋体/serif。长正文用 `--font-editorial`，输入与小标签保留 sans。

子集共 248 字。扩充静态文案时更新 `scripts/subset-display-font.py` 并运行：

```sh
LXGW_TTF=/path/to/LXGWWenKai-Light.ttf python scripts/subset-display-font.py
```

需要 fontTools 与 brotli。源字体不入库，产品运行不依赖 Python。不要把子集字体用于 AI 正文、用户问题或动态牌名。`deck:check` 保留 120 KiB 总预算与动态字体边界检查。
