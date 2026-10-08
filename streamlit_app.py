"""
Arcana —— Streamlit 部署形态。

【这个文件只做一件事：拿着 API Key 转发请求。】

牌义重建、Prompt 组装、结构校验、语气红线全部仍然在 TypeScript 里（复用 server/ 下的纯逻辑模块），
所以「模型改了牌就整份作废」这类约束在这个形态下同样成立。
这里刻意**不重写任何塔罗逻辑** —— 两套实现必然漂移，而漂移的那天没人会发现。

同样的边界也适用于「解读前背景提问」：题目分类、风险判定、出题 Prompt、JSON 修复、
题目校验、重复询问兜底全部在 TypeScript（server/intake/contextIntakePipeline.ts），
Python 只是把 messages 送到 DeepSeek 再把 content 原样送回。

【已知的退让，如实记录】
Prompt 在浏览器侧组装，理论上有人能改造页面拿这个 Key 当通用 LLM 用。
下面用三道限制兜住：system prompt 指纹校验、max_tokens 上限、频率限制。
对「发给朋友试用」够用；正式部署仍应使用 server/ 那套（见 docs/v2/13-deploy.md）。
"""

from __future__ import annotations

import os
import time
from pathlib import Path

import requests
import streamlit as st
import streamlit.components.v1 as components

# ── 配置 ────────────────────────────────────────────────────────────────
BUILD_DIR = Path(__file__).parent / "streamlit_build"
API_URL = "https://api.deepseek.com/chat/completions"

# —— 解读 ——
# v4 系列是推理模型，max_tokens 把 reasoning_tokens 一起算。
# 实测一次三张牌的解读要 7500+，给小了 JSON 会在一半被截断。
MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-v4-flash")
MAX_TOKENS = 16000
TIMEOUT_S = 200

# —— 解读前背景提问 ——
# 它只出 0–4 道短选择题，关闭推理，实测 1.6–1.8s。配置必须与解读分开：
# 套用解读那套（16000 token / 200s）会让一次本该 2 秒的出题在坏情况下拖住整条流程，
# 而用户此刻正卡在「问题落定」之后等着进下一页。
INTAKE_MODEL = os.environ.get("DEEPSEEK_INTAKE_MODEL", "deepseek-v4-flash")
INTAKE_MAX_TOKENS = 1200
INTAKE_TIMEOUT_S = 12

# 只有含这几个特征的 system prompt 才会被转发 —— 防止有人拿这个 Key 当通用 LLM。
# 用多个短语而不是一整句：Prompt 措辞会改（比如加了 Markdown 粗体），
# 硬编码一整句的话下次改 Prompt 就会静默失效，而且很难查。
#
# 两种请求的指纹**必须分开**：出题 Prompt 里没有「牌位」（它在抽牌之前运行，手上没有牌），
# 套用解读的指纹会把它整个挡掉。反过来解读 Prompt 里没有「背景选择题」「knownFacts」。
# 所以这两组互相排斥 —— 不是「放宽成任何 messages 都转发」。
READING_PROMPT_MARKERS = ("塔罗", "牌位", "json")
INTAKE_PROMPT_MARKERS = ("塔罗", "背景选择题", "knownfacts", "json")

# 频率限制按请求类型分桶。
# 一次完整占卜现在是「1 次出题 + 1 次解读」，如果共用一个桶，
# 原来能连做 6 次解读的额度会被腰斩成 3 次 —— 那是这次改动带来的意外副作用。
# 分桶之后解读的额度与改动前**逐字不变**，出题另有自己的额度。
RATE_LIMIT_WINDOW_S = 60
RATE_LIMIT_MAX = {"reading-request": 6, "context-intake-request": 8}

# 每种请求的完整规格。新增请求类型时只在这里加一行，转发逻辑不用动。
REQUEST_SPECS = {
    "reading-request": {
        "model": MODEL,
        "max_tokens": MAX_TOKENS,
        "timeout_s": TIMEOUT_S,
        "markers": READING_PROMPT_MARKERS,
        # 解读的推理开关由前端按 standard / deep 决定，这里不额外附加
        "extra": {},
    },
    "context-intake-request": {
        "model": INTAKE_MODEL,
        "max_tokens": INTAKE_MAX_TOKENS,
        "timeout_s": INTAKE_TIMEOUT_S,
        "markers": INTAKE_PROMPT_MARKERS,
        # 出题不需要推理：要的是几秒内出几道选择题，不是完整的塔罗推演
        "extra": {"thinking": {"type": "disabled"}},
    },
}


st.set_page_config(page_title="Arcana", page_icon="🌙", layout="wide")

# 把 Streamlit 自带的留白压到最小，给 iframe 让出空间
st.markdown(
    """
    <style>
      #MainMenu, footer, header {visibility: hidden;}
      .block-container {padding: 0 !important; max-width: 100% !important;}
      iframe {display: block; margin: 0 auto;}
      .stApp {background: #0f1522;}
    </style>
    """,
    unsafe_allow_html=True,
)


def _api_key() -> str | None:
    """Key 只从 Streamlit Secrets / 环境变量读，绝不写进代码。"""
    key = os.environ.get("DEEPSEEK_API_KEY")
    if not key:
        try:
            key = st.secrets.get("DEEPSEEK_API_KEY")  # type: ignore[assignment]
        except Exception:
            key = None
    return key.strip() if key else None


def _rate_limited(kind: str) -> bool:
    now = time.time()
    buckets = st.session_state.get("_hits")
    # 改动前 _hits 是一条扁平的列表。热更新时旧 session 可能还带着那个形状，
    # 直接 .get(kind) 会炸 —— 不值得为此让一次占卜失败。
    if not isinstance(buckets, dict):
        buckets = {}
        st.session_state["_hits"] = buckets
    hits = [t for t in buckets.get(kind, []) if now - t < RATE_LIMIT_WINDOW_S]
    hits.append(now)
    buckets[kind] = hits
    return len(hits) > RATE_LIMIT_MAX.get(kind, 6)


def _looks_like_timeout(err: BaseException) -> bool:
    """这个异常本质上是不是「等太久了」。

    【为什么不能只靠 except requests.Timeout】
    实测（2026-09，把出题超时调到 1 秒复现）：读阶段超时时 urllib3 抛
    ReadTimeoutError，requests 把它包成 **ConnectionError** 再抛出 ——
    而 ConnectionError 不是 requests.Timeout 的子类，
    所以 `except requests.Timeout` 根本接不住，它会落到 network-error 分支。

    后果是给用户的下一步动作被说反了：
      timeout       →「这次解读花的时间太长了」→ 用户知道可以再等一次
      network-error →「没有连上解读服务」    → 用户会去查自己的网络
    实际情况是上游在生成、连接是通的。

    所以这里顺着异常链（__cause__ / __context__ / args[0]）找一遍，
    只要链上任何一环的类名里有 timeout，就按超时算。
    按类名而不是 isinstance：urllib3 的导入路径在不同版本里变过，
    多一个 import 就多一个会在部署环境炸掉的理由，而这里只需要一个布尔值。
    """
    seen: set[int] = set()
    node: BaseException | None = err
    while node is not None and id(node) not in seen:
        seen.add(id(node))
        if "timeout" in type(node).__name__.lower():
            return True
        nxt = node.__cause__ or node.__context__
        if nxt is None and node.args and isinstance(node.args[0], BaseException):
            nxt = node.args[0]
        node = nxt
    return False


def call_deepseek(kind: str, messages: list[dict]) -> dict:
    """转发到 DeepSeek。返回结构与前端 StreamlitReadingResponse 对应。

    两种请求共用同一个应答结构（ok / content / error），前端按 requestId 配对。
    失败文案只有解读会真的显示给用户；出题失败在前端是静默的（返回空题目，直接进牌阵）。
    """
    spec = REQUEST_SPECS.get(kind)
    if spec is None:
        return {"ok": False, "error": {"code": "bad-request", "message": "请求格式不正确。"}}

    key = _api_key()
    if not key:
        return {
            "ok": False,
            "error": {
                "code": "missing-api-key",
                "message": "解读服务还没有配置好（缺少 API Key）。这次解读没有成功完成，你抽出的牌仍然保留，可以重新尝试解读。",
            },
        }

    # 三道防滥用限制
    if not messages or messages[0].get("role") != "system":
        return {"ok": False, "error": {"code": "bad-request", "message": "请求格式不正确。"}}
    system_text = (messages[0].get("content") or "").lower()
    if not all(m.lower() in system_text for m in spec["markers"]):
        return {"ok": False, "error": {"code": "bad-request", "message": "请求未通过校验。"}}
    if _rate_limited(kind):
        return {
            "ok": False,
            "error": {
                "code": "rate-limited",
                "message": "请求有点频繁，稍等一下再试。你抽出的牌仍然保留。",
            },
        }

    try:
        resp = requests.post(
            API_URL,
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
            json={
                "model": spec["model"],
                "messages": messages,
                "response_format": {"type": "json_object"},
                "temperature": 0.7,
                "max_tokens": spec["max_tokens"],
                "stream": False,
                **spec["extra"],
            },
            timeout=spec["timeout_s"],
        )
    except requests.RequestException as err:
        # 超时与「连不上」要分开：给用户的下一步动作完全不同。
        # 注意读超时不一定是 requests.Timeout —— 见 _looks_like_timeout。
        if _looks_like_timeout(err):
            return {
                "ok": False,
                "error": {"code": "timeout", "message": "这次解读花的时间太长了。你抽出的牌仍然保留，可以重新尝试解读。"},
            }
        return {
            "ok": False,
            "error": {"code": "network-error", "message": "没有连上解读服务。你抽出的牌仍然保留，可以重新尝试解读。"},
        }

    if resp.status_code != 200:
        code = {401: "unauthorized", 403: "forbidden", 429: "rate-limited"}.get(
            resp.status_code, "upstream-error"
        )
        # 刻意不回传上游报文 —— 它可能带账号相关信息
        return {
            "ok": False,
            "error": {"code": code, "message": "这次解读没有成功完成，你抽出的牌仍然保留，可以重新尝试解读。"},
        }

    try:
        content = resp.json()["choices"][0]["message"]["content"]
    except Exception:
        return {
            "ok": False,
            "error": {"code": "invalid-json", "message": "这次解读没有成功完成，你抽出的牌仍然保留，可以重新尝试解读。"},
        }

    if not content or not content.strip():
        # DeepSeek 官方明确提示过可能返回空 content
        return {
            "ok": False,
            "error": {"code": "empty-response", "message": "这次解读没有成功完成，你抽出的牌仍然保留，可以重新尝试解读。"},
        }

    return {"ok": True, "content": content}


# ── 组件装载 ────────────────────────────────────────────────────────────

if not BUILD_DIR.exists():
    st.error(
        "找不到前端产物 `streamlit_build/`。\n\n"
        "请先在本机执行 `npm run build:streamlit` 并把产物提交到仓库。"
    )
    st.stop()

_arcana = components.declare_component("arcana", path=str(BUILD_DIR))

# 上一次的应答通过 args 回传给组件；用 requestId 配对，避免串场
value = _arcana(response=st.session_state.get("_response"), default=None, key="arcana")

if isinstance(value, dict) and value.get("kind") in REQUEST_SPECS:
    request_id = value.get("requestId")
    if request_id and request_id != st.session_state.get("_last_request_id"):
        st.session_state["_last_request_id"] = request_id
        started = time.time()
        result = call_deepseek(value["kind"], value.get("messages") or [])
        # 只记类型、耗时与成败 —— 日志里不留用户的问题，也不留模型输出。
        # 与 Node 那侧 `[arcana] context intake skipped: … (123ms)` 是同一个用途。
        print(
            f"[arcana] {value['kind']} "
            f"{'ok' if result.get('ok') else result.get('error', {}).get('code', 'error')} "
            f"({int((time.time() - started) * 1000)}ms)",
            flush=True,
        )
        result["requestId"] = request_id
        st.session_state["_response"] = result
        st.rerun()
