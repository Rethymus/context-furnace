# UI_CONTRACT.md — Context Furnace 视觉系统契约（P3）

> 依据 EXECUTION CONTRACT v1.0 §4（视觉冻结）与批准概念图板（P8，仅构图/层级/材质/色彩家族/交互强调）。
> **文本、数值、状态、语义一律来自 P0 DESIGN_SPEC / P1 CONTENT_SPEC / P7 TEST_MATRIX；概念图中的非规格内容一律不实现**（已核对并排除：开始游戏、语言选择页、三页教学、本轮完成结算屏、结局文案变体、SFX/全屏/高对比度设置、新标语）。
> 本契约取代 DESIGN_SPEC §15.1–15.2 的视觉方向（institutional lab）——该方向被 EXECUTION CONTRACT §4 冻结禁止；P0 其余章节（数值/流程/文案/结构）不受影响。授权来源：用户 2026-09-06 指令（选项 B，含 PENDING-HUMAN-REVIEW 标记）。
>
> **本文件由 §4 修订（Material & Motion Layer，v3，2026-09-06）扩展**：授权来源为用户同日指令（Apple 材质/动效研究 + 长周期优化计划 + 自主实施）。§4 与 §1–§3 并读；冲突处以 §4 为准。P0 玩法、全部玩家可见文本、§9 数值、§17.1 五项设置、无障碍与 Reduced Motion 义务不变。

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

---

## 4. 修订 v3 — Material & Motion Layer（Apple 材质/动效层，2026-09-06）

> **授权来源**：用户 2026-09-06 指令——深入研究 Apple 材质/毛玻璃/弹簧动效/阻尼感，
> 建立"可复用材质层"，浅色/深色双外观，主面板接入真实屏幕采样模糊；自主实施。
> 本节把该指令落为**参数化契约**：所有视觉决策收敛为一套 token，禁止散落魔数。

### 4.1 研究结论 → 契约参数（调研依据）

| 研究对象 | 结论 | 本项目落点 |
|---|---|---|
| HIG Materials（ultraThin/thin/regular/thick/chrome） | 材质厚度 = 模糊半径 + 填充不透明度的单调阶梯；同档材质在同外观下渲染一致；材质不得叠材质 | 三档纸面材质（`--mat-paper-thin/regular/thick`）+ 两档深色玻璃（`--mat-glass`/`--mat-chrome`），见 §4.3 |
| HIG 深浅色模式 | 同名材质在不同外观下**填充不透明度不同**（浅色白基、深色黑基），保证任意背景下文字可读；前景 label 按 primary/secondary/tertiary 透明度分层 | `:root` 浅色缺省 + `@media (prefers-color-scheme: dark)` 覆盖同一批 token 名（§4.4）；文字三档 `--ink`/`--ink-soft`/`--ink-faint` 与玻璃侧 `--glass-ink` 阶梯 |
| Vibrancy | 前景随材质取色增反；层级透明度 ≈ 1 / 0.62 / 0.38 | 面板标签用 `--ink-soft`，正文 `--ink`；玻璃面标签 `--glass-ink-soft`、正文 `--glass-ink` |
| SwiftUI spring（`response:dampingFraction:`；iOS 17 `duration:bounce:`；`.smooth/.snappy/.bouncy`） | `bounce 0` = 临界阻尼（仪器类）；`≈0.15` = 轻过冲（控件）；`≈0.3` = 明显过冲（浮层/toast）；按压"快进慢出" | CSS 三弹簧（§4.5）：`--spring-smooth`（临界，仪表/位移）、`--spring-snap`（轻过冲，按压回弹/裁刀）、`--spring-bouncy`（过冲，toast/浮层）；无 JS spring，CSS transition 原生可重定目标 |
| 阻尼感（damping） | 过冲量与表面积成反比：微交互零过冲、大浮层允许一次可见回弹；attack ≤ 120 ms，release 300–500 ms | `--press-in: 90ms` 加速曲线、`--press-out: 340ms` 弹簧回弹；所有可按压件共用（§4.6） |
| 指数衰减 shake（Sisyphus/impact 模型） | `x(t)=A·e^(−t/τ)·sin(2πft)`，A≈3px、f≈18Hz、τ≈150ms | `.machine.burning` 入炉 shake 480ms，关键帧幅度按 e^(−t/τ) 取点；仅完整动效（RM/冻结禁用） |
| MDN overflow | `overflow:hidden` 产生可编程滚动容器；`overflow:clip` 纯裁切更符合"绝对禁止水平滚动" | `html/body` 改 `overflow-x: clip`（`hidden` 兜底）；对话框 `overscroll-behavior: contain` 防滚动链 |
| backdrop-filter | 过滤元素背后**已绘制内容**；需半透明填充才能看见；随 border-radius 裁切；成本 ∝ 层面积 | `.stage` 增加静态环境光场（`::before`，无动画、确定性）供采样；面板 `backdrop-filter: blur+saturate`；`@supports not (backdrop-filter:…)` 时提升填充不透明度兜底 |

### 4.2 中性色阶（Apple 结构、暖色载体）

按 Apple systemGray 阶梯结构建立**暖中性阶**（n0 最深 → n9 最浅），浅/深色各一套，仅存在于
`tokens.css`；组件一律引用 token，禁止直接写颜色字面量（既有语义色 `--heat/--fidelity/--warning/--paper/--ink` 保留）。

### 4.3 材质层（可复用工具类，落在 `base.css`）

| 类 | 组成 | 用于 |
|---|---|---|
| `.mat-paper` | 半透明纸填充 + `backdrop-filter: blur(22px) saturate(1.35)` + 1px 发丝边 + 顶部内高光 + 环境投影 | FEED/OUTPUT/EXTRACT 面板、仪表芯片 |
| `.mat-paper-thick` | 同上，填充不透明度更高、blur 26px | 结果列表、教学卡 |
| `.mat-glass` | 深色半透填充 + blur(18px) saturate(1.2) + 发丝边 + 内高光 | 观察窗、状态条、炉口 |
| `.mat-chrome` | 最厚档（glass 基础上加厚填充） | 工具按钮、toast、对话框 |
| 兜底 | `@supports not (backdrop-filter: blur(1px))` → 填充不透明度提升至不透明档 | 老引擎 |

阴影/高光/发丝边全部 token 化：`--shadow-panel`、`--edge-highlight`、`--hairline`；浅深色各自给值。

### 4.4 外观模式（浅/深）

- 机制：**系统跟随**（`prefers-color-scheme`），不新增设置项（§17.1 五项不变，AGENTS.md 白名单不变）。
- 浅色：暖浅台面（环境光场更亮），纸面材质不透明度略降、玻璃面填充加厚；
  深色：延续现暖黑台面，纸面材质微透、玻璃面填充减薄。
- 纸面文字恒为 `--ink` 系（两模式同值），玻璃面文字恒为 `--paper` 系；对比度以
  `scripts/check-contrast.mjs`（D43 类开发工具）按**最坏背景合成**计算并留存记录，全部 ≥ WCAG AA。
- 测试：Playwright 缺省 light → 8 张基线重采为浅色外观（PENDING-HUMAN-REVIEW）；深色外观以
  `scripts/smoke-visual.mjs` 扩展的 `colorScheme:'dark'` 截图做人工复核项，**首个人工会话必须复核两套**。

### 4.5 动效 token（`tokens.css` 集中管理）

```text
弹簧  --spring-smooth: cubic-bezier(0.32, 0.72, 0, 1)      ← iOS sheet 族，临界阻尼
      --spring-snap:   cubic-bezier(0.34, 1.30, 0.64, 1)   ← 轻过冲 ≈ .snappy(bounce .15)
      --spring-bouncy: cubic-bezier(0.34, 1.56, 0.64, 1)   ← 过冲 ≈ .bouncy(bounce .3)
时长  --press-in 90ms / --press-out 340ms / --dur-move 380ms
      --dur-gauge 550ms / --dur-overlay 420ms / --dur-toast-in 480ms / --dur-toast-out 240ms
按压  --press-scale: 0.97（大面积 0.985）
```

### 4.6 交互效果映射（与既有规格时序共存）

| 效果 | 落点 | 约束 |
|---|---|---|
| 按压反馈对 | `.btn` / `.btn-primary` / `.gain-stop` / `.tool-btn` / `.cutter` / 插头 | 静止↔按下成对定义；attack 90ms、release 340ms 弹簧；`:disabled` 不参与 |
| 竹简槽弹簧 | `.cutter` 的 `left` 位移（拖拽中 `.active` 关闭 transition） | 380ms `--spring-snap`；键盘/点轨/拖拽释放均有回弹；RM/冻结关闭 |
| 浮层入场 | 设置对话框 backdrop 淡入 + dialog `translateY(18px) scale(0.96)→1` 420ms sheet 曲线 | D3 Escape 行为不变；关闭为**即时卸载**——退场动画的定时器卸载在渲染节流（并行负载下 WebKit 移动仿真）下不可靠，确定性优先 |
| 推石 shake | `.machine.burning` 480ms 指数衰减水平 shake | 仅完整动效；RM（§2.3 明确禁设备震动）与 `?freeze=1` 关闭；§8.3 时序窗口不动 |
| toast 弹簧入场 | GAIN 解锁 toast：`translateY(16px)→0` + `--spring-bouncy` 480ms；退场 240ms 下沉淡出 | §27 1.2 s 显示时长不变（D16「已复制」同构造） |
| 周期装载 | `.machine` 子面板 220ms 淡入上升 4px | RM/冻结关闭 |

**统一禁用面**：`[data-motion='reduced']`、`prefers-reduced-motion: reduce`、`[data-freeze='1']`
三者下，以上全部动画/过渡关闭（保留 opacity/数值/指示灯表达）；`?freeze=1` 扩展为全局
`transition/animation: none`（D29 测试基础设施硬化，生产无此参数）。

### 4.7 长周期优化路线图（后续会话按此推进，逐阶段可验证）

| 阶段 | 内容 | 验收 |
|---|---|---|
| M1（本次） | 色阶 + 材质层 + 双外观 + backdrop 采样 + §4.6 全部动效 + 对比度脚本 + 基线/README 媒体重采 | verify 12 项绿；contrast 记录全 AA；截图人工可读性复核（PENDING-HUMAN-REVIEW） |
| M2 | 焦点/命中态统一审计：全部可交互件 press 对齐、focus ring 一致性、44/48px 目标复核 | accessibility.spec 绿 + 新增 smoke 截图 |
| M3 | 深色外观正式基线（需 Playwright 项目扩展或独立采集通道）→ 人工复核后并入 D28 双套体系 | 深色 8 张基线 + CI Linux 通道 |
| M4 | 环境光场随局内状态演化的确定性模型（固定种子，冻结开关覆盖） | D29 确定性 + 快照稳定 |
| M5 | 性能预算复核：backdrop 层面积/数量、低端设备帧率抽查 | idle CPU ≈ 0（§6 性能断言） |

> M2–M5 为方向授权，每次实施仍须逐条对照 §2 禁止清单并在本文件补记执行情况；
> 涉及快照/基线的变更一律按 D27/D28 标记 PENDING-HUMAN-REVIEW，不得声称"UI 已确认"。

### 4.8 M1 执行记录（2026-09-06）

- **已落地**：`tokens.css`（中性阶/材质/动效 token，浅色 media 覆盖）、`base.css`（`.mat-paper/`
  `.mat-paper-thick/.mat-glass/.mat-chrome` 工具类 + `@supports` 兜底 + 统一焦点环 +
  `overflow-x: clip`）、`machine.css`（环境光场 `.stage::before`、token 化排版、仪表弹簧过渡）、
  `controls.css`（按压反馈对、裁刀槽弹簧、toast 弹簧、浮层入场/退场）、`motion.css`
  （mount-rise、press-shake 指数衰减、RM/freeze 全局硬化）；TS 侧仅挂材质类与对话框退场时序
  （`settings.ts` close 220ms，RM 即时）。
- **对比度记录**：`node scripts/check-contrast.mjs` → **32/32 PASS**（两外观 × 最坏背景合成，
  全部文字 ≥4.5:1、大字/非文字 ≥3:1、弧槽按装饰豁免另列）。过程中修正：深色 `--ink-faint`
  加深至 `#44433a`（原 `#55544a` 仅 4.19:1）、观察窗 glyph 改 `currentColor`（原硬编码浅灰在
  浅色玻璃上不可见——视觉探查发现、代码审查未发现的问题）。
- **视觉探查记录**：`shots/material/` 12 张（浅/深 × 首页/主界面/设置/入炉/toast/RM/按压/移动端），
  供首次人工会话复核。修复：观察窗缺失材质类、对话框按钮材质叠材质改内嵌芯片。
- **基线**：8 张 Chromium 基线已按浅色外观重采（本地 Windows；`PENDING-HUMAN-REVIEW`）。
  CI Linux 套需人工触发 `update-baselines.yml`（D28 通道）。深色外观暂无快照基线（M3）。
- **README 媒体**：`npm run capture:readme` 重录（gif 3.93 MiB ≤ 4 MiB，其余达标）。
- **备注**：`capture-readme-media.mjs` 采到的是 Cycle 03 结算态（脚本既有行为，与
  PRESENTATION_SPEC §15「Cycle 04」存在既有偏差），本次不修改采集脚本，留待人工裁决。
