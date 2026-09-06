# UI_CONTRACT v3 — 设计规格 + 可执行 UI 契约（Art Direction: 概念图 2026-09-06-e1a7）

> 约束体系已由产品所有者解除（2026-09-06 指令）。本契约 = 流水线第 1、2 步（设计规格 → 可执行 UI Contract）。
> 行为、数值、文案不变（领域层不动）；本版仅重定义视觉与布局。布局/几何断言见 §5，供第 6 步测试。

## 1. Art Direction（概念图提炼）

暖灰泥色（putty）明亮台面；居中**深炭黑大圆角面板**承载全部工作区；面板内衬白纸卡；
红（HEAT）/绿（FIDELITY）弧形仪表；红色为主行动色；GAIN 恢复旋钮形态（带 0–3 卡位）；
左主（原料→截取→成品）右辅（仪表→增益→按钮）双栏；底部通栏观察窗与消息条。
双语小标签（「原料 INPUT」式）配红色圆点前缀。

## 2. 设计 Tokens（可执行）

```css
--bg: #BCB4A3;          /* 暖泥色台面 */
--bg-deep: #ACA392;     /* 台面边缘渐隐 */
--panel: #2E312B;       /* 深炭黑面板 */
--panel-edge: #1F211D;
--panel-line: #4A4E44;  /* 面板内分隔线 */
--paper: #F7F2E4;       /* 纸卡 */
--paper-edge: #D8D2C0;
--ink: #1C1E19;         /* 纸上文字 */
--on-panel: #D6D1C0;    /* 面板上浅文字（AA on --panel） */
--on-panel-dim: #A9A493;
--heat: #A43A2F;
--heat-bright: #C0503F; /* 深底上的红（弧线/强调） */
--fidelity: #3E7A6B;
--fidelity-bright: #4E9683;
--warning: #D4A72C;
--r-panel: 18px; --r-card: 8px;
--font-title: "Kaiti SC","STKaiti","KaiTi","DFKai-SB",serif;
```

文本对比度规则：纸上用 --ink；面板上用 --on-panel/--on-panel-dim；红/绿仅作弧线、填充、
按钮底（白字），不作为面板上的正文色。

## 3. 布局几何（1440×900 基准）

```text
page padding 28px
HEADER（浅底）：左「CF-01 语境精炼装置 · CONTEXT FURNACE」/ 右「周期 06 / 12 · 中文/EN · ⚙」高 40px
DARK PANEL：宽 min(1040px, 100%−48px)，radius 18px，padding 24px，居中，距 header 16px
  GRID：左列 1fr（≈600px）｜右列 300px｜gap 24px
  左列（主链，上→下）：
    INPUT  纸卡（label 12px + 正文 17px/1.8）
    SELECT 轨道区（纸条块 26px 高 + 裁刀 48×48）
    OUTPUT 纸卡（红色左竖条 4px）
  右列（上→下）：
    GAUGES 两枚并排，各宽约 138，弧 110×56 + 数值 26px
    GAIN   旋钮 72px 圆 + 下方 4×44px 卡位
    BUTTONS 入炉 h56 全宽（主）；复原 h44 幽灵（次）
  底部通栏：
    OBSERVATION h96
    STATUS h36
MOBILE（<760px）：单列。顺序 仪表→原料→截取→成品→增益→按钮→观察窗→消息
```

## 4. 组件规格

| 组件 | 规格 |
|---|---|
| 纸卡 | --paper、radius 8、1px --paper-edge、投影 0 8px 18px rgba(0,0,0,.35) |
| 面板标签 | 12px --on-panel-dim + 红点 6px 前缀，格式「原料 INPUT」 |
| 轨道块 | 纸色；选中段 --paper + 底部 2px --heat-bright；未选中 透明度 .35 + 斜纹 |
| 裁刀 | 红色竖柄（18×26 视觉 / 48×48 hit），顶部圆钮；focus 黄圈 |
| 弧仪表 | 底弧 --panel-line 8px；值弧 --heat-bright/--fidelity-bright 8px 圆帽；白数值 26px |
| GAIN 旋钮 | 72px 深底圆 + --warning 指针，rotate −60°..+60°；下方 4 卡位 radiogroup（选中红底白字） |
| 入炉 | --heat 底、白字、h56、radius 8、主导 |
| 复原 | 透明底、--on-panel 字、1px --panel-line 边、h44 |
| 观察窗 | #23261F 底、radius 8、内 glyph 不变 |
| 消息条 | #23261F 底、--on-panel 字 14px |

## 5. 布局/几何测试矩阵（第 6 步断言来源）

| # | 断言 |
|---|---|
| G1 | header 底边在 panel 顶边之上（header 先于面板） |
| G2 | INPUT 卡顶边 < SELECT 顶边 < OUTPUT 顶边（左列主链垂直序） |
| G3 | 两仪表在水平向位于 INPUT 卡右缘右侧（右列在左列右） |
| G4 | IGNITE 尺寸 ≥ 48×48 且 4 边都在视口内 |
| G5 | 观察窗横跨两列（宽度 > INPUT 卡宽度） |
| G6 | 360px 视口无横向滚动（scrollWidth ≤ innerWidth） |
| G7 | 裁刀 hit 区域 ≥ 48×48；GAIN 卡位 ≥ 44×44 |
| G8 | 面板左缘与视口左缘间距 > 0 且左右间距差 ≤ 40px（居中） |

## 6. 概念图不实现项（AI 伪影）

图内无法辨读的小字、装饰刻度细节、任何与既有文案表冲突的字串。
