# UI_CONTRACT v3 — 设计规格 + 可执行 UI 契约（Art Direction: 概念图 2026-09-06-e1a7）

> 约束体系已由产品所有者解除（2026-09-06 指令）。本契约 = 流水线第 1、2 步（设计规格 → 可执行 UI Contract）。
> 行为、数值、文案不变（领域层不动）；本版仅重定义视觉与布局。布局/几何断言见 §5，供第 6 步测试。

---

# UI_CONTRACT v4 — 材质与动效系统（Apple 范式落地，2026-09-08 所有者指令）

> v4 在 v3 布局与概念板语言**不变**的前提下，建立可验证的「材质层 + 动效令牌」体系。
> 领域层、几何断言（§5 G1–G8）、文案、§15.2 冻结色（--heat/--fidelity/--warning）一概不动。
> 验收锚点：`tests/material.test.ts`（并入 verify 的 test:unit）+ 双平台视觉基线。

## v4.0 调研依据（可溯源）

| 来源 | 采纳结论 |
|---|---|
| SwiftUI `spring(response:dampingFraction:blendDuration:)`（默认 .5/.825/0，Apple 文档 JSON） | 弹簧以「响应时长 + 阻尼分数」定义；临界阻尼=1 无过冲；控件默认带轻微弹性 |
| HIG Materials（2025-09 修订版） | 材质分「内容层标准材质」与「浮动功能层（Liquid Glass）」；regular/clear 双变体；亮内容上 clear 需 35% 压暗；厚材质保对比、薄材质保上下文；vibrancy 分级，禁 quaternary 上薄材质 |
| HIG Dark Mode | 语义令牌双值（Any/Dark）；base 暗退、elevated 提亮；软化白背景防发光；对比 ≥4.5:1（小字力求 7:1）；**不做应用内外观开关，跟随系统**；Reduce Transparency / Increase Contrast 须单独可测 |
| MDN backdrop-filter（Baseline 2024） | 需半透明叠色才可见；**backdrop root 陷阱**：祖先 opacity<1 / filter / mix-blend 会截断采样——浮动玻璃只挂在 body 级（dialog/toast 满足）；入场动画结束态必须 opacity=1 |
| MDN overscroll-behavior | 模态内滚动 `contain`（阻断滚动链、保留自身回弹）；无溢出容器恒处边界 → backdrop 上 `contain` 可无 JS 阻断页面穿透 |

## v4.1 中性亮度阶与双外观

`--n0..--n5` 暖中性 6 级（Apple systemGray 式），浅/深双值；全部表面与文字经语义令牌引用。
深色映射：desk→暗调书桌语汇（沿用 stage--home 词汇）、machine→深焙烤漆、paper→软化米白
（#cfc8b4，ink 对比 ≈9.8:1，防发光）、coal 系近恒定。外观只随 `prefers-color-scheme`，
无应用内开关（HIG）。Playwright e2e 默认 light → 既有基线不因深色受扰。

## v4.2 材质层 recipe（可复用，非逐例调色）

```css
/* 浮动功能层玻璃（toast / cycle-plate / tool-btn） */
background: var(--glass-float-bg);            /* ≈0.78–0.82 叠色 */
backdrop-filter: blur(var(--mat-blur-m)) saturate(var(--mat-sat));  /* 18px / 1.35 */
border: 1px var(--glass-float-edge); inset 0 1px 0 var(--hi-light);

/* 深面玻璃（dialog / 观察窗 / 状态条） */
background: 暗调半透明(≤0.9); backdrop-filter: blur(10–18px) saturate(1.2–1.35);

/* 厚材质（machine-panel 内容层主承载面） */
8% 半透叠色（color-mix 92%）+ blur(--mat-blur-l)=26px —— 台面渐变透出层次，保纸卡对比。
```

降级矩阵：`prefers-reduced-transparency: reduce` → 全部落回不透明（blur=0）；
`prefers-contrast: more` → 焦点环 4px 加深、次级文字加深。Safari 不支持的属性自然回退。

## v4.3 动效令牌（SwiftUI 语义 → CSS 近似）

| 令牌 | 值 | 对应 SwiftUI 语义 | 用途 |
|---|---|---|---|
| `--spring-smooth` | 320ms cubic-bezier(.22,1,.36,1) | response .5 / 临界阻尼 | 面板装载、指针/弧线、sheet 入场 |
| `--spring-snappy` | 300ms cubic-bezier(.26,1.16,.36,1) | response .5 / bounce≈.15 | 按钮回弹、裁刀槽、旋钮卡位 |
| `--spring-bouncy` | 420ms cubic-bezier(.34,1.44,.5,1) | response .5 / bounce≈.3 | 仅小面积点缀（toast 入场） |
| `--press-in` | 110ms cubic-bezier(.3,0,.7,.4) | 按下沿（快入位） | :active 覆盖回弹沿 |

**按压反馈对**：transform 位移与厚度阴影**成对同动**；基线 transition=回弹沿，:active 覆盖=按下沿。
**直控零延迟原则**：拖拽（pointer capture）一律 1:1 即时（.dragging 禁过渡）；弹簧只用于
释放、键盘步进、程序性归位。推石 shake 指数衰减（A=5px·f=3.5Hz·τ=200ms）维持 v3 冻结参数。
阻尼：dialog 与 backdrop `overscroll-behavior: contain`；body `overscroll-behavior-y: none`。
全部新动效处于既有 RM/freeze 全局 kill-switch 覆盖之下（0.01ms 退化）。

## v4.4 焦点环（M1 修复：审计 1.36:1 → 合规）

浅色 `--focus-ring: #7a5f10`（vs machine ≈3.3:1，WCAG 1.4.11 非文本 ≥3:1）；
深色回到琥珀 #d4a72c（≈6.9:1）；`prefers-contrast: more` 加粗至 4px 并加深。

## v4.5 长周期批次（每批验收 = material.test.ts 断言扩展 + 基线重采 + verify 全绿）

| 批次 | 内容 | 状态 |
|---|---|---|
| M1 地基 | 中性阶、双外观、材质 recipe 接入（panel/observation/status/dialog/toast/plate/tool-btn）、动效令牌、按压反馈对、槽弹簧+拖拽旁路、指针阻尼、浮层入场、焦点环修复、overscroll 阻尼、降级矩阵 | **本次交付** |
| M2 层次深化 | 燃烧/结局舞台与玻璃联动（火光透射观察窗）、tool 按钮悬浮态 specular、教学便签纸材质化、ending 幕玻璃 | 计划 |
| M3 性能与降级审计 | 采样模糊 GPU 层级梳理（避免大面积 blur 叠加）、Safari/旧引擎回退矩阵实测、reduce-transparency/contrast 全链路走查 | 计划 |
| M4 液态玻璃语汇 | 控件激活态边缘 specular 高光、按压液感（cap 高光位移）、旋钮卡位定位感（微过冲调参）、跨引擎基线固化 | 计划 |

## v4.6 可验证性

`tests/material.test.ts` 静态断言：令牌完整性（模糊三档/饱和/玻璃三层/焦点环/弹簧四令牌/双外观块/
降级矩阵）、按压反馈对（:active 必须同时改 transform+box-shadow+transition）、直控旁路（.dragging）、
浮层入场（toast-in/sheet-in）、滚动阻尼（contain ×2）、推石 shake 参数注释锁定、
防硬化回归（styles/*.css 禁新增裸 hex——白名单枚举既有项）。
运行时契约：审计脚本 `scripts/audit-ui.mjs`（对比度/计算样式/深色适配采集，不入 verify）。


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
