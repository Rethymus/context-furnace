# TEST_MATRIX.md — 《断章取火器 / Context Furnace》测试矩阵

> **权威版本：v2.0-frozen + P0 裁决（2026-09-06）**
> 本文档定义全部测试与验收管线。`npm run verify` 的任一项失败 = Build 失败。
> 黄金路径期望值依据 DESIGN_SPEC §9 冻结公式**精确推导**，实现必须逐值命中；对不上 = 实现偏离（或触发 SPEC BLOCKER）。

---

## 0. 测试原则

1. 所有测试只依据 DESIGN_SPEC / CONTENT_SPEC，不依据实现。
2. 快照基线（D27/D28）：无人值守下由 Agent 自采、标记 `PENDING-HUMAN-REVIEW` 并用于防回归；**自采 ≠ 已确认**，首次人工会话必须复核；此后 Agent 不得自行 update，diff 一律视为回归。
3. 数值断言使用本文档钉死的精确值，不接受近似。
4. CI：每次 push / pull_request 运行 `npm ci && npm run verify`。
5. 引擎分层（D19）：功能 e2e 在 Chromium / Firefox / WebKit（桌面）执行；移动仿真在 Chromium + WebKit；**视觉基线仅 Chromium**；axe 全引擎。
6. deploy 工作流 `workflow_dispatch` 手动触发：仓库转公开并启用 GitHub Pages 后由用户首次手动运行（D20），私有阶段不运行不报错。

---

## 1. 单元测试（Vitest，`tests/`）

### 1.1 `scoring.test.ts`

| # | 断言 |
|---|---|
| S1 | 全选：`cutDamage === 0` 且 `compressionBonus === 0`（此时 heatGain = 10 + gainHeatBonus，fidelityDamage = gainFidelityPenalty） |
| S2 | 排除集恰好多排除一个 NEG segment 时，`cutDamage` 恰好 **+18**（例：C04 选 s1..s5 → damage 4；选 s2..s5（多排除 s1 NEG）→ damage 22） |
| S3 | GAIN 映射（cutDamage=0 时）：heatGain ∈ **10 / 14 / 19 / 25**；fidelityDamage ∈ **0 / 1 / 6 / 12**（对应 GAIN 0/1/2/3） |
| S4 | heatGain 上限 38：CORE-only（cutDamage 28 → compression 9 + contextHeat 9）+ GAIN 3 → 10+9+9+15=43 → **38** |
| S5 | cutDamage 封顶 28；fidelityDamage 封顶 36 |
| S6 | 每轮结算后 heat / fidelity / agitation / polarization / reduction 全部 ∈ [0, 100] |
| S7 | compression 边界：ratio > 0.75 → 0；> 0.50 → 3；> 0.33 → 6；≤ 0.33 → 9（用 6/7≈0.857、4/7≈0.571、3/8=0.375、1/6≈0.167 等构造边界用例） |
| S8 | 机器消息选择（DESIGN_SPEC §12，D5 顺序）：fd=0 & hg=10 → 「燃烧效率偏低」；fd=4 & hg=11 → 「参数稳定」；fd=10 → 「有效浓度合格」；fd=15 → 「冗余成分已清除」；fd=28 → 「高纯度输出」；hg≥30 追加「优质燃料」 |

### 1.2 `cards.test.ts`（内容校验）

对全部 12 张卡：

| # | 断言 |
|---|---|
| C1 | 恰好 **1 个 CORE** segment |
| C2 | `5 <= segments.length <= 8`（D1；当前内容实际 6–8） |
| C3 | zh / en：**相同 segment ID 序列、相同 roles**（Semantic Twin 结构不变量） |
| C4 | 所有 segment 的 zh 与 en 字符串**非空**；GAIN 1/2/3 三档文案 zh、en 均非空 |
| C5 | 卡顺序 C01→C12 固定；每卡 `coreSegmentId` 存在于该卡 segments 中 |
| C6 | 与 CONTENT_SPEC §6 核对表一致（段数、CORE 位置、首段 ATTR） |

### 1.3 `localization.test.ts`

| # | 断言 |
|---|---|
| L1 | **双语数值全等**（原 §120）：对每张卡 × 代表性选区集合（全选 / CORE-only / 每种"仅多排除一个 guard"）× GAIN 0–3，`cutDamage / heatGain / fidelityDamage / 隐藏状态增量` 在 zh-CN 与 en-US 下**完全一致** |
| L2 | GAIN 1 输出模板：{selection} 在两种语言下分别拼接各自选区文本（拼接结果语言不同，但结构 token 一致） |
| L3 | locale 检测链（原 §65）：无存储 → `navigator.languages` 以 zh/zh-CN/zh-Hans 开头 → zh-CN；否则 en-US；`cf.locale` 优先 |
| L4 | 切换语言不触碰 GameState（原 §121，状态层）：cycle=8, left=2, right=6, gain=2 时执行 zh→en，断言 cycle/left/right/gain/heat/fidelity 逐字段不变 |

### 1.4 `state.test.ts` / `transitions.test.ts`

| # | 断言 |
|---|---|
| T1 | 状态机合法迁移集合与 DESIGN_SPEC §18.5 一致 |
| T2 | 非法迁移（如 `HOME_OFF → ROUND_RESULT`）**throw**；开发模式 console error |
| T3 | 结局触发优先级：heat≤0 → A；否则 fidelity≤0 → B；否则 Cycle 12 完成分 C（fidelity≥60）/ D（0<fidelity<60） |
| T4 | IGNITE 后轮次锁定：ROUND_BURNING / ROUND_RESULT 期间任何 cut / gain 变更被拒绝（不抛 UI 错误，静默无效或还原） |
| T5 | GAIN 解锁时刻表：C01–04 上限 0，C05–06 上限 1，C07–08 上限 2，C09–12 上限 3；越档请求被拒绝 |
| T6 | 每次 LOAD 选区重置全选；GAIN 跨周期保持、每次开机重置 0（D9） |
| T7 | peakHeat 初始 52，逐轮 max 更新（D10）；totalCutRatio 按 D4 累积 |
| T8 | 教学不影响任何数值、不推进 cycle（D8）；`cf.tutorialSeen` 置位逻辑正确 |

---

## 2. 黄金路径（Golden Paths）

三条固定游戏路径，先以 headless（纯 state/scoring，不经 UI）形式单测断言，后在 e2e 中复放。

### 2.1 Path A — Full-context（证明「完全不加工无法一直满足机器」）

**脚本**：每轮全选（left=0, right=N−1），GAIN 恒 0。

| 轮 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| heat（结算后） | 50 | 48 | 46 | 44 | 39 | 34 | 29 | 24 | 16 | 8 | **0** |
| fidelity | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 | 100 |

**期望**：Cycle 11 结算后 heat ≤ 0 → **结局 A（COLD END）**，无法到达 Cycle 12。fidelity 恒 100；peakHeat=52；highestGain=0；完成 11 轮。

### 2.2 Path B — Balanced distortion（D2 裁决钉死）

**脚本**：每轮切除 **s0**（各卡首段 ATTR，penalty 4），保留 s1..末段（含 CORE）；GAIN：**C01–C04=0，C05–C06=1，C07–C12=2**。

每轮：cutDamage=4；compression=0（ratio=(N−1)/N > 0.75）；contextHeat=1；heatGain = 11 / 15 / 20（按档位）；fidelityDamage = 4 / 5 / 10。

| 轮 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| heat（结算后） | 51 | 50 | 49 | 48 | 48 | 48 | 53 | 58 | 60 | 62 | 64 | **66** |
| fidelity | 96 | 92 | 88 | 84 | 79 | 74 | 64 | 54 | 44 | 34 | 24 | **14** |

**期望**：完成全部 12 周期；终局 heat=66 > 0、fidelity=14 ∈ (0, 60) → **结局 D（PEAK EFFICIENCY）**；highestGain=2。

### 2.3 Path C — Maximum distortion（证明高失真必然 SIGNAL LOST）

**脚本**：每轮仅选 CORE segment（cutDamage=28；compression=9；contextHeat=9）；GAIN 用当前最高可用档（C01–C04 实际只有 0 可用）。

| 轮 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| heat（结算后） | 68 | 84 | 100 | 100 |
| fidelity | 72 | 44 | 16 | **0** |

**期望**：Cycle 04 结算后 fidelity ≤ 0 → **结局 B（SIGNAL LOST）**，远早于 Cycle 12；highestGain=0；peakHeat=100。

### 2.4 Ending C 辅助脚本（供 endings.spec 使用）

**脚本**：每轮全选；GAIN：C01–C04=0，C05–C12=1。

| 轮 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| heat | 50 | 48 | 46 | 44 | 43 | 42 | 41 | 40 | 36 | 32 | 28 | **24** |
| fidelity | 100 | 100 | 100 | 100 | 99 | 98 | 97 | 96 | 95 | 94 | 93 | **92** |

**期望**：终局 heat=24、fidelity=92 ≥ 60 → **结局 C（STABLE RUN）**。

### 2.5 Ending E 脚本

任意方式进行至 Cycle 09+，在 ROUND_EDITING 状态点击（或键盘触发）右下角电源插头 → 结局 E。

---

## 3. E2E 矩阵（Playwright，`e2e/`，共 11 个文件）

通用前置：桌面 1440×900 Chromium；移动 390×844 与 360×740。构建产物运行。

| 文件 | 断言要点 |
|---|---|
| `home.spec.ts` | 加载后无声（POWER ON 前不存在 audible output / AudioContext 未创建）；布局为未通电设备；唯一主按钮「启动/Power on」；**不存在**「开始游戏 / Play Game / New Game」字样；语言切换与设置入口存在；`<html lang>` 正确 |
| `tutorial.spec.ts` | 首次访问（无 `cf.tutorialSeen`）开机后进入教学；固定文本逐字正确；五步流程（左刀→右刀→OUTPUT→IGNITE→校准完成）走完进入 Cycle 01；第二次开机跳过教学 |
| `desktop.spec.ts` | 1440×900 全流程：首页→开机（1.15s 动画）→教学→12 周期→结局；GAIN 解锁提示在 C05 / C07 / C09 出现且显示 1.2s；IGNITE 后控件锁定；NEXT INPUT 推进周期；FEED 正文高亮当前选区（D14）；复制结果后 1.2s 内出现「已复制」提示（D16） |
| `mobile.spec.ts` | 390×844 与 360×740：**无水平滚动**；裁刀可用（触摸）；GAIN 四卡位 44×44 可直选；IGNITE 始终可达；Settings 不越界 |
| `keyboard.spec.ts` | 纯键盘（Tab / Shift+Tab / ArrowLeft / ArrowRight / Enter / Space / Escape）完成首页→Cycle 12→结局；裁刀 focus 后 ←→ 逐段移动；Escape 关闭设置（D3） |
| `locale.spec.ts` | 检测链（清空/预设 `cf.locale`/伪造 navigator.languages）；Cycle 08 设 left=2, right=6, gain=2 后 zh→en：cycle/选区/gain/heat/fidelity 全保持，仅文字变化；`<html lang>` 与 `<title>` 实时更新（D18） |
| `endings.spec.ts` | 五结局全触发：A=Path A 脚本；B=Path C 脚本；C=§2.4 脚本；D=Path B 脚本；E=§2.5 脚本（含插头从 C09 出现、无任何提示元素、Tab+Enter 可触发） |
| `audio.spec.ts` | POWER ON 前无 audible output；Sound=Off 整局可完成；stub AudioContext 构造失败整局可完成（音频非逻辑依赖）；结局 A–D 各播放一次归零滑落音、结局 E 仅有「咔」（D22）；RESET / NEXT INPUT / 设置 / 语言切换 / 复制零新音源（D21）；保真损伤轻响/crackle 与 heat≥90 共振仅断言存在性与触发时点、**不断言参数**（D23） |
| `reduced-motion.spec.ts` | 模拟 `prefers-reduced-motion: reduce`：无指针扫描、无设备震动、无群体位移动画；所有状态仍通过 opacity/数值/指示灯明确表达；炉膛为亮度阶梯、无摇曳（D26）；观察窗迁移为即时重排（D25）；整局可完成 |
| `accessibility.spec.ts` | axe 扫描关键界面（首页/主界面/设置/结果页）无 critical/serious；focus visible；仪表 `role="meter"` + aria 属性完整；观察窗 `aria-hidden="true"`；裁刀 hit area ≥48×48、移动 GAIN 卡位 ≥44×44 |
| `offline.spec.ts` | 构建后拦截（abort）一切外部网络请求，游戏完整启动并通关 |

### 3.1 pseudo-long 布局校验（仅测试环境）

生成 `pseudo-long` locale：所有 UI 文案长度 ×1.7。验证：button 不溢出、gauge 不重叠、header 不破、modal 不溢出。**不向玩家暴露伪语言**。

### 3.2 视觉回归基线（D27 / D28 / D29）

保存 8 张基线：

```text
home-zh  home-en  cycle4-zh  cycle8-en
cycle12-zh  settings-mobile  result-stable  result-peak
```

执行规则：

- **双套基线（D28）**：本地 Windows 一套 + CI（Linux）一套，存于 Playwright 平台快照目录（天然隔离）；两套首采均由 Agent 完成，全部标记 `PENDING-HUMAN-REVIEW`（D27）——首次人工会话必须复核，可整体作废重采。
- 快照断言内嵌于 desktop / mobile spec（在冻结开关启用下采集，D29），随 verify 的 e2e 项执行。
- 基线仅在 Chromium 采集与比对（D19）；Firefox / WebKit 的渲染差不计入回归。
- 此后 Agent **不得自行 update snapshots**；任何 diff 视为回归（修代码，不修基线）。

---

## 4. 静态防漂移检查（并入 verify）

| 检查 | 规则 |
|---|---|
| 网络禁令 | `src/` 生产代码不得出现 `fetch(` / `XMLHttpRequest` / `WebSocket` / `EventSource` |
| 禁词 | `src/` 不得出现 TODO / FIXME / TEMP / PLACEHOLDER / MOCK / STUB / COMING SOON |
| localStorage 白名单 | 仅 `cf.locale` / `cf.sound` / `cf.volume` / `cf.motion` / `cf.tutorialSeen` 五键 |
| 运行时依赖 | package.json `dependencies` 为空（0 第三方运行时依赖） |
| Bundle | 生产资源 gzip 总计 ≤ 250 KB（不含 favicon） |
| 内容一致性 | `cards.ts` 与 CONTENT_SPEC §5/§6 逐字一致（C4/C6 已结构化校验，另加文本快照比对） |
| 公开呈现面 | `presentation.test.ts` 六项检查（PRESENTATION_SPEC §30，D42）：禁用词 / description 全等 / H2 allowlist / 媒体存在与规格 / 相对路径引用完整 / meta description 缺席（D41） |

---

## 5. `npm run verify` 聚合定义

按顺序执行，**任一失败即整体失败**：

```text
1  typecheck            (tsc --noEmit)
2  unit tests           (Vitest: scoring/cards/localization/state/transitions + 黄金路径 headless)
3  content validation   (cards 数据 vs CONTENT_SPEC 不变量 + 文本快照)
4  build                (vite build)
5  desktop e2e          (1440×900)
6  mobile e2e           (390×844, 360×740)
7  keyboard e2e
8  locale e2e
9  a11y                 (axe + 目标尺寸/焦点检查)
10 offline e2e
11 bundle size          (gzip ≤ 250 KB)
12 presentation         (npm run test:presentation，PRESENTATION_SPEC §30，D42)
```

静态防漂移检查（§4）挂在 unit / build 阶段内执行。verify 自第 12 项加入起为 **12 项**（原规格 §138 的 11 项 + presentation）。

---

## 6. 性能断言（手动/CI 抽查项）

- 中档手机页面 idle：CPU 占用 ~0（观察窗动画 18 元素上限，无 rAF 内持续布局测量）。
- 构建产物离线可完整通关（与 offline.spec 重合）。

---

## 附：原文溯源表

| 本文档 | 原规格 v2.0 |
|---|---|
| §1.1 | §118 |
| §1.2 | §117 |
| §1.3 | §120–121、§65 |
| §1.4 | §112–113、§30、§27、D8–D10 |
| §2 | §119 + D2（Path B 钉死） |
| §3 | §124–132 |
| §3.1 | §123 |
| §3.2 | §136 |
| §4 | §133、§142、§105、§108、§134 |
| §5 | §137–138 |
| §6 | §135 |
