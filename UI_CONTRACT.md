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
| M1 地基 | 中性阶、双外观、材质 recipe 接入（panel/observation/status/dialog/toast/plate/tool-btn）、动效令牌、按压反馈对、槽弹簧+拖拽旁路、指针阻尼、浮层入场、焦点环修复、overscroll 阻尼、降级矩阵 | **已交付** |
| M2 层次深化 | 燃烧/结局舞台与玻璃联动（火光透射观察窗）、tool 按钮悬浮态 specular、教学便签纸材质化、ending 幕玻璃 | **已交付（本次，见 v4.7）** |
| M3 性能与降级审计 | 采样模糊 GPU 层级梳理（避免大面积 blur 叠加）、Safari/旧引擎回退矩阵实测、reduce-transparency/contrast 全链路走查 | **已交付（审计报告 `shots/audit/m3-report.md`；P0 全修 + P1 三条处置见 v4.7）** |
| M4 液态玻璃语汇 | 控件激活态边缘 specular 高光、按压液感（cap 高光位移）、旋钮卡位定位感（微过冲调参）、跨引擎基线固化 | **已交付（2026-09-08 所有者批复 K3，见 v4.8）** |
| M5 插画与沉浸语汇 | IL-1 炉膛余烬床、IL-2 台面工业印记、IL-3 Act 铭牌蚀刻、IL-4 结局幕插画层、IL-5 纸带纤维纹理（非叙事、CSS/SVG-only、零新文本） | **已交付（2026-09-08 所有者批复 K2 全项，草案 `UI_CONTRACT_M5_DRAFT.md`，见 v4.8）** |
| M6 结局版画（LLM 直写 SVG） | 五结局木刻版画板（模型直写矢量、子色板闸门、aria-hidden 零文本），生成方式与研究依据见 `AI_ILLUSTRATION_RESEARCH.md` 与 `research/ai-pipeline/` | **已交付（2026-09-09 所有者授权「授权你 LLM 直写 SVG」+「授权执行」，见 v4.9）** |
| M7 全程插画与微动效（LLM 直写 SVG 第二批） | 12 卡面印章（浮动落款）+ home 待机版画（boot 点亮）+ 观察窗炉膛内景 + mw-* 动画词汇表（K5 追加：插画动画化，CSS-SVG 而非 GIF），人工预览门后集成，见 v5.0 与 `UI_CONTRACT_M7_DRAFT.md` | **已交付（2026-09-09 所有者批复 K1–K5：预览门「可以」+「还需要加入动画或者gif」）** |

## v4.6 可验证性

`tests/material.test.ts` 静态断言：令牌完整性（模糊三档/饱和/玻璃三层/焦点环/弹簧四令牌/双外观块/
降级矩阵）、按压反馈对（:active 必须同时改 transform+box-shadow+transition）、直控旁路（.dragging）、
浮层入场（toast-in/sheet-in）、滚动阻尼（contain ×2）、推石 shake 参数注释锁定、
防硬化回归（styles/*.css 禁新增裸 hex——白名单枚举既有项）。
运行时契约：审计脚本 `scripts/audit-ui.mjs`（对比度/计算样式/深色适配采集，不入 verify）。

## v4.7 M2 交付 + M3 修复批（2026-09-08）

依据：M3 审计报告 `shots/audit/m3-report.md`（数据 `shots/audit/m3-data.json`，本批
修复后已复跑）。本批 = v4.5 表 M2 四项 + M3 的 P0 全部与 P1 三条；行为/文案/数值/
几何断言零改动，hex 白名单零扩册（新颜色全部为 rgba 令牌）。

### M3-P0（规格符合性，已修）
- **P0-1 RT 四表面未落回不透明**：`.machine-panel` / `.observation` / `.status-line` /
  `.dialog` 背景端点改引双外观令牌——厚材质族 `--mat-thick-bg/-hi/-lo`
  （color-mix 92% 经 var(--machine-*) 惰性解析：浅/深由深色块的 machine 覆写自动接管，
  计算值与令牌化前字面值逐像素一致）；深面玻璃族逐面端点 `--glass-obs-hi/lo`、
  `--glass-status-hi/lo`、`--glass-sheet-hi/lo`（浅/深同值冻结——暗玻璃双外观本就同像素，
  深色块无需覆写）。RT 块内全部落回不透明 `var(--machine*)` / `var(--coal*)` 实色。
  观察窗背景的径向微光层并入 `.observation::after`（微光色 (228,222,203) 与字形描边
  --on-coal 同色，层序调整像素中性），保证 RT 下四表面 backgroundImage 无半透明端点、
  实色化可判定。实证：win32 重采中 home×2 / cycle×3 / settings-mobile 基线逐字节不变；
  audit-perf 降级矩阵走查结论翻转（四表面 RT 实色化 ✅）。
  复盘修正（同日收尾批）：深色块曾遗留 M1 期旧值 `--mat-thick-bg: rgba(58,53,42,.94)`
  （彼时无表面消费、零视觉效应），本批接线后令渐变中段 α 0.92→0.94 偏离字面 color-mix
  （audit dark 组合实测捕获），已移除归一——dark 全三端点恢复惰性解析 /0.92，并在
  material.test.ts 加「深色块禁覆写厚材质端点」断言防回归。

### M3-P1（应修 3 条处置）
- **P1-1 RT 下 backdrop-filter 整体置 none**：RT 媒询块（tokens.css）对 8 个玻璃选择器
  （machine-panel / cycle-plate / tool-btn / observation / status-line / toast /
  dialog-backdrop / ending-wrap，含 -webkit- 双写）`backdrop-filter: none`——消灭
  blur(0px) 残留的采样图层与 saturate 采样 pass。
- **P1-2 mount-rise 截断窗口（CSS 层收敛，动画本体保留）**：玻璃祖先
  （`.machine > .machine-header / .machine-panel / .ending-wrap`）入场改 transform-only
  （`@keyframes mount-rise-solid`，仅 translateY 4px、无 opacity），入场全程 opacity=1、
  backdrop 采样完整，「玻璃点亮突跳」消除；非玻璃小面（load-line 等）保留淡入。
  未删入场动画、未改 DOM、未引入 JS。**残余风险**：(a) click → renderCycle 的
  ~340ms 应用层渲染延迟属 JS 侧（m3-report 涉 machine.ts 时机，本批明确不动），
  动画名义 220ms 前的空窗依旧存在；(b) toast-in（420ms）与 sheet-in（320ms）+
  fade-in（200ms）的自身淡入仍产生瞬态自截断（60–193ms / 48–331ms，小面积瞬态，
  审计未列 P1，保留现状）。
- **P1-3 dialog 三层 blur 通道冗余**：`.dialog` 移除自有 backdrop-filter——其 backdrop
  根为 `.dialog-backdrop`（blur 6px），18px 自采层只能模糊纯色 scrim，视觉无效、
  纯采样开销（m3-report §1.3/§3.1）；scrim blur(6px) 与 panel blur(26px) 两层保留。
  视觉等价性实证：settings-mobile 基线重采逐字节不变。

### M3-P2（按报告决议不动）
- P2-1 `ignite-hint-pulse` 常驻 box-shadow 脉冲、P2-2 小面积 repaint 动画、
  P2-3 box-shadow 按压反馈对——均按 m3-report §6 的保留/观察决议，本批未触碰
  （P2-3 系 v4.3 契约语义必须项）。

### M2 层次深化（四项交付）
1. **火光透射观察窗**：`.observation::before` 余烬透射层（`--stage-ember` /
   `--stage-ember-deep`——炉口余烬族 rgba(228,128,52)/rgba(180,70,34) 的透射档强度），
   由既有 `.machine.burning` 状态类驱动（无 JS），自窗口底部透出；::before 居首子层，
   字形保持其上可读。RM：opacity 过渡被 motion.css 全局 kill-switch 退化为即时切换
   （§2.3：状态仍以颜色/opacity 表达）；RT：令牌塌缩 transparent（透射是材质效果，
   降级矩阵内整体失效）。
2. **tool-btn 悬浮态 specular**：引用 M4 草案 §2.2 静置令牌 `--mat-spec-hi/-lo`
   （本批先落地定义、M4 后续只引用不得重定义——草案 §3 边界；深色降档 0.22/黑）；
   `:hover:not(:active)` 增 `inset 0 0 0 1px var(--mat-spec-hi)` 迎光边，按压对层级
   不叠（:active 收回高光，hover ≠ active）；RT 与 contrast-more 塌缩为
   `var(--glass-float-edge)` 平边框色（草案 §4）。注：Playwright 截图前会把鼠标移开，
   悬浮态不进基线（实证 home-en 逐字节不变）。
3. **教学便签纸材质化**：`.tutorial-note` 接入 --paper 家族（纸面 + 发丝边
   --paper-edge + 顶部内高光 `--paper-hi` + --shadow-card）；`--paper-hi` 同时归一
   纸卡（.panel / .result-card）原字面 rgba(255,255,255,0.65)（计算值不变）。
   文案与步骤行为零改动。
4. **ending 幕玻璃**：结算内容 `.ending-wrap` 浮于暗玻璃幕（`--glass-sheet-hi/lo` +
   blur(--mat-blur-m) + --glass-dark-edge + --shadow-float + hi-light-dim）；
   `.stage--ending::before` 先铺 `--scrim` 幕布（z-index:-1，绘于舞台渐变之上、内容
   之下；舞台以 position:relative + z-index:0 自建 stacking context），玻璃采样
   「舞台余光 + scrim」形成舞台-玻璃联动。文字仍落暗玻璃（h2 ≈12:1、--on-coal-dim
   ≈6.7:1，对比度不翻转；axe 全绿把关）。性能注记：ending 态新增 ~60% 视口的采样
   模糊（该态此前仅 0.4%）——属 M2 既定交付面，单层无叠加，列入下一轮低端设备
   实测观察清单。

### 验证与基线
- `tests/material.test.ts` 18 → 28 条断言：新增 RT 接线 5 条、M2 四项 4 条、
  mount-rise 1 条；既有 thick/floating 两条按令牌化改写（断言语义不变，锚点从
  字面 color-mix 移至令牌）。
- win32 基线重采（`npx playwright test --update-snapshots`，187 passed）：仅
  result-peak / result-stable 两张变更（ending 幕玻璃，即 M2 第 4 项的预期变更面），
  其余逐字节不变；Linux 基线不动（D28 流程）。自采 ≠ 已确认。
- `npm run verify` 退出码 0；`scripts/audit-perf.mjs` 复跑后 `shots/audit/m3-data.json`
  已更新为修复后数据（原审计数字以 m3-report.md 正文为准）。

## v4.8 M4 + M5 实现批次（2026-09-08，所有者批复 K2/K3 后交付）

依据：`UI_CONTRACT_M4_DRAFT.md` 与 `UI_CONTRACT_M5_DRAFT.md`（均经 2026-09-08
所有者逐项批复：K1=B 玩法维持冻结、K2=M5 五 recipe 全批、K3=M4 同批、K4–K6
验收术语以规格既有门为准——批复记录见 M5 草案 §0.2）。行为/文案/数值/几何
断言零改动，hex 白名单零扩册（新颜色全部 rgba 令牌），零新增运行时依赖与网络面。

### M4 液态玻璃语汇（四项交付）

1. **LG-1 激活态边缘 specular**：`.tool-btn` 双层背景（padding-box 玻璃实底 +
   border-box conic 描边，顶带 ±20° 静态光位）；border 透明化，结构线由 conic
   stops 承担；`:active` 以一行令牌覆写 `--mat-spec-hi: var(--mat-spec-hi-act)`
   抬升顶带（不重写 conic）。刻意离散跳变（不注册 `<color>` 插值）——跨引擎
   一致性优先（草案 §2.3 备选 A-2 未启用）。
2. **LG-2 边缘 lensing 近似**：浮动层四面（tool-btn / cycle-plate / toast /
   dialog）公共增量——外缘 1px 暗环 `--glass-lens-out` + 内底亮棱
   `--glass-lens-rim`；内容层（machine-panel / observation / 纸面族）保持洁净。
3. **LG-3 按压液感**：`.tool-btn::after` 顶部 cap 高光带，`:active` 随按压
   下沉 `--cap-shift`(1px) 并增亮（energize `--press-glow` 内发光替换顶内高光）；
   时序零新增（回弹 `--spring-snappy` / 按下 `--press-in`，与按压反馈对同构）；
   RM/freeze 由 motion.css 全局 kill-switch（`*::after`）覆盖。
4. **LG-4 旋钮卡位定位感**：零新曲线——量纲分析入册锁定（snappy y2=1.16 过冲
   ≈3–5% = 定位感；bouncy 在跨档切换会冲出 12–15° 超过相邻刻度 1/3 间距，
   对仪表语汇是误读），material.test 负向断言禁 bouncy。
5. **跨引擎基线固化（方案 B）**：像素基线维持 Chromium-only（D19/D28）；新增
   `desktop.spec.ts` 计算样式断言（三引擎）：conic 描边、background-origin
   双层、lensing inset、`--knob-rot` 注册属性等价成立。

### M5 插画与沉浸语汇（五项交付，全部非叙事、零文本、零语义层）

1. **IL-1 炉膛余烬床**：`.furnace-card::after` 余烬亮点 + 暗端渐变
   （`--ember-bed/-deep`，炉口余烬族）；强度 `--ember-level` 由 machine.ts 与
   火焰 opacity 同路径从 GameState.heat 连续设值（D26 语义不变）；RM 静态、
   RT 塌缩。
2. **IL-2 台面工业印记**：`.stage` 底部刻度条（96px 间距）+ 右下磨损斜纹补丁
   （`--bench-mark/-soft` 低α丝印）；home/ending 舞台整面覆盖 background 简写
   天然不携带；CM 塌缩。放大走查实证：刻度线 95px 间距渲染正确、全页尺度下
   为克制的设备语汇。
3. **IL-3 Act 铭牌蚀刻**：`.machine-panel::after`（面板顶缘内衬带）三 Act 符号
   ——校准同心环 / 增压嵌套弧 / 共振竖弦线（`--engrave-ink`）；由
   `.machine[data-act]` 驱动（`renderCycleTexts` 设值，行为零变更）；CM 塌缩。
4. **IL-4 结局幕插画层**：`.stage--ending.ending-{a..e}::after` 五层非叙事设备
   意象（A 冷灰烬梯度+余温残点 / B 同心干扰环+扫描线+干扰带 / C 稳态细网格 /
   D 放射冲击环+过载辉光 / E 断开插头剪影），z-index:-1 居 scrim 之上、
   `.ending-wrap` 玻璃之下；**无 backdrop-filter**（不给 M3 §1.3 采样面加码）；
   零新时间线；RT 整族塌缩。
5. **IL-5 纸带纤维纹理**：`.panel:not(.on-dark)` / `.tutorial-note` /
   `.result-card` 双向交叉影线（`--paper-grain` α≤0.05，对比度不翻转）；
   拒绝 SVG 噪点滤镜（跨引擎渲染差）；CM 塌缩。

### 验证与基线

- `tests/material.test.ts` 28 → 41 条断言：M4 7 条（令牌/conic 手法/一行覆写/
  按压液感/lensing 归属/旋钮锁/RT 塌缩）、M5 6 条（令牌/结局意象层序与无
  backdrop/余烬 heat 接线/act 钩子与零文本/台面归属/纸纹与拒绝清单锁）；
  M2 既有两断言按 v4.8 语义修订（:active 允许 conic 令牌覆写但不含 hover
  inset 环；便签底色走长hand background-color）。
- e2e 新增 `desktop.spec.ts` 跨引擎计算样式断言（M4 第 5 项，方案 B）。
- win32 基线重采（chromium-only，`--update-snapshots`，M4+M5 为预期变更面：
  全部 8 张 + settings-mobile）；Linux 基线不动（D28）。自采 ≠ 已确认，
  `PENDING-HUMAN-REVIEW` 标记随本批更新。
- 本批实测前修复测试基建一处：本地 Playwright `retain-on-failure` trace
  清理与 `browserContext.close` 收尾写入竞态（负载下把已通过测试标为 ENOENT
  失败，取证见 `shots/diag/`；修复 = 本地 `trace: off`、CI 语义不变）。
- gzip 增量：CSS 31.26 → 38.24 KB（gzip 7.83 → 9.07 KB，+1.24 KB，预算 ≤8 KB 内）。

## v4.9 M6 实现批次（2026-09-09，所有者授权「LLM 直写 SVG」后交付）

依据：`AI_ILLUSTRATION_RESEARCH.md`（GitHub 工具生态 + 同类游戏两层调研 + 三条
不经 ComfyUI 的生成路线）与 `research/ai-pipeline/`（端到端管线 PoC + 候选库）。
授权链：2026-09-09「授权你 LLM 直写 SVG」→ 候选库 6 件全过闸门 →「授权执行」
→ 本批集成。行为/文案/数值/几何断言零改动，hex 白名单零扩册（版画色全部
落在既有册内），零新增运行时依赖与网络面。

### 交付内容

1. **五幅结局木刻版画**（ENDING_WOODCUTS 常量入 `src/ui/machine.ts`，保持
   §18.4 冻结文件结构不新增源文件）：A 冷灰烬 / B 信号失真 / C 稳态运行
   （fidelity 绿语义锚，全库唯一彩色点）/ D 过载辉光 / E 拔掉插头。统一画幅
   viewBox 320×200；LLM 直写 SVG → 声明式子色板闸门（零越板）→ svgo 优化后
   入库；走查修正三处（B 碎裂过渡加密、A 灰丘拥炉消缝、C 表盘刻度加密）。
2. **版画板挂载**：`.ending-plate`（aria-hidden、零文本）置于结算玻璃幕顶部、
   结局横幅之上；发丝边 + 投影；五结局统一呈现。
3. **满屏 tableau 尺寸预算**（集成期关键修正）：结局幕为
   `min-height: calc(100dvh - 58px)` 满屏构图（M2 冻结值），幕内纵向 slack
   实测 100px（1440×900）。初版 `min(300px, 78vw)` 令 machine 涨至 932、
   页面滚动 90px——破坏满屏构图，已废弃。终版宽度
   `clamp(140px, calc(100svh * 1.5 - 1220px), 300px)`（svh 防移动端地址栏
   抖动；不支持 svh 的旧浏览器回退 `min(300px, 78vw)`）：
   900 高视口 → 140px（machine 保持 842 零滚动，视觉评审结论「小而正确——
   收官印章」，由窄到宽的视觉漏斗成立）；≥~1031px 高视口 → 300px 满幅；
   140px 底值兜底短视口/移动端（390×844 实测无水平溢出、无新增滚动）。
4. **降级语义**：静态 SVG 无时间线（RM 天然合规）；显式填充色不依赖透明度
   效果——**RT 保持**（与仪表 SVG 同层的 inline 内容件，不走 IL-4 意象层的
   材质塌缩路径，此为有意区分：插画是内容，不是玻璃材质效果）。
5. **体积**：五件 gzip 合计 ≈2.7 KB（458–605B/件）；bundle 影响 +2.7 KB。

### 验证与基线

- `tests/material.test.ts` 41 → 44 条断言：五件嵌入与挂载顺序（先版画后横幅）、
  零文本节点（`<text`/`<tspan` 负向锁）、用色 ⊆ 美术子色板（20 色枚举）、
  统一画幅、尺寸预算规则（svh clamp 串锁）。
- win32 基线重采：result-peak / result-stable 为预期变更面（版画板入镜，
  machine 高度 842 不变）；其余 7 张逐字节不变（实证）。自采 ≠ 已确认。
- Linux（CI）基线：像素内容随本批变化，需 `update-baselines.yml` 手动触发
  重生成（D28）；两平台 machine 高度同为 842（尺寸不变、仅内容 diff）。
- 生成端方法与替代路线（云端文生图 API / 本地 diffusers）、候选库走查记录
  与批量闸门脚本：`research/ai-pipeline/`（研究资产，不进生产 bundle）。

## v5.0 M7 实现批次（2026-09-09，人工预览门通过 + K5 追加批复后交付）

依据：`UI_CONTRACT_M7_DRAFT.md`（配方 H1/H2/G1/G3/G4/G5 + K1–K5 批复记录 + 否决表）。
授权链：M6 管线既立 → 四项范围批复（K1–K4）→ 候选库 14/14 过闸门 → 实机 DOM 注入
预览（拼贴单 + 合成图）→ 所有者「可以」→ K5 追加「还需要加入动画或者gif」→ 裁定
**CSS 动画化 SVG**（游戏内不引入 GIF：位图、无 RM 关断、破坏矢量色板体系；GIF 形态
仅 README 展示面，PRESENTATION_SPEC 管辖）→ 集成。行为/文案/数值零改动。

### 交付内容

1. **14 幅 LLM 直写 SVG**：12 枚卡面印章（96×96 纸上墨刻、单点红语义焦点、
   C12 冷槽 teal 锚、零字形）+ home 待机版画（320×200 暗底浅纹，与五结局同族
   第六幅）+ 炉膛内景（480×120 超暗剪影，slice 铺观察窗）。gzip 合计 ≈4.9 KB。
2. **挂载**：印章为 **浮动落款**（`float:right` 置于正文 `<p>` 之前——Range 行盒
   实测绝对定位版必与正文盒相交，浮动版 zh+en 字形级零遮挡）；内景 `prepend`
   进 `.observation`（z-index:-1，层于 M2 火光透射与火焰之下，负序不出
   backdrop-filter 层叠上下文）；待机版画挂 home-body（tableau clamp 复用 M6 预算）。
3. **微动效包（K3+K5）**：mw-* 词汇表六循环词 + 两一次性词（mw-enter 印章入场
   140ms / door-glow 炉门辉光 0.9s）；H2 版画点亮（plate-lit@470ms 与纸卡脉冲
   同拍，filter 过渡 0.5s）；G4 收敛——周期转场本由 M1 mount-rise 承载
   （loadRound 全量重建），仅加印章入场避免双重运动。全部 CSS-only、
   transform/opacity/dashoffset 三属性族、RM 与 freeze 全局关断。
4. **余烬联动**：`.embers` 基态 0.5、`.machine.burning` 增亮至 1（与 M2 火光
   同窗的光语汇；原草案的 --ember-level 直连简化为 burning 态类驱动——
   可见行为等价于反馈窗时刻）。

### 验证与基线

- 几何实测：home machine 842 / docScroll 900 零滚动（版画 140×88）；cycle
  machine 739、无水平溢出；H2 前 false 后 true。
- `tests/material.test.ts` 44 → 50 条断言。
- 基线变更面精确命中 home×2 + cycle×3；result×2 重生成后**字节不变**（实证
  结局页无 M7 元素）；确定性双拍 10/10（freeze 下 mw-* 全静止帧可复现）。
- Linux（CI）基线：内容变更面同上，需 `update-baselines.yml` 手动触发（D28）。
- `npm run verify` 12 项全绿；bundle CSS+JS gzip ≈35.9 KB / 250 KB。


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
