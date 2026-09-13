# Reading Completion Flow 回归

本目录 fixture 为确定性测试样例；测试使用隔离 localStorage 和模拟 SSE，不调用真实 AI。

1. `npm run build`
2. `npm run preview -- --host 127.0.0.1 --port 8788`
3. `BASE_URL=http://127.0.0.1:8788 node qa/reading-completion/check.mjs`

预览端口被占用时使用 Vite 输出的实际端口。可通过 `PW_CORE` 指定已安装的 playwright-core 模块路径；默认沿用项目 QA 环境。需要本机 Chrome。

验证：中英文 × Standard/Deep 完成、生成中隐藏动作、375/390/430px、键盘开启新占卜、空问题输入、新会话清空牌/解读/追问、保留 Deck/语言/设置、旧记录归档、保存与分享路由、追问等待保护、失败状态不显示完成动作。

截图与结果写入 `output/playwright/completion/`，不包含用户真实 Journal。
