# -*- coding: utf-8 -*-
"""把 LXGW WenKai Light 子集化到展示位真正会用到的字符。
展示字体只出现在封面、首页品牌区、牌组名 —— 这些文案全部是我们自己写死的，
字符集可以完整枚举。动态内容（AI 解读正文、用户问题）一律不用它，
所以不存在「子集里没有那个字」的风险。"""
import os

from fontTools import subset

# 牌组名 + tagline（Deck Library 与首页会用展示字体渲染）
DECKS = (
    "空灵 雾还没散，光已经在了"
    "极乐之影 树荫底下，光是暖的"
    "蛋白潮汐 潮水退下去之后留的颜色"
    "仙境之影 再往里走一点就不一样了"
    "经典 一副被翻了很多年的牌"
    "月光 夜里最安静的那一段"
    "古典 象牙纸面与暗金压边"
    "森语 林子里的光会自己找路"
    "星图 你在一张很大的图上"
    "幽影 往回看的那一面"
)
# 封面文案（本轮新增，全部由我们自己写死）
COVER = (
    "每一次翻牌，都是一次自我照见。"
    "开始占卜"
    "亲手洗牌、切牌、摊牌、翻牌"
    "牌由你自己抽出"
    "进入"
)
# 首页与少量 section 标题
MISC = "塔罗日记 牌组 设置 你的问题 选择牌阵 随缘抽一张 带着问题来 开始一次解读"

LATIN = ("ABCDEFGHIJKLMNOPQRSTUVWXYZ"
         "abcdefghijklmnopqrstuvwxyz"
         "0123456789"
         " ·—–…、。，！？：；「」『』（）《》’‘“”.,!?:;()-/&")

RITUAL = "在偶然之间，照见自己 这组牌在说 每张牌的分析 牌与牌之间的关系 整体走向 回到你的问题 可以再想想的问题 核心提示 这张牌的启示 接下来要注意的是"

text = DECKS + COVER + MISC + RITUAL + LATIN
chars = sorted(set(text) - {'\n'})
print(f"  唯一字符数: {len(chars)}")

opts = subset.Options()
opts.flavor = "woff2"
opts.desubroutinize = True
opts.layout_features = ["*"]
opts.drop_tables += ["DSIG"]
opts.notdef_outline = True

SOURCE = os.environ.get("LXGW_TTF", "/tmp/LXGWWenKai-Light.ttf")
if not os.path.exists(SOURCE):
    raise SystemExit(
        f"找不到源字体 {SOURCE}\n"
        "先下载（26.9 MB，OFL-1.1，不入库）：\n"
        "  curl -L -o /tmp/LXGWWenKai-Light.ttf \\\n"
        "    https://github.com/lxgw/LxgwWenKai/releases/download/v1.522/LXGWWenKai-Light.ttf"
    )
font = subset.load_font(SOURCE, opts)
subsetter = subset.Subsetter(options=opts)
subsetter.populate(text="".join(chars))
subsetter.subset(font)
subset.save_font(font, "public/fonts/lxgw-wenkai-light-subset.woff2", opts)
print("  已写入 public/fonts/lxgw-wenkai-light-subset.woff2")
font.close()
