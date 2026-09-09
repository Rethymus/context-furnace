# UI_CONTRACT M7 研究稿 — 全程插画与微动效（LLM 直写 SVG 第二批）

> 状态：**已交付（v5.0）**。2026-09-09 人工预览门通过（「可以」）+ K5 追加批复
> （「还需要加入动画或者gif」→ 裁定为 CSS 动画化 SVG，见 §0.2 K5 与 §3.5），
> 集成批完成、verify 全绿。

---

## 0. 背景与目标

M6 交付五结局版画后，所有者要求把插画/动效推广到**开始界面**与**游戏过程界面**，
继续走 LLM 直写 SVG 路线。竞品调研三要素（真人第一次理解 / 反馈即时性 / 长期留存）
中，本批主要服务前两者：卡面印章降低首读成本，微动效包强化操作反馈。

## 0.2 所有者批复记录（K 表，2026-09-09 AskUserQuestion）

| # | 问题 | 裁决 |
|---|---|---|
| K1 | 卡面插画规模（内容邻接面） | **12 卡各一幅语义插画**（显式授权；纯视觉层、零文本、不碰文字排版） |
| K2 | 过程界面非卡面件 | **炉膛内景**（面板厂牌徽标否决） |
| K3 | 动效政策（规格外动画显式解除） | **微动效包**：H2 版画点亮 + G4 周期转场 + G5 炉门辉光；CSS-only、RM 全塌缩、e2e 时序断言不变 |
| K4 | 开始界面 | **待机版画 + POWER ON 点亮** |
| K5 | 追加（预览门同日） | **插画动画化**：「还需要加入动画或者gif」→ 裁定 CSS 动画化 SVG（mw-* 词汇表）；游戏内不引入 GIF（位图、无 RM 关断、破坏矢量色板体系），GIF 形态仅存在于 README 展示面（PRESENTATION_SPEC 管辖） |

## 3.5 K5 落地：mw-* 动画词汇表（motion.css）

- 六词汇 + 两一次性：`mw-rise`（蒸汽/热浪上升 2.6s）、`mw-march`（虚线行进 1.8s，统一 5/4 周期无缝）、`mw-pulse`（余烬/标记呼吸 3.2–4s）、`mw-flicker`（亮窗/投诉标记闪烁 4s）、`mw-drift`（home 静止空气漂移 7s）、`mw-tilt`（C09 天平微倾 5s）；`mw-enter`（印章每周期入场 140ms 一次性）、`door-glow`（G5 炉门辉光 0.9s 一次性）。
- 约束：仅 transform/opacity/stroke-dashoffset 三属性族（合成器友好、零布局）；RM 与 freeze 由 motion.css 既有全局 kill-switch 统一关断（确定性双拍 10/10 实证）。
- G4 收敛说明：周期转场本已由 M1 `mount-rise`（loadRound 全量重建 `.machine > *` 220ms 上升）承载，M7 只加印章 `mw-enter` 入场，不加第二层正文动画（避免双重运动）。
- 集成期修正（走查驱动）：印章从绝对定位角标改为 **浮动落款**（`float: right` 置于正文 `<p>` 之前）——Range 行盒实测绝对定位版与正文盒每周期相交（en/pseudo-long 必压字），浮动版 zh×4 周期 + en 长文字形级零遮挡、machine 保持 739 零滚动。

## 0.3 否决表

| 提案 | 否决原因 |
|---|---|
| G2 面板厂牌徽标 | K2 未获批 |
| 卡面印章 hover 放大 | 新交互功能，超视觉层授权范围 |
| home 版画配解说小字 | 玩家可见新文本 = 内容面，未授权 |

---

## 1. 配方

### H1 待机版画「冷炉待机」（home，320×200 暗底浅纹）

与五结局版画同族第六幅：熄着的炉子、门缝全暗、静止空气线、台面冷水与熄灭火柴
（未通电语义）。挂载于 home-body 底部（boot-line 之下），复用 M6 的 svh clamp
尺寸预算法（集成时实测 home 满屏 slack 后定参）。aria-hidden。

### H2 版画点亮（微动效）

POWER ON 后 1.15s 开机动画期间，版画从冷态（亮度压低）过渡到全亮——CSS
transition + 既有 boot 时序钩子；RM 下即时切换。视觉语义：设备通电、版画「醒来」。

### G1 炉膛内景（观察窗底层，480×120 超暗剪影，slice 铺满）

炉排/炉壁透视/烟道口/灰堆剪影 + 三点余烬。作为 `.observation` 内火焰层之下的
绝对定位背景（preserveAspectRatio slice）；余烬点透明度接 `--ember-level`
（M4 已有热度联动变量，heat 越高余烬越可见）。aria-hidden；RM 天然静态。

### G3 卡面印章（12 枚，96×96 纸面阳刻）

纸上墨刻 + 单点红语义焦点（C12 冷槽用 teal #2c625a 语义锚）。零字形。每卡语义
（对照 cards.ts 冻结内容）：

| 卡 | 印章语义 | 红焦点 |
|---|---|---|
| C01 咖啡记忆 | 咖啡杯 + 两缕蒸汽化作得分上行线 | 曲线顶点 |
| C02 晚自习 | 教学楼 + 唯一亮窗 + 月牙 | 亮窗（暖橙） |
| C03 升级插件 | 文件夹 + 脱开的齿轮 + 上行虚线箭头 | 箭头 |
| C04 奖金日历 | 3×3 日历格 + 滚格硬币 | 硬币 |
| C05 深夜噪声 | 排屋 + 唯一亮窗声波弧 + 其余窗暗 | 亮窗框与声波 |
| C06 原料涨价 | 三层料箱堆 + 上行虚线价格线 | 价格线 |
| C07 难度分降 | 上行难度阶梯 + 滚落的分点 + 原地能力锚 | 分点 |
| C08 高温报警 | 温度计一次冲高刻线 + 三月平直记录 | 高位刻线 |
| C09 两组误差 | 微倾天平 + 两盘近等高柱状 | 略高一柱 |
| C10 投诉回落 | 峰值前移的回落曲线 + 日刻 | 峰值点 |
| C11 东区车位 | 双分区车位图：东区两格全满+投诉标记 | 投诉标记 |
| C12 冷热双槽 | 左槽热浪右槽冷凝线（零字形） | 热浪 / teal 冷线 |

挂载：卡片头行「落款角章」位（64px，绝对定位于卡片呼吸区，文字容器预留角部
padding 防长文重叠——集成时按 pseudo-long ×1.7 校验）。aria-hidden。

### G4 周期转场微动效

NEXT INPUT 后新卡入场 fade + 上移 12px，140ms ease-out，CSS animation 一次性；
RM：animation: none（即时重排）。不动 e2e 时序断言（1150ms 反馈窗不受影响）。

### G5 炉门辉光脉冲

BURNING 950ms 反馈窗内 `.furnace-card` / 观察窗边缘一次辉光脉冲（keyframe：
box-shadow 0→峰值→0，与 M5 火光透射同窗）；RM：不播放。

---

## 2. 闸门结果（m7-batch/m7-batch.mjs，2026-09-09）

14/14 PASS（色板 ⊆ ART_WARM + C12 teal；svgo 优化；gzip 计量；sharp 渲染）。

| 族 | 件数 | gzip/件 | gzip 合计 |
|---|---|---|---|
| 卡面印章 | 12 | 329–381 B | 4.17 KB |
| home 版画 | 1 | 440 B | 0.43 KB |
| 炉膛内景 | 1 | 432 B | 0.42 KB |
| **合计** | **14** | — | **≈4.93 KB** |

bundle 现状 32.10 KB / 250 KB；集成后预计 +5–6 KB（含 G4/G5 CSS）。

## 3. 实机预览合成（DOM 注入，未动源码）

- `shots/m7-review/preview-home.png` — H1 注入 home；
- `shots/m7-review/preview-cycle.png` — G1 + G3 注入 C04 周期界面；
- `research/ai-pipeline/m7-batch/out/contact-sheet-cards.png` — 12 印章拼贴；
- `research/ai-pipeline/m7-batch/out/contact-sheet-scenes.png` — H1 + G1 拼贴。

视觉评审结论（analyze_image 走查）：home 版画与铭牌→按钮→版画垂直动线通顺、
气质契合、无冲突；周期界面印章「落款角章」零遮挡、炉膛内景层次正确不喧宾夺主。

走查修正（已应用）：C01 蒸汽三缕简化为两缕、上行曲线加粗（64px 可读性）。
集成期待办：印章对 pseudo-long ×1.7 长文的防重叠校验；home 版画与副文案间距收紧。

## 4. 集成批交付记录（2026-09-09 完成）

1. `src/ui/machine.ts`：CARD_SEALS（12）+ HOME_STANDBY + FURNACE_INTERIOR 常量与
   五处挂载/钩子（home 版画、H2 plate-lit@470ms、观察窗内景 prepend、印章浮动挂载、
   印章随周期切换）——§18.4 冻结文件结构零新增源文件；
2. `src/styles/machine.css`：`.home-plate`（tableau clamp）/ `.card-seal`（浮动落款）/
   `.furnace-interior`（z-index:-1 层于火光透射与火焰之下；`.embers` 基态 0.5、
   BURNING 增亮）；`motion.css`：mw-* 词汇表 + H2 冷态/点亮 + G5 door-glow；
3. 几何实测：home machine 842 零滚动（版画 140×88@900）；cycle machine 739、
   无水平溢出、印章 64px、Range 行盒字形级零遮挡（zh C1–C4 + en）；
4. `tests/material.test.ts` 44 → 50 条断言（六组：嵌入画幅/挂载与钩子/零文本/
   色板与 teal 限 C12/词汇表与 kill-switch/布局预算锁）；
5. 基线变更面精确命中：home×2 + cycle×3 重采；result×2 重生成后**字节不变**
   （实证：结局页无 M7 元素）；确定性双拍 10/10；
6. `npm run verify` 12 项全绿；UI_CONTRACT v5.0 写回（本批）。

## 5. 冻结面核对（本批不做）

玩法/公式/数值/Card 顺序/文案/音效/BGM/后端/网络/新设置项：零改动。
G3 为纯视觉层，不触碰 CONTENT_SPEC 文本与排版语义。
