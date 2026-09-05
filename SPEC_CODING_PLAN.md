# 《断章取火器 / Context Furnace》Spec Coding 编排计划

> **本文档性质：编排计划（orchestration plan），不是实现。**
> 依据：《Complete Frozen Game Specification v2.0》（2026-09 冻结版，共 143 节，下文以 `§n` 引用其节号）。
> 本计划不新增、不修改任何产品决定；只回答一个问题：**如何把这份冻结规格编排成一个可验证、防漂移的实现流程。**

---

## 0. 交付物定义

最终交付一个纯前端仓库，满足：

- 技术栈：HTML + CSS + TypeScript + Vite，0 运行时第三方依赖（§107–108）；
- 文件结构与 §111 完全一致；
- `npm run verify` 十二项检查全绿（原 §138 十一项 + presentation，D42）；
- 生产 bundle gzip ≤ 250 KB（§134），无任何网络调用（§133），无 TODO 类标记（§142）；
- 仓库内含四份权威文档：`DESIGN_SPEC.md` / `CONTENT_SPEC.md` / `TEST_MATRIX.md` / `AGENTS.md`（§111、文末结论段）。

---

## 1. 总原则（贯穿所有阶段）

1. **规格已冻结，Agent 无产品设计权。** AGENTS.md 首段逐字写入 §139；§140 禁止清单全部生效；任何"优化""调参""重译"都不属于执行内容。
2. **文档先行。** 原始规格先拆成四份仓库文档（P0），此后一切实现只引用仓库文档，不再引用对话记录。规格与代码之间只有一个跳板。
3. **领域核心先行（domain-first）。** 数值公式、状态机、卡牌数据是纯 TS、零 DOM 依赖（§114–116），先于一切 UI 实现，并用单元测试把冻结数值钉死。
4. **每阶段有可机检的验收门。** 所有验收门最终都汇聚进 `npm run verify`；门不过，不进下一阶段。
5. **冲突即停线。** 规格无法同时满足时，执行 Agent 不做决定，输出 `SPEC BLOCKER` 报告等待人工裁决（§141）。
6. **GameState 是唯一事实源。** UI 不得自行计算任何分数（§114）；所有模块从 `state.ts` 读数。

---

## 2. 执行模型与依赖图

```text
P0 文档拆分 ──┬──────────────────────────► (为所有阶段提供引用源)
              │
              ├─► P1 脚手架 ─► P2 领域核心 ─► P3 领域测试门 ─┐
              │                                              ├─► P5 UI 结构与样式
              └─► P4 i18n 层（P2 定型 types 后可与 P3 并行）─┘        │
                                                                      ▼
                              P6 交互模块 ─► P7 音频与动效 ─► P8 E2E 矩阵 ─► P9 聚合 / 基线 / CI
```

- **推荐执行模型：单一主 Agent 顺序推进**（规格明确限制自由发挥，顺序流水线最可控）。
- **可并行分派的分支**（仅在接口冻结点之后）：
  - P4 i18n 字符串表 —— 冻结点：P2 产出 `types.ts` + 术语键清单（§71）；
  - P7 音频 `engine.ts` —— 冻结点：P5 产出 DOM 结构约定；
  - P8 e2e 用例编写 —— 冻结点：TEST_MATRIX.md 定稿（P0）+ P6 交互选择器约定。
- **关键契约**：`types.ts`（Segment/Card/GameState，§114–115）一旦定稿即视为接口冻结，并行分支不得反向修改。

---

## 3. 阶段明细

每阶段给出：目标 / 产出 / 验收门 / 规格依据。

### P0 规格固化与文档拆分 【人工门 G1】

| 项 | 内容 |
|---|---|
| 目标 | 把 143 节规格拆成四份权威仓库文档，并裁决已知张力（见 §5） |
| 产出 | `DESIGN_SPEC.md`、`CONTENT_SPEC.md`、`TEST_MATRIX.md`、`AGENTS.md`（映射表见本文第 4 节） |
| 验收门 | ① 四文档覆盖原规格全部可执行条款，无互相矛盾；② 12 张卡的双语全文、segment 划分、roles、CORE 标注、GAIN 1–3 文案完整落档；③ TEST_MATRIX 覆盖 §117–§138 每一条；④ AGENTS.md 首段与 §139 逐字一致；⑤ 张力清单（本文 §5）全部裁决并回写文档 |
| 规格依据 | §111、§122、§139–142、文末结论段 |

### P1 工程脚手架

| 项 | 内容 |
|---|---|
| 目标 | 建立可构建、可测试的空骨架 |
| 产出 | `package.json`（dev 依赖仅 Vite / TypeScript / Vitest / Playwright / @axe-core/playwright，§108）、`tsconfig.json`、`vite.config.ts`、`playwright.config.ts`、§111 目录骨架、`verify` 聚合脚本（先占位后逐项填充）、CI workflow（push/PR 跑 `npm ci && npm run verify`，§137）、两个防漂移 lint 脚本：网络禁令扫描（fetch/XMLHttpRequest/WebSocket/EventSource，§133）与禁词扫描（TODO/FIXME/TEMP/PLACEHOLDER/MOCK/STUB/COMING SOON，§142） |
| 验收门 | 空骨架 `tsc` 零错误、`vite build` 通过；两个 lint 在干净骨架上通过；Playwright 能跑通一个最小 smoke 用例（本机为 Windows，环境问题在此阶段暴露，不留到最后） |
| 规格依据 | §107–111、§133–134、§137–138、§142 |

### P2 领域核心层（纯 TS，零 DOM、零音频）

| 项 | 内容 |
|---|---|
| 目标 | 实现全部冻结数值与状态机，形成可独立测试的领域核 |
| 产出 | `game/types.ts`（GameState §114、Segment/Card §115）；`game/constants.ts`（初始值 §32、decay §33、role penalty §34、compression §36、context heat §37、gain 表 §38、act/load §72–73、GAIN 解锁时刻表 §27）；`game/cards.ts`（12 张卡数据，Semantic Twin 结构，§49–61、§62–63）；`game/scoring.ts`（§35–41 公式逐行实现，一个数字不许改）；`game/state.ts`（clamp、隐藏状态更新 §42、peakHeat/totalCutRatio/highestGain 统计）；`game/transitions.ts`（状态机 §112，非法迁移 throw §113） |
| 验收门 | `tsc` 零错误；模块图中无任何 DOM / audio / i18n import；`scoring.ts` 中每个魔数旁以注释标注 § 节号供评审逐行比对 |
| 规格依据 | §32–46、§49–63、§112–116 |

### P3 领域测试门（第一道硬闸）

| 项 | 内容 |
|---|---|
| 目标 | 用单元测试把冻结数值钉死，并在无 UI 环境下干跑三条黄金路径 |
| 产出 | `tests/scoring.test.ts`（§118 全条目：全选 → cutDamage=0 且 compressionBonus=0；去 NEG → +18；GAIN 严格对应 0/4/9/15 heat 与 0/1/6/12 fidelity；所有状态 0–100 clamp）；`tests/cards.test.ts`（§117：每卡恰 1 CORE；段数界（以 G1 裁决为准，建议 5–8）；zh/en 同 segment ID、同 roles、同机制；可见字符串双语非空）；`tests/localization.test.ts`（§120：同 cutLeft/cutRight/gain 在 zh-CN 与 en-US 下 cutDamage / heatGain / fidelityDamage / hiddenStateChanges 完全相等）；`tests/state.test.ts`、`tests/transitions.test.ts`（非法迁移 throw；五个结局触发条件 §75–78）；三条黄金路径的 headless 干跑（断言值见本文 §6） |
| 验收门 | Vitest 全绿。若黄金路径干跑与冻结数值矛盾 → 立即 `SPEC BLOCKER` 停线，不进入 UI 阶段 |
| 规格依据 | §75–78、§117–121 |

### P4 i18n 层（可与 P3 并行）

| 项 | 内容 |
|---|---|
| 目标 | 落地 Semantic Twin 的界面侧：文案、检测、切换 |
| 产出 | `i18n/zh-CN.ts`、`i18n/en-US.ts`（全部 UI 字符串；术语表 §71 冻结，禁止换同义词；源码 Sentence case + CSS uppercase，§70）；`i18n/index.ts`（locale 检测链 §65：localStorage → navigator.languages → zh 开头即 zh-CN 否则 en-US；中途切换保全部状态 §66；`<html lang>` 实时更新 §67；仅允许 `zh-CN`/`en-US` 两个 ID §64） |
| 验收门 | localization 单测通过；§121 场景（Cycle 08，left=2/right=6/gain=2，zh→en）在 state 层验证 cycle/cut/gain/heat/fidelity 全部不变 |
| 规格依据 | §62–71、§120–121 |

### P5 UI 结构与样式

| 项 | 内容 |
|---|---|
| 目标 | 静态界面成型：首页、主界面、全部视觉 token 与排版规则 |
| 产出 | `index.html` 语义骨架（首页 §6–7：唯一主按钮「启动 / POWER ON」，禁"开始游戏/Play Game"）；`styles/tokens.css`（§88 色板逐 token）；`styles/base.css`（§89–90 字体栈与字号、正文 ≥16px；中文 line-break: strict / 禁 break-all §68；英文 62ch / hyphens §69）；`styles/machine.css`（§86–87 institutional laboratory equipment 视觉方向；机器最大宽 960px、理想 920px，页面 100dvh §91）；`styles/responsive.css`（§92 移动布局顺序、最低 360px、绝对禁止横向滚动）；`styles/motion.css`（所有动画的 reduced-motion 变体分层，§9、§131）；仪表 `role="meter"` + aria 全属性（§128）；观察窗整体 `aria-hidden="true"`（§129）；18 个 glyph 全部 inline SVG 自绘、禁 emoji（§44） |
| 验收门 | 首页与主界面在 1440×900 渲染正确；axe 无 critical/serious；核心文字对比度达 WCAG AA；`prefers-reduced-motion: reduce` 下无指针扫描/震动/群体位移动画 |
| 规格依据 | §6–7、§9、§44、§68–72、§86–92、§127–129、§131 |

### P6 交互模块

| 项 | 内容 |
|---|---|
| 目标 | 接通完整玩法循环：CUT → GAIN → IGNITE → 反馈 → 下一份 |
| 产出 | `ui/cutter.ts`（§16–19：segment 边界吸附；CORE 硬规则——选区不含 CORE 时 IGNITE 禁用并显示「未检测到有效核心」；鼠标/触摸拖动、点击轨道移动最近裁刀、键盘 ←→ 逐段移动、RESET CUT；视觉刀头 18×26、hit area 48×48）；`ui/gain.ts`（§20–27、§93：四机械卡位；解锁时刻表 C05→G1 / C07→G2 / C09→G3，含咔声与 1.2s 提示；移动端四个 44×44 直选位）；`ui/machine.ts`（§29 轮次固定流程；§30 IGNITE 后锁定不可撤销；§74 机器反馈文案按优先级首条匹配）；`ui/observation.ts`（§43–48：agitation/reduction/polarization 三隐藏参数到漂移速度/形状种类/聚类的映射；100 时中央只留空白、绝不画分割线）；结局 §75–81（A 冷停 / B 信号失真 / C 稳态 / D 效率标兵 / E 隐藏插头——Cycle 09 起出现、无 tooltip 无闪烁无成就、Tab 可达 + Enter/Space 触发）；`ui/results.ts`（§83–85：仅五项指标，无分数/星级/排名；Copy Result 仅写剪贴板，无图片无 SDK）；`ui/settings.ts`（§103 仅五项）与 About 免责声明（§104 逐字） |
| 验收门 | 单轮 LOAD→…→NEXT INPUT 全流程可玩；纯键盘可完成一轮；IGNITE 禁用逻辑正确；语言切换瞬间完成且无状态丢失 |
| 规格依据 | §16–31、§43–48、§72–85、§93、§103–104 |

### P7 音频与动效

| 项 | 内容 |
|---|---|
| 目标 | Web Audio 全程序化合成 + 精确时序动画 |
| 产出 | `audio/engine.ts`（§95–102：无 BGM、零音频文件；hum 48/96Hz 经 180Hz lowpass；继电器、裁刀 tick（右 +35Hz / 左 −35Hz）、GAIN 双击卡位、IGNITE（噪声时长 = 120 + heatGain×7，上限 380ms）、fidelity 损伤分级音（<8 无声 / 8–15 轻响 / 16+ 双 crackle、禁报警器）、heat≥90 低频共振）；AudioContext 仅在 POWER ON 用户手势内创建/恢复（§8）；关声音或 AudioContext 创建失败时整局可完成（§130）；启动动画 1.15s 五段时序（§8）与反馈动画 950ms 五段时序（§31）以常量集中管理；全部动画有 reduced-motion 替代（opacity/数值/指示灯） |
| 验收门 | audio e2e（POWER ON 前无 audible output；Sound Off 全程可通关；AudioContext 失败可通关）与 reduced-motion e2e 通过 |
| 规格依据 | §8–9、§31、§94–102、§130–131 |

### P8 E2E 与无障碍矩阵

| 项 | 内容 |
|---|---|
| 目标 | 落地 §111 列出的全部 11 个 e2e 文件 |
| 产出 | `home` / `tutorial`（教学五步 §10–12，固定文本，不解释分数）/ `desktop`（1440×900 全流程：首页→开机→教学→12 周期→结局，§124）/ `mobile`（390×844 与 360×740：无横向滚动、cutter/gain/ignite 可用、settings 不越界，§125）/ `keyboard`（纯键盘 Tab/Shift+Tab/←→/Enter/Space/Escape 从首页到 Cycle 12，§126；Escape 行为以 G1 裁决为准）/ `locale`（含 §121 中途切换）/ `endings`（A–E 五结局全触发，E 经插头）/ `audio` / `reduced-motion` / `accessibility`（axe + focus visible / label / 对比度 / 拖动替代 / 目标尺寸，§127）/ `offline`（断网完整通关，§132）；测试环境 pseudo-long ×1.7 布局校验（不暴露给玩家，§123）；三条黄金路径的 e2e 化（§119） |
| 验收门 | 全部 e2e 绿；axe 无 critical/serious violations |
| 规格依据 | §10–12、§119、§121–132 |

### P9 聚合、视觉基线与 CI 【人工门 G2】

| 项 | 内容 |
|---|---|
| 目标 | 收口：聚合验证、视觉基线、语言 QA 核对 |
| 产出 | `npm run verify` 十二项齐备（typecheck / unit / content validation / build / desktop e2e / mobile e2e / keyboard e2e / locale e2e / a11y / offline / bundle size / presentation，任一失败即 build 失败，D42）；bundle gzip ≤250KB 检查（§134）；**无人值守下按 D27 自采** 8 张视觉基线（home-zh / home-en / cycle4-zh / cycle8-en / cycle12-zh / settings-mobile / result-stable / result-peak）并标记 `PENDING-HUMAN-REVIEW`（D28 双平台），此后 snapshot diff 一律视为回归、Agent 不得自行 update；`CONTENT_SPEC.md` 的 `language_qa_status` 双 APPROVED 核对（文本已在规格中正式给定，执行 Agent 不得重译，§122）；localStorage 白名单核对（仅 5 个 cf.* 键，§105）；刷新即丢局、无 Save（§106）核对 |
| 验收门 | 本文 §8 DoD 全项满足 |
| 规格依据 | §105–106、§122、§134–138 |

---

## 4. 规格 → 四文档映射（P0 的核心交付）

| 仓库文档 | 吸收的规格章节 | 备注 |
|---|---|---|
| `DESIGN_SPEC.md` | §1–15（产品定义/讽刺对象/竞品取舍）、§16–49（操作、数值系统、观察窗）、§65–104（i18n/排版/术语/结局文案/设置/About）、§106–116（技术冻结、结构、状态机、内容类型） | 数值公式逐条成表，供 `scoring.ts` 评审逐行比对 |
| `CONTENT_SPEC.md` | §49–63（12 张卡双语全文 + roles + GAIN 1–3 文案 + Semantic Twin 原则）、§71 术语表、§122 `language_qa_status` | 卡牌数据的单一事实来源；`cards.ts` 与其必须一致 |
| `TEST_MATRIX.md` | §117–138（全部单测/e2e/黄金路径/pseudo-long/视觉基线/CI/verify） | 黄金路径断言值按本文 §6 钉死 |
| `AGENTS.md` | §139（首段逐字）、§140（禁止清单）、§141（SPEC BLOCKER 协议）、§142（禁 TODO） | 外加指向其余三份文档的索引 |

---

## 5. 人工决策门与规格张力清单

### G1（P0，四文档定稿前必须裁决）

原始规格存在 5 处需要人工拍板的口径。每项给出建议缺省，人工可一键批准或修改：

| # | 张力 | 建议缺省 |
|---|---|---|
| 1 | **段数口径冲突**：§16 说"5–7 semantic segments"，§117 测试上限是 `5 <= segments <= 8`，而 Cycle 06 实际有 8 段（§55） | 以 12 张卡实体数据为准：实际范围 6–8；测试断言 `5–8`；DESIGN_SPEC 措辞改为"每卡 5–8 段（当前内容为 6–8）" |
| 2 | **Path B 无具体参数**：§119 要求"测试脚本使用设计文档指定的一组中度 cut + gain"，但规格从未给出该组数值 | 在 TEST_MATRIX 钉死一组确定性脚本。可行性已验证：每轮仅切除 s0（各卡首段 ATTR，cd=4），C05 起 GAIN 1、C07 起 GAIN 2、从不用 GAIN 3 → 终局 fidelity=14、heat=66，满足"完成 Cycle 12 且 0<fidelity<100、heat>0" |
| 3 | **Escape 键行为未定义**：§126 要求测试 Escape，但全文没有任何 Escape 行为定义 | 定义为"关闭 Settings 面板（若打开）"，写入 DESIGN_SPEC |
| 4 | **「平均切除比例」定义缺失**（§83 结果页） | 定义为每轮 `1 − ratio`（§36 ratio 的补数）的算术平均，写入 DESIGN_SPEC |
| 5 | **§74 反馈条件命名与互斥性**：条件里 `damage` 与 `fidelityDamage` 混用，且各区间可能重叠 | 统一命名为 `fidelityDamage`，明确"自上而下首个匹配生效"，写入 DESIGN_SPEC |

> **状态更新（2026-09-06）**：G1 五项已裁决为 D1–D12；缺口清单决策轮裁决 **D13–D26**（表现层 6、发布层 2、音频 3、动效 3，其中 1 项授权实现自定）；无人值守预检轮裁决 **D27–D35**（流程 4 项：基线自采、双平台基线、确定性种子+冻结开关、仓库回退链；小缺省 5 项）；展示面冻结层合并裁决 **D36–D42**（新立 `PRESENTATION_SPEC.md`：仓库名、License、README 逐字文本、媒体规格、presentation 测试、verify 扩为 12 项）。全部 **42 项**已回写，**无 OPEN 项**。

### G2（P9，视觉基线采集前）

§136 明文要求"第一次人工确认 UI 后"才保存截图基线。此门不可由 Agent 代行。

---

## 6. 黄金路径数学预演（P3 的固定断言来源）

以下推演证明冻结数值系统内部自洽（这正是 §119 要验证的三条系统逻辑），P3 干跑测试直接采用这些期望值：

**Path A — 全选 + 最低增益（gain 0）**
compressionBonus=0、contextHeat=0、gainHeatBonus=0 → 每轮 heatGain=10：

```text
heat: 52 → 50 → 48 → 46 → 44          (C1–C4, decay 12)
        → 39 → 34 → 29 → 24           (C5–C8, decay 15)
        → 16 → 8 → 0                  (C9–C11, decay 18)
Cycle 11 触发 COLD END（heat ≤ 0）✓
```

**Path C — 仅保 CORE + 当前最高增益**
cutDamage=min(28, Σguard)≈28（各卡 guard 惩罚和均远超 28）；ratio≤0.2 → compressionBonus=9；contextHeat=min(10,⌊28×0.35⌋)=9；C1–C4 仅 gain 0 可用 → fidelityDamage=min(36,28+0)=28：

```text
fidelity: 100 → 72 → 44 → 16 → 0
Cycle 04 触发 SIGNAL LOST（fidelity ≤ 0）✓（满足"Cycle 12 之前"）
```

**Path B — 见 §5 G1-2 建议缺省**：终局 fidelity=14、heat=66，完成全部 12 周期 ✓

> 若 P3 干跑结果与上述不符，说明实现偏离冻结公式（或公式本身矛盾）——前者修代码，后者 `SPEC BLOCKER`。

---

## 7. 验证体系与防漂移机制

| 机制 | 防什么 | 依据 |
|---|---|---|
| `scoring.ts` 魔数旁注 § 节号 + 评审逐行比对 | Agent 调参 | §41、§140 |
| cards.test 不变量（恰 1 CORE / 段数界 / 双语同构 / 非空） | Agent 增删改卡 | §117、§140 |
| localization.test 双语数值全等 | 翻译影响机制 | §120 |
| 网络禁令 lint（fetch/XHR/WS/EventSource） | 偷加统计/后端 | §133 |
| 禁词 lint（TODO/FIXME/…） | 占位交付 | §142 |
| localStorage 白名单核对（仅 cf.locale/sound/volume/motion/tutorialSeen） | 偷加存档/遥测 | §105 |
| 视觉基线 + 禁自行 update snapshot | UI 漂移 | §136 |
| `language_qa_status` 双 APPROVED + 禁重译 | 中式英语回流 | §122 |
| 状态机非法迁移 throw | 流程漂移 | §113 |

`npm run verify` 最终组成（§138）：typecheck → unit → content validation → build → desktop e2e → mobile e2e → keyboard e2e → locale e2e → a11y → offline → bundle size。任一失败 = build 失败。

---

## 8. 完成定义（DoD）

- [ ] 四份文档定稿，G1 五项裁决回写完毕；
- [ ] `npm run verify` 十二项全绿；
- [ ] bundle gzip ≤ 250 KB，无网络调用，无禁词，localStorage 仅 5 键；
- [ ] 三条黄金路径断言与 §6 预演一致；
- [ ] 五结局（含隐藏 E）均可触发且有 e2e 覆盖；
- [ ] 视觉基线 8 张经 G2 人工确认后锁定；
- [ ] `language_qa_status: zh-CN APPROVED / en-US APPROVED`；
- [ ] SPEC BLOCKER 计数为 0，或全部已裁决归档。

---

## 9. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 执行 Agent 自由发挥（最大风险） | AGENTS.md 约束 + 每阶段验收门 + 魔数 § 注释比对 + 快照策略 |
| 12 卡双语内容量大、易抄错 | CONTENT_SPEC 为单一来源；`cards.ts` 与其逐字一致；cards.test 结构校验 |
| 动效时序点多（1.15s 开机、950ms 反馈、1.2s 提示） | 时序常量集中管理；e2e 断言"存在性与终态"，不断言逐帧 |
| Playwright/Windows 环境问题后置爆炸 | P1 即跑最小 smoke e2e |
| reduced-motion 与动画并存导致遗漏 | motion.css 从 P5 起每条动画强制成对实现（正常/RM 变体） |
| 双语文案被"顺手润色" | §122 + AGENTS.md 禁重译；localization/内容测试锁定字符串 |

---

## 10. 批次划分（供执行会话直接采用）

| 批次 | 阶段 | 出口条件 |
|---|---|---|
| 1 | P0 + P1 | 文档定稿（G1 完成）；空骨架 typecheck + build + smoke e2e 绿 |
| 2 | P2 + P3 | 领域测试全绿，黄金路径干跑与 §6 一致 |
| 3 | P4 + P5 | i18n 单测绿；静态界面 axe 达标 |
| 4 | P6 + P7 | 全流程可玩；audio/RM e2e 绿 |
| 5 | P8 + P9 | verify 全绿（至 bundle 共 11 项）；G2 基线锁定（D27 待复核标记） |
| 6 | 展示面（PRESENTATION） | README×2 / repository-metadata / Topics / LICENSE / `capture:readme` 媒体四件 / presentation 测试；verify **12 项**全绿 → DoD 达成 |

每批次结束跑一次当前可用的 verify 子集，未绿不进下一批次。

批次补充（2026-09-06 裁决回写）：
- 批次 1（P1）含 `git init` + 私有仓库：仓库名 **context-furnace**（D36，修订 D30）、分支 `main`（回退链不变：`gh` 已登录→建私有仓并推送；未登录→仅本地 init+commit（全局 git 身份）；无全局身份→仅 init 不 commit；任一回退不阻塞开发，日志注明实际路径）。
- 批次 4（P7）：音频动效裁决已齐备（D21–D26），无 OPEN 项。
- 批次 5（P9）：仓库转公开并启用 GitHub Pages 后，由用户手动运行 deploy 工作流（D20）。

## 11. 无人值守模式补充（D27–D35）

用户将进入无人工监管的 Agent 自主开发阶段，以下规则覆盖原流程中的人工环节：

1. **视觉基线（D27/D28）**：Agent 自采本地 Windows 与 CI Linux 双套基线，标记 `PENDING-HUMAN-REVIEW` 并立即作为回归参照；首次人工会话必须复核，可整体作废重采。
2. **动画确定性（D29）**：观察窗/火焰用固定种子确定性模型；测试冻结开关（`?freeze=1`，仅测试启用）保证快照可复现。
3. **仓库与提交（D30）**：按回退链执行，任一层失败不阻塞开发，日志注明路径。
4. **SPEC BLOCKER**：仍然 = 按设计停线等待人工。无人阶段的 blocker 会停滞至用户回来——这是特性不是缺陷；Agent 不得为绕过 blocker 做任何产品决定。
5. **首次人工会话清单**（用户回来后）：复核两套视觉基线（D27）→ 处理可能积压的 SPEC BLOCKER → 仓库转公开并启用 Pages → 手动运行 deploy（D20）→ 上传 social-preview（PRESENTATION_SPEC §24）→ 若 homepage 仍为占位则补填真实 URL（D40）→ 填写 LICENSE 版权行作者名（D37）。
