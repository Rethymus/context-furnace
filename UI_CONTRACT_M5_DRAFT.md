# UI_CONTRACT v4.8 提案 · M5 批次设计草案 — 插画与沉浸语汇（Illustration & Immersion Vocabulary）

> **批复与交付（2026-09-08）**：所有者逐项批复 §0.2 清单——**K1=B（玩法维持
> 冻结，SPEC BLOCKER 结案）、K2=五 recipe 全批（含 IL-2/IL-5 可选项）、K3=是
> （M4 同批）、K4–K6=以规格既有门为准**。M5 已随 UI_CONTRACT v4.8 交付
> （见 UI_CONTRACT.md v4.8 节）；本文件保留为调研与决策依据。

> **本文件为草案（design draft）。** 仅含调研结论与设计提案，不含任何实现。
> 本 agent 未改动任何现有代码、测试、基线；未 commit、未 push。
> 实现由后续批次执行；落地前须由所有者逐项批准，并把采纳项写回 `UI_CONTRACT.md`
> v4.x 正文（含 v4.5 批次表追加 M5 行）。未被批准的部分不得实施。
> 调研日期：2026-09-08。触发指令（所有者，2026-09-08）：「单纯文字太单调了，
> 或许需要加入一些插画设计之类的，通过画面的形式增强玩家的体验感、沉浸感」。

---

## 0. 范围、职权与前置约束

### 0.1 职权划定（先于一切内容）

- **本草案只覆盖视觉表达层**（插画 / 氛围 / 状态可视化补强），延续 UI_CONTRACT
  v3（2026-09-06 所有者指令）/ v4（2026-09-08 所有者指令）确立的
  「所有者指令 → 调研草案 → 逐项批准 → 实现批次」通道。
- 同一指令中的**玩法层部分**（结合竞品社区讨论推导「趣味性 / 挑战性 / 随机性」
  的要素与权重、并据此平衡游戏）**不在本草案内**：该部分触及 DESIGN_SPEC
  §0 裁决记录与 §9 数值系统的冻结效力，且 AGENTS.md 明令执行 Agent 不担任
  balancing designer。已按 §3 协议输出 SPEC BLOCKER，等待人工裁决——
  任何玩法权重结论都只能由该裁决产生，本草案不预支、不暗示任何数值方向。
- 权重表（§2.3）是**插画候选的视觉决策评分尺**，不是玩法调参依据。

### 0.2 待所有者裁决清单（本文件的唯一等待项，2026-09-08 状态）

实现侧一切可自主完成的工作已就绪（三竞品证据齐、verify 12 阶段全绿）。
以下决定只能由所有者做出，逐项批复后本草案即可推进：

| # | 待决项 | 选项 | 所有者批复栏 |
|---|---|---|---|
| K1 | 玩法层 SPEC BLOCKER（趣味性/挑战性/随机性平衡的要素与权重） | A：所有者修订 DESIGN_SPEC §0 新增裁决条目，授权具体玩法变更，实现侧照裁决执行／B：收窄为视觉层，玩法维持冻结／C：权重分析由所有者另行成文后以规格修订进仓库 | **已批复（2026-09-08）：B — 玩法维持冻结** |
| K2 | M5 草案 recipe 逐项批准 | IL-1 炉膛余烬床 / IL-2 台面丝印（可选）/ IL-3 Act 铭牌蚀刻 / IL-4 结局幕插画层（主提案）/ IL-5 纸带纹理（可选），及 §2.3 权重尺数值 | **已批复（2026-09-08）：五项全批（含 IL-2/IL-5），权重尺随批采用** |
| K3 | M4 草案（液态玻璃语汇）是否同批批准 | 与 M5 合批可减少基线重采轮次 | **已批复（2026-09-08）：是，同批实现** |
| K4 | 验收术语「六幕」口径 | 规格既有门为准（1 教学 + 3 Act + 12 周期 + 5 结局，门 = tutorial.spec + desktop.spec 全流程）／或所有者另行定义 | **已批复（2026-09-08）：以规格既有门为准** |
| K5 | 验收术语「100%/150% 布局」口径 | 规格既有门为准（pseudo-long ×1.7 + 1440/390/360 视口 + G6）／或修订 TEST_MATRIX 新增缩放门 | **已批复（2026-09-08）：以规格既有门为准** |
| K6 | 验收术语「旧存档兼容」口径 | 规格既有门为准（§17.4 无存档系统；等价面 = 5 键 localStorage 语义 + L4 状态保持）／或所有者定义新的存档需求（属新功能，需规格修订） | **已批复（2026-09-08）：以规格既有门为准** |

### 0.3 硬约束（与 M4 草案同源，逐条沿用）

- 不新增运行时依赖（package.json dependencies 恒空）、不引入网络请求
  （含字体与图片 CDN）、不改 SVG 为 Canvas、不做 JS 运行时渲染。
- 不动几何断言（G1–G8）、不动冻结色（`--heat` / `--fidelity` / `--warning`）、
  不动文案与数值、不动状态机与音频表（§16）。
- 全部新视觉处于既有 RM（`prefers-reduced-motion` / `data-motion` / freeze
  kill-switch）与 RT（`prefers-reduced-transparency`）覆盖之下。
- 零新增玩家可见文本：插画不携带任何文字/标签——出现一个字即触发
  CONTENT_SPEC 变更 = SPEC BLOCKER。
- hex 白名单（material.test.ts 防硬化回归）不扩册：新颜色全部走 rgba() 令牌，
  色相取自既有暖中性 / 炉口余烬族。
- 资产形态：**仅 inline SVG 与 CSS 渐变**（矢量、确定性、跨引擎一致）；
  禁光栅图片（体积 + 基线确定性 + 引擎渲染差三重风险）。
- gzip 预算：当前 29.1 KB / 250 KB，本批次增量预算（草案值）≤ 8 KB。
- 插画层不得进入无障碍语义树（`aria-hidden` 或零语义伪元素/background 层），
  axe 全引擎保持零 critical/serious。

### 0.4 设计法约束（DESIGN_SPEC 对插画的具体禁则）

| 来源 | 禁则 → 对插画的含义 |
|---|---|
| §1.4 世界观 | 禁止人物、公司标志、叙事场景、吉祥物、拟人机器「脸」。插画对象只能是：设备自身、台面、介质（纸/玻璃/金属）、抽象符号 |
| §1.3 规模冻结 | 不引入新「功能面」：插画不承载任何未被规格定义的信息（不加计量、不加进度、不加成就） |
| §10.1 观察窗 | 18 个 glyph 的形状、数量、种类表冻结——观察窗不做「语义化插画改造」 |
| D11 | CORE 不做任何可视化标记——插画不得暗示段位/核心位置 |
| §14.1 结果页 | 固定五项之外不加显示项——结局插画只能是背景意象层，不加数据、不加文字 |
| §12 / §13 | 机器无人格——插画不得给机器加表情/情绪符号（火焰是燃烧状态，不是「表情」） |
| PRESENTATION_SPEC | 仓库门面冻结：本批次只动游戏内视觉；README 媒体仅在实现批次按既有媒体规格流程重采（v4 先例 e1eb584），文案零改动 |

---

## 1. 调研来源表（竞品社区证据，全部可溯源）

| # | 来源 | URL / 端点 | 采集证据 |
|---|---|---|---|
| S1 | 《猛兽派对 / Party Animals》Steam 评论 API（appid 1260320，mostrecent，language=all，2026-09-08 抓取） | `store.steampowered.com/appreviews/1260320?json=1&filter=mostrecent&language=all` | 总评 Very Positive（~81% / 55,952 条）。逐条引文：「游戏的最高配置就是朋友」（好评，22h）；「The ragdoll animal rough-housing is what I adore about this game.」（好评，4h）；「Got this game cuz I watched Jungkook from BTS play it on live and it looked really fun」（好评，9h）；「the polished feel and more intuitive controls of this game do give it a definite edge」（好评，36h）；「产能慢，更新慢，新赛季的车还有圈钱的嫌疑」（差评，110h）。主题归纳：初见门槛低（物理后果一眼可读）；社交开黑是核心体验；直播/短视频**观感**直接转化为购买；长期留存受内容更新节奏拖累 |
| S2 | 《城市：天际线 / Cities: Skylines》Steam 商店页 + 社区讨论区 + 评论 API（appid 255710，2026-09-08 抓取） | `store.steampowered.com/app/255710`、`steamcommunity.com/app/255710/discussions/`、`store.steampowered.com/appreviews/255710?json=1` | 总评 Very Positive（92% / 100,696）；标签 Moddable / Replay Value / Sandbox / Mod；官方文案「easy to learn, hard to master」；媒体引 Destructoid「the huge amount of replayability the base game has」。社区讨论帖（逐字）：「3 lane road, only one lane used」（29 回复）、置顶「New Player Resources」（58 回复）、「Industry zoning help」、「going over 250k population」。评论引文：「It's super relaxing to build my own city」（好评，417h）、「This game is probably the gold standard for city builders.」（35h）、「Good and fun game but after a while it gets repetetive and boring」（7h）。主题归纳：**系统可视反馈（交通）是社区第一话题**——不可见性制造理解门槛，门槛催生互助内容；沙盒建造的截图是社交货币；留存靠创造自由而非数值进度 |
| S3 | 《我不背锅》Steam 评论 API（appid 2224610，mostrecent，language=schinese，2026-09-08 补采成功） | `store.steampowered.com/appreviews/2224610?json=1&filter=mostrecent&language=schinese` | 总体「特别好评」（196↑ / 44↓，约 81.7%）。引文：「挺上头的，很适合和朋友一起玩而且朋友也很爱玩。」（好评，10h）；同一条内「就是玩多了之后套路都摸清了可玩性就有点低，希望尽快更新吧」；「掉线严重，没法玩」「真他妈难联机」（差评，均 <1h）。主题归纳：朋友局是核心吸引力；策略被摸清后可玩性衰减（重玩/留存靠更新）；差评集中在联机基础设施而非设计。注：采证过程——Bing 中国区过滤、DDG 人机墙、WebSearch 配额耗尽（至 2026-10-03）、TapTap 搜索空、百科 403，最终经 Steam 公开检索 API 定位（`storesearch/?term=我不背锅&cc=CN` 命中 appid 2224610）。样本仅 3 条可见评论，「真人第一次是否理解」维度在该样本中无直接证据，如实记录 |
| S4 | 方法学注记 | — | WebSearch 配额耗尽时返回的模型自述内容**无来源、不可引用**（本次已弃用一条此类输出）；一切结论仅建立在可直接复核的抓取文本上 |

注：S1/S2 的「主题归纳」为对抓取文本的归纳，引号内为逐字原文；归纳若被所有者
质疑，以端点重采为准（端点为公开 JSON / 页面，可重复执行）。

---

## 2. 指令五维 → 视觉层映射（要素与权重草案）

指令给出的五个考察维度：真人第一次是否理解、社交讨论是否真正有张力、
玩家是否觉得有趣、是否愿意重玩、长期留存表现。以下**仅映射到视觉表达层**。

### 2.1 逐维结论

| 维度 | 竞品证据 | 对本项目的视觉层含义 |
|---|---|---|
| 第一次是否理解 | S1：物理后果一眼可读 = 初见低门槛；S2：系统不可见（交通）制造初见摩擦，社区用互助帖补偿；S3：样本内无直接证据（如实记录） | 本项目的「一眼可读」面 = 仪表、观察窗、状态条（既有）。插画的第一职责是**增强状态可读性**，任何与状态竞争注意力的装饰都是负资产 |
| 社交讨论张力 | S1：可截图复述的「物理名场面」+ 直播观感转化；S2：城市建造截图是社交货币；S3：「很适合和朋友一起玩」——朋友局即张力场 | 本项目的可分享面 = 机器状态的名场面（观察窗两极化、结局幕）。§14.2 冻结「无分享 SDK」——社交传播只能靠玩家自截图，因此视觉层要让**状态本身值得截图**，而不是加分享功能 |
| 是否觉得有趣 | S1：涌现式喜剧；S2：创造式沉浸；S3：「挺上头的」 | 本项目对应物 = 设备的物理在场感（材质、光影、火）。v4 材质系统已承担大半；插画是补强在场感，不新增机制 |
| 是否愿意重玩 | S2：sandbox 创造自由驱动重玩；S1：朋友驱动；S3：「玩多了套路都摸清了可玩性就有点低」——策略穷尽即衰减 | 本项目为固定 12 周期单义作品（§1.3 冻结，无随机、无分支构筑）。视觉层贡献上限 = 「二周目才注意到的细节」（环境插画的可再发现性）；**不得引入随机视觉**（破坏 D29 确定性与基线） |
| 长期留存 | S1：差评集中于内容枯竭——证明视觉新鲜感会耗尽；S3：同向（求更新） | 本项目为 5–7 分钟单次体验（冻结）。**如实记录：该维度在本项目无对应设计面**，不以留存为 KPI 做任何设计 |

### 2.2 两类竞品的可迁移经验（仅视觉层）

1. **「读得懂的名场面」优先于「好看的装饰」**（S1×S2 交叉）：两个社区最活跃的
   讨论对象都是**状态的可视后果**（被击飞的动物 / 堵死的路），不是静态美术。
   → 插画应附着在状态变化最大的表面（炉膛、结局幕），而非均匀铺满界面。
2. **初见理解靠「后果可视化」，不靠说明书**（S2 反例）：C:S 的新人求助帖
   证明系统不可见时社区会自己补课——本项目刻意不做教程式说明（§3 教学只有
   操作引导），因此状态的视觉后果必须自解释。

### 2.3 插画候选评分尺（权重草案——视觉决策用）

```text
状态可读性增益      40%   （插画让某个状态更易读/更早被读出）
设备在场感增益      30%   （材质氛围：设备更「在那里」，不承载信息）
名场面可截图性      20%   （该表面是否产生值得玩家主动截图的状态画面）
装饰愉悦            10%   （纯好看；单独不足以立项）
```

- 每个候选 recipe（§3）按此打分并标注；批准时所有者可改权重——改权重
  只影响视觉取舍，仍不构成玩法调参。
- 尺度校准示例：IL-4（结局幕插画）四项全中；IL-2（台面丝印）几乎只有第
  2/4 项——按现行权重应降级为「可选」。

---

## 3. 插画语汇 recipe 提案（CSS / SVG-only）

命名沿用 `--mat-*` / `--stage-*` 族；全部为零语义层（伪元素或 background，
不新增 DOM 节点、不新增可聚焦元素）。

### IL-1 炉膛余烬床（furnace ember bed） — 权重分：40/30/15/5

- 表面：`.furnace-card` / `.furnace-flame` 区底部。
- 手法：SVG 径向渐变（或 conic 近似）余烬层，复用 M2 已入册的
  `--stage-ember` / `--stage-ember-deep` 令牌族新增「余烬床强度档」；
  光强随 heat 值连续分档（**映射行为本身是 D26 冻结语义，本层只补强
  视觉密度，不新增状态逻辑**——分档读数仍来自 GameState）。
- 降级：RT → 令牌塌缩实色；RM → 静态（亮度阶梯，无摇曳，对齐 D26 的
  RM 处理）；freeze → 纯 CSS 层天然冻结（无 rAF 依赖）。
- 基线影响：cycle4 / cycle8 / cycle12（3 张重采）。

### IL-2 台面工业印记（bench stenciling） — 权重分：0/25/0/15（可选，低优先）

- 表面：stage 台面背景（`body` / `.stage` 层）。
- 手法：超低对比 CSS/SVG 丝印细节（刻度线、铆钉点位、警示斜纹的抽象化），
  **零文字**（§0.2）；对比度不得扰动纸卡层级与既有 AA 余量。
- 风险：全部 8 张基线重采、收益集中在「在场感」——按 §2.3 权重打分偏低，
  列为可选；若批准，建议与其它 IL 合批重采。

### IL-3 Act 铭牌蚀刻（act plate engraving） — 权重分：25/20/5/10

- 表面：`.cycle-plate` 邻域或面板角。
- 手法：三个 Act（CALIBRATION / PRESSURE / RESONANCE，§11 冻结标签）各一组
  抽象蚀刻符号（细线圈 / 压力波纹 / 共振弦线——符号**纯装饰**，不新增文字、
  不解释 Act 含义）；由既有 act 状态类驱动，`aria-hidden`。
- 降级：RT 塌缩；RM 天然静态。
- 基线影响：cycle4 / cycle8 / cycle12（与 IL-1 同面，合批）。

### IL-4 结局幕插画层（ending backdrops） — 权重分：35/30/45/10（本批主提案）

- 表面：`.stage--ending::before`（M2 已铺 scrim）之上、`.ending-wrap` 玻璃之下。
- 手法：五个结局各一层**非叙事设备意象**（草案值，批准时逐项定稿）：
  A 冷灰烬梯度 / B 信号噪点密度梯度 / C 稳态细网格 / D 过载辉光 /
  E 断开的插头剪影。全部为抽象渐变+几何（零文字、零新音、零时长变化——
  幕布停留即现有时间线，不新增动画序列；仅 RM 静态版 + RT 塌缩版）。
- 设计法对照：不新增显示项（§14.1）、不给机器加情绪（§12）、意象不叙事化
  （§1.4——「断开的插头」是设备事实的非叙事呈现，与结局 E 现有表现一致）。
- 性能：**不使用 backdrop-filter**（纯渐变层，规避 M3 §1.3 的大面采样叠加；
  ending 态现有 ~60% 视口采样模糊已列 M2 观察清单，不再加码）。
- 基线影响：result-peak / result-stable（2 张重采，M2 已开先例）。
- 依据：§2.1「名场面可截图性」的最大杠杆面——玩家自截图传播的主要画面。

### IL-5 纸带纤维纹理（paper grain） — 权重分：0/30/0/25（可选）

- 表面：`.panel` / `.tutorial-note` / `.result-card` 纸面。
- 手法：`repeating-linear` 微纹（倾向）/ 交叉影线；**否决 SVG feTurbulence**
  （跨引擎渲染差直接威胁基线稳定性，入拒绝清单）。
- 对比度：纸上 ink 现状余量大（v3 ≈9.8:1），但须 audit-ui 复核；纹理不落在
  正文行高内密集区（或 α ≤ 0.04）。
- 基线影响：全部含纸卡基线（8 张）。

### 3.x 拒绝清单（否决项留档防翻案）

| 手法 | 否决理由 |
|---|---|
| 人物 / 吉祥物 / 拟人机器脸 | §1.4 世界观禁则 |
| 12 张卡的内容插画（为新闻配图） | 对冻结内容做视觉解读 = 越权 CONTENT_SPEC，且引入观点层 |
| 观察窗 glyph 语义化改造 | §10.1 冻结（18 glyph 形状/数量/种类） |
| 任何 CORE / 段位可视化暗示 | D11 |
| 成就徽章 / 等级 / 装饰性进度 | §14.1 禁项 + §1.3 规模冻结 |
| 光栅图片资产（PNG/JPG/WebP） | 体积 + D29 确定性 + 跨引擎渲染差；坚持矢量/CSS |
| `feTurbulence` / SVG 滤镜噪点 | 跨引擎渲染不一致（M4 §2.8 同理由引申），基线杀手 |
| 随机化视觉细节（非固定种子通道） | 破坏 D29 确定性与视觉基线 |
| 插画携带任何文字 / 标签 | 零新增玩家可见文本（§0.2）；出现即 blocker |
| 入场/循环类新动画时间线 | 动效白名单外（AGENTS.md §2）；插画层静态，过渡仅挂既有令牌 |

---

## 4. 降级矩阵（对齐 v4.2 / M4 §4 的既有矩阵）

| 环境 | 行为 | 机制 |
|---|---|---|
| `prefers-reduced-transparency: reduce` | 全部 IL 令牌塌缩：渐变端点归实色或 `transparent`（IL-4 意象层整体失效，回到 scrim + 实色） | tokens.css 既有 RT 块追加 IL 令牌覆写——纯令牌级塌缩，零选择器分叉，可静态断言 |
| `prefers-contrast: more` | 低对比装饰层（IL-2 / IL-3 / IL-5）令牌置 `transparent`；IL-1 / IL-4 保留（其承载状态信息） | 既有 CM 块追加；文本对比不得下降 |
| `prefers-reduced-motion` / freeze | IL 全静态（无新时间线，见拒绝清单） | 天然合规；断言沿用 v4.6 既有条目 |
| 无 backdrop-filter 引擎 | IL 全部不依赖 backdrop（IL-4 明确不用） | 与 M4「渐变+阴影而非滤镜」同构 |

---

## 5. 验收断言提案（实现批次启用，风格对齐 v4.6 / M4 §5）

```ts
// ── v4 M5 插画与沉浸语汇（草案提案，实现批次启用）──
describe('v4 M5 illustration vocabulary', () => {
  it('M5 tokens exist (ember bed / ending imagery / grain families)', () => { /* 令牌存在性，逐令牌 toContain */ });
  it('ending imagery attaches only under .stage--ending::before layer chain', () => { /* 层序锚定：意象层在 scrim 之上、.ending-wrap 之下 */ });
  it('M5 adds zero new hex and zero raster assets', () => {
    // styles/*.css 不得出现 url(*.png|jpg|webp)——负向断言
    // 既有 hex 白名单断言不变即通过
  });
  it('no feTurbulence / SVG filter in styles (reject-table lock)', () => { /* 负向断言 */ });
  it('degradation matrix collapses M5 tokens (RT block redefines them)', () => { /* 令牌级塌缩断言 */ });
  it('illustration layers carry no text content', () => {
    // 全部 IL 选择器块内不得出现 content: 非 '' 值 / 无新 DOM 文本钩子（静态层断言）
  });
});
```

补充（非 material.test.ts）：
- e2e：基线影响清单见各 IL 条目；重采按 D27/D28 双套 + `PENDING-HUMAN-REVIEW`。
- `scripts/audit-ui.mjs`：IL 层叠加后文本对比复核（IL-5 风险项）。
- `scripts/audit-perf.mjs`：确认 IL 未新增采样模糊面积（IL-4 无 backdrop 的验证）。
- bundle：`check-bundle` 增量 ≤ 8 KB（草案值）。

---

## 6. 指令验收门映射表（2026-09-08 指令原文术语 → 仓库既有门）

| 指令术语 | 仓库对应门（TEST_MATRIX §5 verify） | 当前状态（2026-09-08 实测） |
|---|---|---|
| 工程 | #1 typecheck / #4 build / #11 bundle / 0 运行时依赖 | 绿（29.1 KB / 250 KB；lint:policy 0 deps） |
| 确定性 | #2 单测黄金路径精确值 + L1 双语数值全等 + D29 freeze 开关 | 单测绿（346 passed）；视觉基线像素确定性已实证（隔离运行 6/6 逐字节一致；§7.1 所述「非确定性」经复现取证**更正**为本地 trace 工件竞态假失败，2026-09-08 已修，playwright.config 本地 trace=off / CI 不变，修复后同负载复现 6/6 全过） |
| 资源守恒 | bundle 预算、idle CPU ~0、观察窗 18 元素上限 | 绿 |
| 隐私 | localStorage 五键白名单（lint:policy） | 绿（实测写入 4 键，`cf.locale` 按需） |
| 安全投影 | #3/#10 网络禁令 + offline e2e（拦截一切外部请求） | 绿（完整 verify 退出码 0，五项目 offline 全过） |
| 真实控件旅程 | #7 keyboard e2e（纯键盘全流程）+ #6 mobile 触摸 + #5 desktop 全流程 | 绿（keyboard 15/15、mobile 72 passed、desktop 115 passed，三引擎） |
| 100% / 150% 布局 | **规格无此门**。最近似：pseudo-long ×1.7 布局校验（§3.1）+ 1440/390/360 视口 + G6 无横向滚动 | 若需 150% 缩放门 → TEST_MATRIX 修订，属所有者决策（随 SPEC BLOCKER 选项一并裁决） |
| 教程与六幕完成 | 教程 = tutorial.spec（五步 + 二次跳过，绿）。**「六幕」在规格中不存在**：规格为 1 教学 + 3 个 Act（§11）+ 12 周期 + 5 结局；对应既有门 = desktop.spec 12 周期全流程 | 全流程门绿；术语需所有者澄清 |
| Outcome | endings.spec：A–E 五结局全触发 | 绿（隔离串行 5/5 全过；批量运行中的失败经取证均为 §7.1 trace 竞态假失败） |
| 旧存档兼容 | **规格无存档系统**（§17.4 刻意不保存，刷新即失）。等价面 = 五键 localStorage 跨版本语义保持 + L4 切语言状态保持 | 绿；若指令指「未来版本进度迁移」，则为规格外概念，需 SPEC BLOCKER 一并澄清 |

---

## 7. 风险与未决项（实现批次须知）

1. **~~result-stable 基线非确定性~~ → 已更正并修复（2026-09-08）**：最初两次
   隔离运行一过一败，当时疑为结局幕 settle 时序。取证复现（repeat-each=6 ×
   workers=6 → 4 failed）后确认：**全部失败为 `browserContext.close ENOENT`**
   ——本地 `retain-on-failure` 在测试通过后清理 trace，与 context.close 的
   trace 收尾写入竞态，把**已通过**的测试标为失败；失败工件目录中无
   actual/expected/diff 截图三件套（断言从未失败、基线从未 diff）。当日全部
   20 个批量失败同签名。修复：playwright.config `trace: CI ?
   'retain-on-failure' : 'off'`（CI 语义不变，本地 error-context 仍落盘）；
   同负载复现 6/6 全过，隔离运行累计 12/12 全过。**修复后完整 `npm run verify`
   12 阶段全绿、退出码 0**（2026-09-08 22:37：desktop 115 / mobile 72 /
   keyboard 15 / locale 10 / a11y 15 / offline 5 / presentation 17，零失败）。
   **结论：基线确定性无缺陷，无需任何 M5 先决条件**。
2. **axe 超时类 flake**：批量高负载下 firefox/webkit 的 axe.analyze 偶发
   超时（90s/120s 档）。trace 关闭后负载下降，完整 verify 复跑见会话终报；
   若仍偶发，属测试基建议题（timeout 档位/worker 数归 TEST_MATRIX 范畴，
   所有者裁定），非产品缺陷。
3. **「我不背锅」证据已补采**（S3，2026-09-08 经 Steam 公开 API 定位与取证，
   详见 §1）：结论方向与 S1/S2 一致（朋友局核心、策略穷尽衰减、差评在基建），
   §2.3 权重尺维持不变；其样本仅 3 条可见评论，量级有限，如需更深社区文本
   （评论区全量/社区帖）待 WebSearch 配额 2026-10-03 恢复后可选补强。
4. **玩法层 SPEC BLOCKER 未决**：指令的趣味性/挑战性/随机性权重分析在
   冻结区（§0.1）。在人工裁决前，任何「插画提升沉浸感」的实现都不得
   顺手夹带玩法语义（如用插画暗示「最优策略」）。
5. **M4 草案仍未获批**：M4 动 `.tool-btn` / 浮动层，M5 动结局幕 / 炉膛 /
   台面 / 纸面——表面不相交，但基线重采应合批（避免两轮 churn）。
   §7.1 已解决，无先决顺序障碍；M4 / M5 由所有者定序或合批。
6. **README 媒体重采**：实现批次按 PRESENTATION_SPEC 既有媒体规格流程执行
   （v4 先例 e1eb584）；README 文案零改动（公开呈现面冻结）。

---

## 8. 草案声明

本文件是 **UI_CONTRACT v4.8 M5 批次的设计草案**，不是规格、不是契约正文、
不是实现。全部 recipe、令牌值、权重尺、断言提案均待所有者批准后方可进入
实现批次；批准时应把采纳项写回 `UI_CONTRACT.md` 正文（v4.5 批次表追加 M5 行，
并同步 v4.3 令牌表「用途」栏）。草案撰写本身零实现；撰写后同会话另行落地的
唯一变更属授权测试基建：`playwright.config.ts` 本地 trace 关闭（§7.1 修复，
CI 语义不变），不属于本草案的任何 recipe。
