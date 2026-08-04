"""
Arcana —— Streamlit 部署形态。

【这个文件只做一件事：拿着 API Key 转发请求。】

牌义重建、Prompt 组装、结构校验、语气红线全部仍然在 TypeScript 里（复用 server/ 下的纯逻辑模块），
所以「模型改了牌就整份作废」这类约束在这个形态下同样成立。
这里刻意**不重写任何塔罗逻辑** —— 两套实现必然漂移，而漂移的那天没人会发现。

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
MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-v4-flash")

# v4 系列是推理模型，max_tokens 把 reasoning_tokens 一起算。
# 实测一次三张牌的解读要 7500+，给小了 JSON 会在一半被截断。
MAX_TOKENS = 16000
TIMEOUT_S = 200

# 只有含这几个特征的 system prompt 才会被转发 —— 防止有人拿这个 Key 当通用 LLM。
# 用多个短语而不是一整句：Prompt 措辞会改（比如加了 Markdown 粗体），
# 硬编码一整句的话下次改 Prompt 就会静默失效，而且很难查。
PROMPT_MARKERS = ("塔罗", "牌位", "json")

RATE_LIMIT_WINDOW_S = 60
RATE_LIMIT_MAX = 6


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


def _rate_limited() -> bool:
    now = time.time()
    hits = [t for t in st.session_state.get("_hits", []) if now - t < RATE_LIMIT_WINDOW_S]
    hits.append(now)
    st.session_state["_hits"] = hits
    return len(hits) > RATE_LIMIT_MAX


def call_deepseek(messages: list[dict]) -> dict:
    """转发到 DeepSeek。返回结构与前端 StreamlitReadingResponse 对应。"""
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
    if not all(m.lower() in system_text for m in PROMPT_MARKERS):
        return {"ok": False, "error": {"code": "bad-request", "message": "请求未通过校验。"}}
    if _rate_limited():
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
                "model": MODEL,
                "messages": messages,
                "response_format": {"type": "json_object"},
                "temperature": 0.7,
                "max_tokens": MAX_TOKENS,
                "stream": False,
            },
            timeout=TIMEOUT_S,
        )
    except requests.Timeout:
        return {
            "ok": False,
            "error": {"code": "timeout", "message": "这次解读花的时间太长了。你抽出的牌仍然保留，可以重新尝试解读。"},
        }
    except requests.RequestException:
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

if isinstance(value, dict) and value.get("kind") == "reading-request":
    request_id = value.get("requestId")
    if request_id and request_id != st.session_state.get("_last_request_id"):
        st.session_state["_last_request_id"] = request_id
        result = call_deepseek(value.get("messages") or [])
        result["requestId"] = request_id
        st.session_state["_response"] = result
        st.rerun()
