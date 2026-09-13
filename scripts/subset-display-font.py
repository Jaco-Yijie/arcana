# -*- coding: utf-8 -*-
"""把 LXGW WenKai Light 子集化到「展示位」真正会用到的字符。

【V3 起改为从 i18n 资源里推导，不再手抄一份字符串】
展示字体只出现在固定文案上（封面、品牌区、牌组名、章节标题、仪式按钮），
这些文案现在**全部**住在 src/i18n/locales/zh-CN.json 里。
手抄一份到这个脚本里，等于制造第二份真相 —— 上一版就是这么漏掉字的：
改了一句文案，没人记得回来补脚本，那个字于是静默回退成系统字体。

所以这里改成：声明**哪些 key 走展示字体**（DISPLAY_KEYS），
字符集由 JSON 现取。加一条文案只需要把它的 key 写进下面的清单，
忘了写也不会出事 —— deck:check L-02 会拿实际字符集去比对。

产物有两个：
  public/fonts/lxgw-wenkai-light-subset.woff2   字体本身
  public/fonts/subset-charset.txt               实际收录的字符（供 deck:check 断言）

用法：
  LXGW_TTF=/path/to/LXGWWenKai-Light.ttf python scripts/subset-display-font.py
需要 fontTools 与 brotli。源字体不入库，产品运行不依赖 Python。
"""
import json
import os
import sys

from fontTools import subset

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ── 走展示字体的 key 前缀 ──
# 清单住在 src/i18n/display-keys.json，因为 deck:check 也要读它
# （L-02 拿这份清单去比对实际生成的字符集）。一份清单，两个消费者，
# 不存在「脚本改了、断言没跟上」这种缝隙。
#
# 只列**固定文案**。AI 解读正文、用户问题、日记内容一律不在这里 ——
# 它们是动态文本，子集永远覆盖不全，必须用系统字体栈。
DISPLAY_KEYS = tuple(
    json.load(open(os.path.join(ROOT, "src", "i18n", "display-keys.json"), encoding="utf8"))
)

LATIN = (
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "abcdefghijklmnopqrstuvwxyz"
    "0123456789"
    " ·—–…、。，！？：；「」『』（）《》’‘“”.,!?:;()-/&%+×"
)


def walk(node, prefix=""):
    """把整棵消息树摊平成 (dotted key, text) 序列"""
    if isinstance(node, str):
        yield prefix, node
    elif isinstance(node, list):
        for i, item in enumerate(node):
            yield from walk(item, f"{prefix}.{i}")
    elif isinstance(node, dict):
        for k, v in node.items():
            yield from walk(v, f"{prefix}.{k}" if prefix else k)


def collect():
    path = os.path.join(ROOT, "src", "i18n", "locales", "zh-CN.json")
    with open(path, encoding="utf8") as fh:
        messages = json.load(fh)

    text = []
    for key, value in walk(messages):
        if any(key == k or key.startswith(k + ".") for k in DISPLAY_KEYS):
            text.append(value)
    if not text:
        sys.exit("DISPLAY_KEYS 一条也没命中 —— key 前缀写错了？")
    return "".join(text)


def main():
    text = collect() + LATIN
    chars = sorted(set(text) - {"\n", "\r"})
    cjk = [c for c in chars if "一" <= c <= "鿿"]
    print(f"  唯一字符数: {len(chars)}（其中汉字 {len(cjk)}）")

    opts = subset.Options()
    opts.flavor = "woff2"
    opts.desubroutinize = True
    opts.layout_features = ["*"]
    opts.drop_tables += ["DSIG"]
    opts.notdef_outline = True

    source = os.environ.get("LXGW_TTF", "/tmp/LXGWWenKai-Light.ttf")
    if not os.path.exists(source):
        raise SystemExit(
            f"找不到源字体 {source}\n"
            "先下载（26.9 MB，OFL-1.1，不入库）：\n"
            "  curl -L -o /tmp/LXGWWenKai-Light.ttf \\\n"
            "    https://github.com/lxgw/LxgwWenKai/releases/download/v1.522/LXGWWenKai-Light.ttf"
        )
    font = subset.load_font(source, opts)
    subsetter = subset.Subsetter(options=opts)
    subsetter.populate(text="".join(chars))
    subsetter.subset(font)
    out = os.path.join(ROOT, "public", "fonts", "lxgw-wenkai-light-subset.woff2")
    subset.save_font(font, out, opts)
    font.close()
    size = os.path.getsize(out)
    print(f"  已写入 {out}（{size / 1024:.1f} KB）")

    # 字符清单入库：deck:check 拿它断言覆盖，而不是去猜脚本里的字面量
    manifest = os.path.join(ROOT, "public", "fonts", "subset-charset.txt")
    with open(manifest, "w", encoding="utf8") as fh:
        fh.write("".join(chars))
    print(f"  已写入 {manifest}（{len(chars)} 字符）")


if __name__ == "__main__":
    main()
