# Immersive 3D Experience V1

## 审计与方案

原 Home 和 Cover 以平面 SVG、二维旋转、淡入为主；洗牌有 18 层牌背，但主要沿 X/Y 移动。ImmersiveShell 的实色底遮住全局背景。抽牌扇形布局有成熟的几何命中与可访问路径，应保留。既有翻牌已有 perspective/rotateY，没有 Three.js、R3F 或 WebGL。

本轮使用 CSS 3D、Framer Motion 的 Z 轴/旋转，以及事件驱动的指针视差。没有引入 Three.js：当前卡牌和圆环不需要模型、动态网格或物理模拟，增加运行时不划算。球体是有光影的 CSS 球形视觉，不是真正网格模型；轨道和牌堆使用实际透视变换。

## 变化

- Home：带球形月光、三组交叉旋转轨道、斜置地面圆阵的纵深背景；卡牌从远处进入，9 秒周期改变 Z 深度、rotateX/rotateY；桌面指针带动前景，后景反向缓移。时间顺序为背景 → 立体物件 → 卡牌 → 品牌 → CTA 强调。CTA 始终可用。
- Cover：加入相同仪式物件，保持原进入按钮与初次引导规则。
- Shuffle：实色空背景变为月光、倾斜圆阵与远景轨道；18 层牌背增加 Z 间距，手势时按原位移派生倾斜和前后深度。没有修改手势输入、洗牌熵、牌序或完成条件。
- Draw：拿起牌使用前移、轻转正的动画，落位使用从近处落下的透视。背景在持牌时增强球体光晕。没有调整 FanSpread 的布局、命中坐标、牌数或选取规则；动画只作用于输入容器内的牌面。
- Reading / Journal / Share / Settings：不挂载新增场景，保持阅读优先。

## 移动与无障碍

手机/粗指针隐藏两组轨道、轴杆和墨雾；保留静态透视圆阵、单轨与月光。关闭指针视差和持续卡牌 3D 浮动，洗牌层级扁平化；拿牌动画缩短为 300ms。装饰层不可点击、aria-hidden。Home 装饰边界裁切，避免横向溢出。

prefers-reduced-motion 与慢刷新设备下，场景动画停止，静态圆环仍有倾斜层次；Framer 洗牌在 reduced motion 下取消新增 Z/倾斜。已有按钮、语言切换、引导和 What is Tarot 入口保留。

## 性能

没有新增依赖、字体、图片文件、Canvas 或 WebGL；复用 paper-grain.svg 与 ink-landscape.svg。仅在关键页面挂载装饰组件。视差只在细指针移动时合并到一次 requestAnimationFrame，没有空闲 JavaScript 渲染循环；卸载、指针离开、媒体设置改变会取消并复位。

初始 HTML 关联 JS/CSS 原始大小：812,068 → 820,657 bytes，增加 8,589 bytes（约 1.06%）。这不是下载耗时指标。卡牌仍使用既有缩略图，AI 请求与流式管道未修改。

本机 Chromium 3 秒采样：390px 视口 p95 帧间隔 17.4ms、最大 17.6ms、无 >50ms 帧；1440px p95 17.5ms、最大 51ms、1 个 >50ms 帧。不能等同于低端手机、真实 GPU 或长时间使用的性能保证。

## 文件

新增：
- src/components/immersive/RitualScene.tsx
- src/components/immersive/useHeroDepth.ts
- src/styles/immersive-3d.css

修改：
- src/pages/HomePage.tsx
- src/pages/IntroCover.tsx
- src/components/layout/ImmersiveShell.tsx
- src/features/table/components/ShuffleStack.tsx
- src/features/table/components/DrawTable.tsx
- src/main.tsx
- tests/design-system.test.ts

## 验证

- 完整 npm run build 通过（前后端类型、i18n、Deck、布局、资产、设计检查）。
- 设计测试 6 项通过；引擎 64 项断言通过。
- 修改组件的定向 lint、git diff --check 通过。
- 375 / 390 / 430 手机首页无横向溢出，图片、品牌和卡牌正常可见。
- 桌面真实指针事件产生 matrix3d 变化。
- 真实鼠标拖动洗牌 → 切牌 → 键盘选牌 → 落位 → 点击翻牌成功。
- 完整本地示例解读完成，Reading 场景数量为 0，纸张正文正常。
- 低动态模式生效后，Home 运行动画数为 0。

截图保存在 output/playwright/immersive-3d/。浏览器中的游客 auth/me 401 是预期未登录响应，非 3D 错误。

## 限制与下一步

尚未进行低端 Android、iOS Safari、触屏真机拖动和持续 GPU/功耗测试，也没有调用真实 AI 做延迟对比。本次通过独立发布工作树合入 GitHub main，并提交 Streamlit 专用构建；不包含本地用户系统与后台改动。建议先用真实手机检查长时间洗牌与多牌阵，再决定是否需要网格模型或更重的 3D 运行时。

| Before | After |
| --- | --- |
| Home 平面叠牌 | 透视卡牌、指针视差、交叉轨道 |
| Shuffle 实色背景与二维位移 | 仪式桌面、月光、Z 轴堆叠 |
| Draw 普通拿起与落位 | 向前拿出、转正、透视落位 |
| 氛围主要来自背景图 | 前景、中景、远景共同构成空间 |
| Motion 主要是浮动淡入 | CSS 3D + 手势派生空间运动 |
| 原资源加载策略 | 复用资源，初始 JS/CSS 增加约 1.06% |
