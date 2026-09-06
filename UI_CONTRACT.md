# UI_CONTRACT.md — Context Furnace 视觉系统契约（P3）

> 依据 EXECUTION CONTRACT v1.0 §4（视觉冻结）与批准概念图板（P8，仅构图/层级/材质/色彩家族/交互强调）。
> **文本、数值、状态、语义一律来自 P0 DESIGN_SPEC / P1 CONTENT_SPEC / P7 TEST_MATRIX；概念图中的非规格内容一律不实现**（已核对并排除：开始游戏、语言选择页、三页教学、本轮完成结算屏、结局文案变体、SFX/全屏/高对比度设置、新标语）。
> 本契约取代 DESIGN_SPEC §15.1–15.2 的视觉方向（institutional lab）——该方向被 EXECUTION CONTRACT §4 冻结禁止；P0 其余章节（数值/流程/文案/结构）不受影响。授权来源：用户 2026-09-06 指令（选项 B，含 PENDING-HUMAN-REVIEW 标记）。

## 1. 设计系统

### 1.1 表面与材质

| Token | 值 | 用途 |
|---|---|---|
| --page | #0E0F0C（P0 保留） | 暖黑背景 + 轻微 vignette |
| --paper | #F3ECD9（P0 保留） | 全部卡片表面（纸片语言） |
| --ink / --muted-ink | P0 保留 | 纸上文字 |
| --heat | #A43A2F（P0 保留） | 主行动（IGNITE）、HEAT、选中标记 |
| --fidelity | #2C625A（P0 保留） | FIDELITY 弧、绿色语义 |
| --warning | #D4A72C（P0 保留） | 焦点/告警点缀 |
| --bench/--glass/--glass-line | P0 保留 | 暗色功能面（观察窗、状态条） |
| ~~--machine 系~~ | **弃用** | 机身金属语言整体移除（契约 §4） |

- 卡片：纸面、1px 暖灰描边、柔投影、轻微旋转（±0.35°，拼贴感）；禁止金属渐变/铆钉/烤漆。
- 标题强调字体：`"Kaiti SC","STKaiti","KaiTi","DFKai-SB",serif`（系统楷体栈，无下载）；正文/标签沿用 P0 §15.3 栈。

### 1.2 组件形态

| 组件 | 形态 |
|---|---|
| 仪表 | **弧形进度芯片**：纸片卡 + 标签 + SVG 弧（底弧玻璃灰，值弧红/绿，指针，数值）。无刻度、无表圈（区别于被禁的仪表盘） |
| 截取轨道 | 纸条上的分段块；裁刀 = 红色滑套手柄（竖条 + 握纹）；选中段红线下划标记，未选中淡化 |
| 增益 | 四枚纸片卡位（radiogroup，0–3），选中 = 红底白字；无旋钮形体（D13 的旋钮视觉随旧系统移除，卡位交互与键盘路径不变） |
| IGNITE | 红纸主按钮（ROUND_EDITING 中视觉主导） |
| RESET CUT | 幽灵纸按钮（永远次级） |
| NEXT INPUT | ROUND_RESULT 中出现并成为主导红钮 |
| 观察窗 | 深色玻璃卡（--glass），glyph 语言不变（§10） |
| 炉口视窗 | ROUND_BURNING 期间显示的深色炉口卡：火光渐变 + 纸带（状态沟通，§6） |
| 状态条 | 深色卡（--glass），机器消息 |

### 1.3 布局（ROUND_EDITING，桌面）

```text
HEADER  CF-01 · 周期 nn/12 · 中文/EN · ⚙
ROW1    [ 原料 INPUT（纸卡，选中段红标） ][ 成品 OUTPUT（纸卡） ]
ROW2    [ 截取 SELECT 纸条轨道（全宽） ]
ROW3    [ 复原 | 增益 0 1 2 3 | 入炉 IGNITE ]  [ HEAT 芯片 ][ FIDELITY 芯片 ]
ROW4    [ 观察窗 ]
ROW5    [ 状态条 ]（+ 炉口视窗仅 ROUND_BURNING）
```

## 2. STATE IMPLEMENTATION TABLE（契约 §5）

| REFERENCE STATE | COMPONENT | SPEC SOURCE | CONTENT SOURCE | STATE SOURCE | VISUAL ROLE | INTERACTION ROLE | EXPECTED DOM ROLE | STATUS |
|---|---|---|---|---|---|---|---|---|
| LANDING | 标题纸卡 | §6–7 | P1 home.* | HOME_OFF | 主视觉 | — | main>h1 | DONE |
| LANDING | 启动钮 | §7 | P1 home.power | HOME_OFF | 唯一主行动 | POWER ON | button | DONE |
| LANDING | 头部工具 | §66 | — | HOME_OFF | 三级 | 语言/设置 | button×2 | DONE |
| BOOTING | 圆窗自检 | §2.2 | — | BOOTING | 状态沟通 | — | div（动画） | DONE |
| TUTORIAL | 教学纸卡 | §10–12/D8/D35 | P1 tutorial.* | TUTORIAL | 引导 | 任意时刻 IGNITE | section | DONE |
| ROUND_EDITING | INPUT 纸卡 | §4.1/D14 | P1 C{nn}.segments | ROUND_EDITING | 主信息媒介 | — | section/p | DONE |
| ROUND_EDITING | OUTPUT 纸卡 | §4.1/§6.5 | P1 card.gain | ROUND_EDITING | 预览 | — | section/p | DONE |
| ROUND_EDITING | SELECT 轨道 | §6/D14/D32 | — | ROUND_EDITING | 主裁刀 | 边界调整 | group+button×2 | DONE |
| ROUND_EDITING | GAIN 卡位 | §7/§27/D13 | — | ROUND_EDITING | 加工档位 | radiogroup | radio×4 | DONE |
| ROUND_EDITING | HEAT/FIDELITY 芯片 | §5/§128 | — | ROUND_EDITING | 双指标 | — | meter | DONE |
| ROUND_EDITING | IGNITE / RESET | §6.3/§8.2 | P1 btn.* | ROUND_EDITING | 主/次行动 | 结算锁定 | button | DONE |
| ROUND_BURNING | 炉口视窗 | §8.3/D26 | — | ROUND_BURNING | 状态沟通 | 锁定 | div | DONE |
| ROUND_RESULT | 状态条/NEXT | §12/§8.1 | P1 msg.*/btn.next | ROUND_RESULT | 反馈 | 下一份 | div/button | DONE |
| ENDING | 横幅+结果 | §13–14/D16/D33 | P1 ending.*/result.* | ENDING | 终局信息 | 复制/重开 | section/button | DONE |
| 全局 | 设置/关于 | §17/D31 | P1 settings.*/about.* | 任意 | 三级 | 五项设置 | dialog | DONE |
| 全局 | 观察窗 | §10/D24/D25/D29 | — | 随结算演化 | 隐喻 | aria-hidden | div | DONE |

## 3. 明确不实现（概念图排除清单）

开始游戏/Play Game、语言选择页、多页教学与欢迎语、本轮完成结算屏（含 +28/−12 类增量）、
结局文案变体与新标语、SFX/全屏/高对比度设置、Play Again/Back to Home 双钮、
猫/书桌/打字机/盆栽等装饰场景、页脚标语。基线随本契约重采（PENDING-HUMAN-REVIEW 记录）。
