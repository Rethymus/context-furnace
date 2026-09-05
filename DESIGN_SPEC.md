# DESIGN_SPEC.md — 《断章取火器 / Context Furnace》设计规格

> **权威版本：v2.0-frozen + P0 裁决（2026-09-06）**
> 本文档是规则的唯一实现依据。执行 Agent 无产品设计权（见 AGENTS.md）。
> 所有玩家可见文本以 CONTENT_SPEC.md 为唯一来源；本文只定义规则、数值、行为、视觉与音频。
> 本文档与历史版本（v1.0 / v1.1 / 原始规格文稿）冲突时，**以本文档为准**。

---

## 0. 裁决记录（Adjudication Record）

原始冻结规格存在以下口径冲突或缺口。D1–D12 依据 `SPEC_CODING_PLAN.md` G1 建议缺省，经用户指令（2026-09-06「先进行文档拆分与裁决」）确认采用；D13–D26 为 2026-09-06 缺口清单决策轮（用户逐项确认）补裁决。**裁决结果具有与原规格同等的冻结效力**；如需推翻须人工修改本节。

| # | 类型 | 问题 | 裁决 |
|---|------|------|------|
| D1 | 冲突 | 原文「5–7 semantic segments」 vs 测试上限 `5 <= segments <= 8` vs Cycle 06 实际 8 段 | 每卡 **5–8 段**为机制上限；当前 12 张卡实际为 **6–8 段**（C02/C04 为 6 段，C06 为 8 段，其余 7 段）。原文「5–7」措辞作废 |
| D2 | 缺口 | 黄金路径 Path B 要求「设计文档指定的一组中度 cut + gain」，但原文从未给出 | 钉死为确定性脚本：**每轮切除 s0（各卡首段 ATTR，penalty 4），保留 s1..末段（含 CORE）；GAIN：C01–C04=0，C05–C06=1，C07–C12=2**。期望终值见 TEST_MATRIX.md |
| D3 | 缺口 | 键盘测试要求 Escape，但全文未定义其行为 | Escape = **关闭设置面板（若打开）**；其余状态无操作 |
| D4 | 缺口 | 结果页「平均切除比例」无计算定义 | = 已完成各轮 `1 − ratio`（ratio 见 §9.4）的算术平均，以百分数显示（取整） |
| D5 | 冲突 | 机器反馈条件中 `damage` 与 `fidelityDamage` 混用、区间可能重叠 | 条件变量统一为 **`fidelityDamage`**；按 §12 表格**自上而下首个匹配生效**；`heatGain ≥ 30` 规则为**附加行**（与主消息同时显示） |
| D6 | 冲突 | 术语表（冻结）写「保真度」，界面草图写「保真」 | 以冻结术语表为准：**保真度 / Fidelity**。草图为紧凑示意，作废 |
| D7 | 缺口 | 术语表未覆盖少量控件文案 | 补齐（与既有术语同风格）：重播教学 / Replay tutorial；声音开关 开 / On、关 / Off；观察窗标签 共振观察窗 / Resonance window；周期显示 周期 04 / 12（zh）与 Cycle 04 / 12（en，大写交给 CSS） |
| D8 | 缺口 | 教学卡无 roles 定义、无结算规则 | 教学卡 3 段、**无评分 roles、无 CORE 约束**；选区非空即可 IGNITE；IGNITE 即结束教学，**不影响** heat / fidelity / 隐藏状态 / 周期计数 |
| D9 | 缺口 | 每轮初始选区与 GAIN 初值未定义 | 每次 LOAD 选区**重置为全选**（left=0, right=N−1）；GAIN 旋钮为物理状态，**跨周期保持**（每次开机重置为 0）；RESET CUT 恢复全选 |
| D10 | 缺口 | peakHeat 统计口径未定义 | `peakHeat` 初始化为初始炉温（52），每次结算后取 `max(peakHeat, heat)` |
| D11 | 解释 | CORE 是否在界面可视化 | **不做任何可视化标记**。CORE 仅为数据与校验存在；D9 的默认全选保证初始合法，玩家过度裁剪时由「未检测到有效核心」反馈约束 |
| D12 | 缺口 | 设置项 Replay tutorial 的可用时机 | 仅在 **HOME_OFF 与 ENDING** 状态可用（触发教学重放，结束后进入 Cycle 01）；游戏中禁用置灰 |
| D13 | 缺口 | 桌面端 GAIN 旋钮鼠标操作未定义 | 四卡位可点（≥44×44，无障碍 radiogroup 模式）+ 鼠标拖拽旋转增强（纯视觉反馈，机制等同卡位点击）；桌面/移动一致 |
| D14 | 缺口 | EXTRACT 轨道块与 FEED 正文的映射方式 | 轨道块按 segment **等宽**排列；FEED 正文**实时高亮**当前选区（选中高亮、未选中弱化），建立块↔文字映射 |
| D15 | 缺口 | 结局/结果页 Hum 底噪是否持续 | 进入任何 **ENDING 即停止** 48/96 Hz Hum；结果页交互音效（按钮 tick 等）保留 |
| D16 | 缺口 | 复制结果的成功/失败反馈未定义 | 成功显示「已复制 / Copied」**1.2 s**；剪贴板 API 失败**静默降级**（无弹窗无报错） |
| D17 | 缺口 | 负载指示标签文案缺失 | **当前负载 / Current load**（sentence case，大写交给 CSS） |
| D18 | 缺口 | 页面 `<title>` 与 favicon 未定义 | `<title>` 跟随 locale（断章取火器 / Context Furnace）；favicon = 自绘火焰形 SVG（--heat #A43A2F 单色） |
| D19 | 发布决策 | 浏览器支持矩阵（原文仅 Chromium） | evergreen CI：功能 e2e 三引擎（Chromium / Firefox / WebKit 桌面）；移动仿真 Chromium + WebKit；**视觉基线仅 Chromium**（跨引擎像素差异不计入回归）；axe 全引擎 |
| D20 | 发布决策 | 部署目标未定义 | GitHub Pages；**先建私有仓库**，用户后续手动转公开；Vite `base: './'` 相对路径（本地预览与 Pages 通用，规避仓库名依赖）；deploy 工作流 `workflow_dispatch` 手动触发（私有阶段不运行） |
| D21 | 缺口 | 规格外 UI 交互是否发声 | 除 §16 定义音效外，RESET / NEXT INPUT / 设置 / 语言切换 / 复制等交互**全部静音** |
| D22 | 缺口 | 结局 A–D 无专属音效定义 | 结局 A–D 触发时播放一次「归零滑落音」：sine 指数滑落 220→55 Hz、300 ms、gain 0.02；结局 E 仅有原「咔」，**不叠加**滑落音 |
| D23 | 缺口 | 「继电器轻响/crackle」与 heat≥90「低频共振」合成参数未钉死 | **仅保留方向性描述，合成参数授权实现自定**——全项目唯一授权自由发挥点（AGENTS.md 豁免条款）；其余一切仍冻结 |
| D24 | 缺口 | 观察窗 glyph 基础运动模型未定义 | 独立布朗漂移（基准 ~2 px/s）+ 边界反弹；agitation 档位速度 ×1.2 / ×1.4；75+ 偶发抖动（每 2–5 s 一次 2–3 px）；polarization 聚类力叠加在漂移之上。RM 下退化为 opacity pulse |
| D25 | 缺口 | 形状减少/聚类的过渡方式未定义 | 每次结算后存活 glyph 用 ~1 s 缓动迁移至 polarization 新目标位；形状种类变化（reduction 档位）即时替换 + 200 ms 淡入。RM 下迁移退化为即时重排 |
| D26 | 缺口 | 炉膛火焰与 HEAT 值的关系（平时状态未定义） | 炉膛光强/焰高 = heat 值**连续映射**（低值微光、高值明亮摇曳）；IGNITE 300–600 ms 内额外增强脉冲；开机动画结束后收敛到 heat 映射值；RM 下以亮度阶梯代替摇曳 |
| D27 | 无人值守 | §136 要求「首次人工确认 UI 后」才能采基线，无人阶段无人工 | Agent **自采** 8 张基线用于防回归，全部标记 `PENDING-HUMAN-REVIEW`；**首次人工会话必须复核**，可整体作废重采。自采≠已确认 |
| D28 | 无人值守 | 快照像素受 OS 字体渲染影响，跨平台必假报回归 | **双套基线**：本地 Windows 一套 + CI（Linux）一套（Playwright 平台快照目录天然隔离）；两套首采均由 Agent 完成（D27 标记）；快照断言内嵌于 desktop/mobile spec，随 verify 的 e2e 项执行 |
| D29 | 无人值守 | 漂移（D24）与摇曳（D26）为持续动画，位置随时间变化导致快照不可复现 | 观察窗初始位置与运动用**固定种子的确定性伪随机**；提供**仅测试启用的冻结开关**（如 `?freeze=1`，生产默认不可用）暂停 rAF 位置更新——属测试基础设施（AGENTS.md 授权范围），不是游戏功能 |
| D30 | 无人值守 | D20 要求建私有仓，但仓库名未定、gh/git 身份未必可用 | 仓库名 **ContextFurnace**、分支 `main`；回退链：`gh` 已登录 → 建私有仓并推送；未登录 → 仅本地 `git init` + commit（用全局 git 身份）；无全局身份 → 仅 init 不 commit。任一回退**不阻塞开发**，日志注明实际路径。**已被 D36 修订：仓库名改为 `context-furnace`，回退链与分支不变** |
| D31 | 缺口 | About（§17.2 免责文本）无界面入口 | 入口 = **设置面板内「关于 / About」项**；补键 `settings.title` / `about.title` |
| D32 | 缺口 | 插头与裁刀缺无障碍名称（键盘测试必需） | 插头 aria-label：**电源插头 / Power plug**；裁刀 aria-label：**左裁刀 / Left cutter**、**右裁刀 / Right cutter**（视觉雕印 LEFT / RIGHT 不变，仅屏幕阅读器使用本地化名称） |
| D33 | 澄清 | 「重新运行」的重置范围未写明 | 重新运行 = **全量重置**：所有数值按 §9.1 重新初始化、GAIN 归零、隐藏状态清零、peakHeat 等统计清零；`cf.tutorialSeen` 保留 |
| D34 | 缺口 | index.html 元信息范围未定义 | 仅包含 title（D18）、favicon、viewport、`lang` 四项；**不加** meta description / OG 标签 |
| D35 | 缺口 | 教学步骤是否锁输入未定义 | 高亮**仅为引导，不锁任何输入**；IGNITE 在教学任意时刻可点，点击即完成教学——防软锁 |
| D36 | 冲突 | 展示面冻结文档（Repository Presentation Freeze §3）定仓库名 `context-furnace`，与 D30 的 `ContextFurnace` 冲突 | **`context-furnace`**（用户 2026-09-06 裁决）；D30 回退链与分支 `main` 不变 |
| D37 | 缺口 | License 类型从未决定（公开面字段，Agent 不得自选） | **MIT**：仓库含 LICENSE 文件，README 保留 License/许可证 章节；版权行作者名留空由人工填写，Agent 不得虚构姓名（缺失→SPEC BLOCKER） |
| D38 | 缺口 | 中文 README H2 固定标题集未给出 | 开始游戏 / 游戏简介 / 怎么玩 / 游戏截图 / 操作 / 语言 / 技术栈 / 本地运行 / 测试 / 项目范围 / 许可证（PRESENTATION_SPEC §7） |
| D39 | 缺口 | GIF 生成需 ffmpeg，无人值守不宜装系统依赖 | devDependency **`ffmpeg-static`**（仅 `npm run capture:readme` 使用）；这是对 §18.2 开发依赖清单的**显式修订**，仍非运行时依赖；verify 不要求系统 ffmpeg |
| D40 | 缺口 | Pages URL 未知（用户名与公开时机不可得） | `gh` 可用 → `https://<login>.github.io/context-furnace/` 写入 metadata 与 README Play 链接；不可用 → 保留 `YOUR_GITHUB_PAGES_URL` 占位并列入首次人工会话清单（URL 为部署事实、非创作性文案，不触发 blocker） |
| D41 | 归一 | 展示面文档把 meta description 列入受检公开面，D34 规定不加 | 维持 D34：index.html **不加** meta description / OG；presentation 测试 P6 断言其**不存在** |
| D42 | 结构 | 展示层引入新文件与 verify 新项，与 §18.4 冻结结构 / 原 §138 十一项 verify 冲突 | 文件结构修订（新增 README×2、PRESENTATION_SPEC.md、LICENSE、.github/、scripts/、docs/media/、tests/presentation.test.ts，见 §18.4）；verify 扩为 **12 项**（+presentation）；媒体采集走真实 Playwright 流程、禁用状态强制参数（与展示面文档 §19 一致；D29 冻结开关兼容） |

---

## 1. 产品定义

### 1.1 名称与型号

| 项 | zh-CN | en-US |
|---|---|---|
| 正式名称 | 《断章取火器》 | Context Furnace |
| 设备型号 | CF-01 语境精炼装置 | CF-01 Context Refining Unit |
| 核心铭文 | 本机只负责加工，不负责理解。 | Processing only. Understanding not included. |

英文命名是**本地化命名而非直译**（利用「断章取义」双关只在中文存在）。双语设计全程遵循此原则：两种语言各自像母语写成，不逐字对应。

### 1.2 定位

一款关于**「信息在加工过程中逐步失真」**的讽刺小游戏（satirical interactive game）。**不是**经过科学验证的媒体素养干预工具，不得宣称任何教育效果。

讽刺对象是**一种信息加工激励机制**（删语境 → 加情绪 → 填解释 → 个体概括成群体 → 差异描述成冲突 → 输出越「好看」奖励越高），而**不是**新闻行业、自媒体从业者或任何人群。**机器永远不邪恶**——它只是在努力提高燃烧效率。这就是作品的核心讽刺。

### 1.3 规模硬冻结

| 项 | 值 |
|---|---|
| 首次通关时长 | 5–7 分钟 |
| 再次游玩 | 3–5 分钟 |
| 正式周期 | **12 个**（顺序永久固定，无随机） |
| 教学 | 1 个（不计入正式周期） |
| 场景 | 1 个 |
| 主要操作 | **2 个**（CUT、GAIN） |
| 可见资源 | **2 个**（HEAT、FIDELITY） |
| 正式关卡文本 | 12 条 |
| 结局 | 5 个 |

**不存在**（禁止实现）：地图、角色、对话树、剧情章节、背包、商店、账号、经验、技能、卡牌构筑、随机关卡、每日挑战、排行榜、在线统计、后端、AI API、LLM、3D、WebGL、Canvas 游戏引擎、数据库、第三套核心玩法。

### 1.4 世界观

不提供人物世界观：不介绍公司、不解释谁制造了机器、不解释玩家为何在此。玩家只看到一台 CF-01——类似实验室设备 / 教学仪器 / 老式工业测试设备。全文**禁止**出现「你是一名……」「欢迎加入……」「你的老板要求……」「今天是你工作的第一天……」等叙述。

### 1.5 Scope 参照（背景约束，非实现项）

学：《We Become What We Behold》的单反馈循环与 5 分钟体量；《Papers, Please》LCD demake 的单屏 + 极简选项；Universal Paperclips 的中性指标推向荒谬。反面对照（禁止膨胀方向）：《Not For Broadcast》《Headliner》式的剧情 / 人物 / 多结局社会模拟。开发周期只允许转化为**完成度**，不允许转化为 Scope。

---

## 2. 玩家旅程：首页与开机

### 2.1 首次打开

浏览器加载完成，**不播放任何声音**。背景为近乎黑色的实验台，屏幕中央是一台未通电的 CF-01。首页结构（桌面）：

```text
┌─────────────────────────────────────────────┐
│                 ┌──────────────────┐        │
│                 │      CF-01       │        │
│                 │    断章取火器     │        │   ← en: CONTEXT FURNACE
│                 │   语境精炼装置    │        │   ← en: Context Refining Unit
│                 │   ○        ○     │        │
│                 │ HEAT    FIDELITY │        │
│                 │    [ 启 动 ]     │        │   ← en: [ POWER ON ]
│                 └──────────────────┘        │
│        本机只负责加工，不负责理解。           │
│                    中文 / EN   ⚙             │
└─────────────────────────────────────────────┘
```

唯一主按钮：**启动 / POWER ON**。首页**禁止**出现「开始游戏」「Play Game」「New Game」——那会破坏「操作一台设备」的包装。右上角为语言切换（中文 / EN）与设置（⚙）。

### 2.2 POWER ON

点击 POWER ON 是浏览器收到的第一次明确用户手势，**此时才允许创建或恢复 AudioContext**（遵守浏览器自动播放策略）。随后进入启动动画，总时长 **1.15 秒**：

| 时间窗 | 事件 |
|---|---|
| 0–120 ms | 机械继电器「咔」 |
| 120–470 ms | 两仪表指针执行一次测试扫描（0 → 100 → 0） |
| 470–720 ms | 设备下方观察窗亮起，出现 18 个符号 |
| 720–950 ms | 炉膛内部出现微弱橙光 |
| 950–1150 ms | 显示「校准完成 / Calibration complete」 |

随后：首次访问（无 `cf.tutorialSeen`）→ Tutorial；已完成教学 → Cycle 01。

### 2.3 Reduced Motion

`prefers-reduced-motion: reduce` 或设置为「减少动效」时，设备状态只通过 **opacity、数值、指示灯** 变化。**不执行**：指针扫过、设备震动、群体移动动画。此原则适用于全游戏所有动画（见 §8、§10.4、§14.6）。

---

## 3. 教学（Tutorial）

教学**不是说明书**：不弹出整页规则、不显示「游戏目标是……」、不解释「你需要通过断章取义……」、不解释分数机制。使用一条完全无争议的设备说明固定文本（见 CONTENT_SPEC.md §4.2），划分为 3 个 semantic units（中英文各自划分，不逐字对应）。

教学步骤：

| Step | 高亮 | 提示文案（zh / en） |
|---|---|---|
| 1 | 左刀发光 | 移动左裁刀 / Move the left cutter. |
| 2 | 右刀发光 | 调整保留范围 / Adjust the retained range. |
| 3 | OUTPUT 区 | 成品会实时更新 / The output updates immediately. |
| 4 | 入炉 / IGNITE 按钮高亮，玩家点击 | — |
| 5 | — | 校准完成 / Calibration complete. 教学结束 |

教学机制按 **D8** 裁决执行（无评分、无 CORE 约束、不影响任何数值）。高亮仅为引导、不锁任何输入；IGNITE 在教学任意时刻可点，点击即完成教学（D35）。

---

## 4. 主界面布局

### 4.1 桌面（参考结构）

```text
┌────────────────────────────────────────────────────────┐
│ CF-01                              周期 04 / 12         │
│                                             ⚙  EN     │
├────────────────────────────────────────────────────────┤
│     炉温 / HEAT               保真度 / FIDELITY         │
│       ╭──────╮                   ╭──────╮              │
│      ╱   68   ╲                 ╱   74   ╲             │
│     ╰──────────╯               ╰──────────╯             │
│               CURRENT LOAD: NORMAL                     │
├────────────────────────────────────────────────────────┤
│ 原料 / FEED                                             │
│  公司 尚未 决定全面降薪，目前只是调整少数岗位……            │
│ ─────────────────────────────────────────────────────  │
│ 截取 / EXTRACT                                          │
│  ░░░░░░████████████████░░░░░░░░░                        │
│          ▲              ▲                              │
│        LEFT           RIGHT                            │
│ 成品 / OUTPUT                                           │
│   「决定全面降薪」                                       │
├────────────────────────────────────────────────────────┤
│  [复原]                     GAIN            [入炉]      │
│                              ◉                         │
│                           0  1  2  3                    │
├────────────────────────────────────────────────────────┤
│                    共振观察窗                            │
│        ○  △  □   ◇  ⬡   △   ○  ▱   □                  │
│      ◇   ○  △  ▱   □   ⬡  ○   △   ◇                   │
│                    [状态条：机器消息]                    │
└────────────────────────────────────────────────────────┘
```

机器反馈消息（§12）显示在观察窗下方的状态条内（与移动端布局的 STATUS 对应）。

### 4.2 移动端（≤ 桌面断点）

垂直顺序：`HEADER → HEAT | FIDELITY → FEED → EXTRACT → OUTPUT → CUT TRACK → GAIN → RESET | IGNITE → OBSERVATION WINDOW → STATUS`。允许垂直滚动，**绝对禁止水平滚动**。最低支持 360 px 宽。

### 4.3 尺寸

- 机器最大宽度 960 px，理想 920 px；页面 `min-height: 100dvh`。
- 桌面 E2E 视口 1440×900；移动 E2E 视口 390×844 与 360×740。

---

## 5. 两个可见指标

仅两个，**禁止**增加任何第三、第四个公开计量（热度、点击、传播、情绪、信任、正确率、对立值等一律禁止）：

| 指标 | 范围 | 无障碍 |
|---|---|---|
| 🔥 炉温 / HEAT | 0–100 | `role="meter"` + `aria-valuemin/max/now` + `aria-label`（读法：炉温 68 / 100 · Heat 68 out of 100） |
| ◇ 保真度 / FIDELITY | 0–100 | 同上 |

**Fidelity 命名理由**：讨论的不是「这句话是不是凭空假的」，而是字都真、原话也真、但删语境加框架后整体理解变了。Fidelity = 输出与输入语义之间的保真程度。禁止改名为 Truth / Accuracy / 正确率。

---

## 6. 操作一：CUT

### 6.1 基本规则

- 每条原料被人工划分为 **5–8 个 semantic segments**（D1；当前内容 6–8）。中英文按各自语义切分（Semantic Twin，见 CONTENT_SPEC.md §1），segment ID 与 role 一一对应。
- 玩家**不能逐字任意选择**：左右裁刀只能吸附 segment boundary。
- 这同时解决中英语法差异、免 NLP、移动触摸、自动评分、自动测试与无障碍。
- 轨道块按 segment **等宽**排列；FEED 正文**实时高亮**当前选区（选中高亮、未选中弱化），建立块↔文字映射（D14）。

### 6.2 CORE 硬规则

每张卡恰有一个 `CORE` segment。选区（连续区间）**必须包含 CORE**，否则 IGNITE 按钮禁用，设备显示「未检测到有效核心 / No usable core detected」。CORE 不做可视化标记（D11）。

### 6.3 输入方式（拖动必须有非拖动替代，WCAG 2.2）

| 方式 | 行为 |
|---|---|
| Mouse | 拖动裁刀 |
| Touch | 拖动裁刀 |
| 点击轨道 | 移动距该 boundary 最近的裁刀 |
| Keyboard | 裁刀 focus 后 `←` / `→` 移动一个 segment |
| 按钮 | 复原 / RESET CUT：恢复全选（D9） |

### 6.4 目标尺寸

视觉刀头 18×26 px；实际 hit area **48×48 px**（宽于 WCAG AA 最低要求）。裁刀 aria-label：左裁刀 / Left cutter、右裁刀 / Right cutter（视觉雕印 LEFT / RIGHT 不变，D32）。

### 6.5 OUTPUT 显示

GAIN 0（原样截取）时，OUTPUT 以引号包裹选中文本显示：zh 用「」，en 用弯引号 “”；GAIN ≥ 1 的输出为模板/整句，按原文显示不加引号。

---

## 7. 操作二：GAIN

### 7.1 形态

一枚真实机械旋钮（**不是** Dropdown，**不是**现代 Slider），四个机械卡位 `0 1 2 3`。**禁止增加 GAIN 4/5**——0–3 已完整覆盖 RAW → LOADED → INFERRED → NARRATIVIZED 四级，第五档无新增交互意义。

移动端仍显示旋钮，但下方四个卡位各为 **44×44 px** 可直选，用户无需精确旋转。桌面与移动一致：四卡位均可点击（≥44×44，无障碍 radiogroup 模式）；另提供鼠标拖拽旋转作为纯视觉增强，机制等同卡位点击（D13）。

### 7.2 内部语义（设计内部定义，玩家永远看不到）

| Gain | 内部含义 | 行为约束 |
|---|---|---|
| 0 | 原样截取 | OUTPUT = 玩家选择的原文，不改任何字 |
| 1 | 情绪加权（loaded wording） | 只加情绪化措辞/标签（如「涨价信号：{selection}」），不创造新的核心事实 |
| 2 | 解释填补（inference） | 从相关信息主动推导原因、趋势或结论（uncertainty → certainty） |
| 3 | 叙事重构（narrative synthesis） | 可推断动机、群体化、价值判断、二元化、夸张因果、翻转限定条件；但**不**凭空创造新人物或事件 |

### 7.3 解锁时刻表（固定）

| 周期 | 可用 GAIN | 解锁提示（显示 1.2 秒，附「咔」声） |
|---|---|---|
| Cycle 01–04 | 仅 0（其余暗色） | — |
| Cycle 05–06 | 0–1 | 辅助增益已启用 / Auxiliary gain enabled |
| Cycle 07–08 | 0–2 | 二级增益可用 / Gain level 2 available |
| Cycle 09–12 | 0–3 | 高增益模式可用 / High-gain mode available |

**不解释**各档位做什么——让玩家自己发现「GAIN 调高以后，话越来越不像原话，但火确实旺了」。GAIN 旋钮位置跨周期保持（D9），每次开机重置为 0。

---

## 8. 轮次流程

### 8.1 每 Cycle 严格执行

```text
LOAD → CUT → GAIN → PREVIEW → IGNITE → HEAT FEEDBACK
→ FIDELITY FEEDBACK → OBSERVATION WINDOW FEEDBACK
→ MACHINE MESSAGE → NEXT INPUT
```

### 8.2 IGNITE 后不可撤销

按下入炉 / IGNITE 后该轮锁定：**无 Undo、无 Back、无 Retry this round**。防止玩家把游戏当成纯「找最优答案」。每次 LOAD 选区重置为全选（D9）。

### 8.3 反馈动画（总时长 950 ms）

| 时间窗 | 事件 |
|---|---|
| 0–140 ms | 机械按钮下沉 |
| 140–300 ms | HEAT 先扣除当轮耗散（decay） |
| 300–600 ms | 纸带进入炉中，火焰增强，HEAT 上升 |
| 600–770 ms | FIDELITY 指针移动 |
| 770–950 ms | 观察窗变化 |

随后出现 NEXT INPUT（或直接进入结局）。

炉膛常态：光强/焰高随 heat 值连续映射（低值微光、高值明亮摇曳）；IGNITE 的 300–600 ms 窗口内额外增强脉冲；开机动画结束后收敛到 heat 映射值；Reduced Motion 下以亮度阶梯代替摇曳（D26）。

---

## 9. 数值系统（全冻结，禁止 Agent 调参）

### 9.1 初始化

```text
heat = 52        fidelity = 100
agitation = 0    polarization = 0    reduction = 0
```

后三个为**玩家不可见**的隐藏状态。

### 9.2 每阶段热损耗（decay）

| 周期 | decay |
|---|---|
| Cycle 01–04 | 12 |
| Cycle 05–08 | 15 |
| Cycle 09–12 | 18 |

### 9.3 CUT Damage Weight（role → penalty，固定）

| Role | penalty | | Role | penalty |
|---|---:|---|---|---:|
| ATTR | 4 | | CONTRAST | 10 |
| CONTEXT | 4 | | CONDITION | 10 |
| TIME | 6 | | CAUSE | 12 |
| SCOPE | 8 | | NEG | 18 |
| BASE | 8 | | **CORE** | **0** |
| QUAL | 9 | | | |
| MODAL | 9 | | | |

### 9.4 公式

```text
cutDamage    = min(28, Σ penalty(role))          // 求和范围：位于选区之外的 guard segments
ratio        = selectedSegments / totalSegments
compression  = ratio > 0.75 → 0 ; > 0.50 → 3 ; > 0.33 → 6 ; ≤ 0.33 → 9
contextHeat  = min(10, floor(cutDamage × 0.35))
heatGain     = clamp(0, 38, 10 + compression + contextHeat + gainHeatBonus)
fidelityDamage = min(36, cutDamage + gainFidelityPenalty)

heat     = clamp(0, 100, heat − decay + heatGain)
fidelity = clamp(0, 100, fidelity − fidelityDamage)
```

### 9.5 Gain 数值

| Gain | Heat bonus | Fidelity penalty |
|---|---:|---:|
| 0 | 0 | 0 |
| 1 | 4 | 1 |
| 2 | 9 | 6 |
| 3 | 15 | 12 |

### 9.6 隐藏状态更新（每轮结算后）

```text
GAIN 1: agitation += 6
GAIN 2: agitation += 3 ; polarization += 4 ; reduction += 4
GAIN 3: agitation += 4 ; polarization += 9 ; reduction += 11
另外恒有:
agitation    += max(0, heatGain − 20) × 0.3
polarization += cutDamage × 0.15
全部 clamp 0–100（允许小数累积）
```

**玩家永远看不到** Agitation / Reduction / Polarization 的名字或数字——环境只是在自己变化。隐藏状态表达：Agitation = 情绪被不断提高；Reduction = 复杂个体被压缩成简单标签；Polarization = 标签逐渐形成阵营。

### 9.7 统计量

- `peakHeat`：初始化为 52，每次结算后 `max(peakHeat, heat)`（D10）。
- 平均切除比例：已完成各轮 `1 − ratio` 的算术平均，百分数取整（D4）。
- `highestGain`：本局使用过的最高 GAIN 档位。

---

## 10. 共振观察窗

### 10.1 初始状态

固定 **18 个 SVG glyph**（自绘 `<path>`/`<circle>`/`<polygon>`，**禁止 emoji、禁止图标字体**）：○ △ □ ◇ ⬡ ▱ 各 3 个，随机混合分布。

### 10.2 Agitation 效果（漂移速度）

| 区间 | 效果 |
|---|---|
| 0–24 | 缓慢漂移 |
| 25–49 | 移动速度 +20% |
| 50–74 | 移动速度 +40% |
| 75–100 | 偶发 2–3 px 快速抖动 |

Reduced Motion 下只做轻微 opacity pulse。

基础运动模型：独立布朗漂移（基准 ~2 px/s）+ 边界反弹，速度按上表档位缩放；polarization 聚类力叠加在漂移之上（D24）。

### 10.3 Reduction 效果（形状种类）

| 区间 | 剩余形状 |
|---|---|
| 0–24 | ○ △ □ ◇ ⬡ ▱（6 种） |
| 25–49 | ○ △ □ ◇（4 种） |
| 50–74 | ○ △ □（3 种） |
| 75–100 | ○ □（2 种）——原本复杂的个体最终只剩两个标签 |

形状种类变化（档位下降）时即时替换 + 200 ms 淡入（D25）。

### 10.4 Polarization 效果（空间聚类）

| 值 | 效果 |
|---|---|
| 0 | 随机混合 |
| 25 | 轻微聚类 |
| 50 | 明显形成左右两团 |
| 75 | 中央出现明显空隙 |
| 100 | 两个阵营各据一侧，中央只留空白 |

**中央不能真的画分割线**，只留空白。所有群体变化在 Reduced Motion 下退化为 opacity/数值变化。

每次结算后，存活 glyph 以 ~1 s 缓动迁移至新目标位（D25）。

确定性与测试可复现（D29）：观察窗初始位置与运动、火焰摇曳相位均使用**固定种子的确定性伪随机**；另提供**仅测试启用的冻结开关**（如 `?freeze=1`，生产默认不可用）暂停 rAF 驱动的位置更新，保证视觉快照可复现。该开关属测试基础设施，非游戏功能。

### 10.5 无障碍

整个观察窗为纯视觉隐喻：容器 `aria-hidden="true"`，禁止让屏幕阅读器逐个朗读形状。

### 10.6 性能

观察窗动画最多 **18 个 DOM/SVG 元素**；禁止在 requestAnimationFrame 中持续做复杂布局测量。

---

## 11. 三个 Act（机器状态，无故事文本）

| 周期 | Act | Current Load |
|---|---|---|
| Cycle 01–04 | 校准 / CALIBRATION | 正常 / NORMAL |
| Cycle 05–08 | 增压 / PRESSURE | 高负载 / HIGH LOAD |
| Cycle 09–12 | 共振 / RESONANCE | 过载运行 / OVERDRIVE |

Act 只是机器状态标签，没有任何故事文本。

---

## 12. 机器反馈消息

按本轮结算结果，依 **D5**：条件变量为 `fidelityDamage`，**自上而下首个匹配生效**；`heatGain ≥ 30` 为附加行（与主消息同时显示）。

| 顺序 | 条件 | 消息（zh / en） |
|---|---|---|
| 1 | `fidelityDamage === 0 && heatGain <= 12` | 燃烧效率偏低。/ Combustion efficiency low. |
| 2 | `fidelityDamage <= 5 && heatGain <= 18` | 参数稳定。/ Parameters stable. |
| 3 | `fidelityDamage` 6–12 | 有效浓度合格。/ Concentration accepted. |
| 4 | `fidelityDamage` 13–20 | 冗余成分已清除。/ Redundant matter removed. |
| 5 | `fidelityDamage` > 20 | 高纯度输出。/ High-purity output. |
| 附加 | `heatGain >= 30` | 优质燃料。/ High-yield input. |

**禁止**「干得漂亮！/ Good job!」之类人格化文案——机器没有人格。

---

## 13. 五个结局

### A. COLD END

- 触发：结算后 `heat <= 0`，**立即结束**。
- 文案：**设备停机** / 未达到持续运行条件。（en: **Equipment offline** / Operating temperature could not be sustained.）
- 观察窗保持当前状态。

### B. SIGNAL LOST

- 触发：结算后 `fidelity <= 0`。
- 文案：**信号失真** / 输入与输出已失去可验证关联。（en: **Signal lost** / Input and output no longer retain a verifiable relation.）
- 所有仪表冻结。

### C. STABLE RUN

- 触发：Cycle 12 完成（heat > 0）且 `fidelity >= 60`。
- 文案：**稳态运行** / 今日指标完成。（en: **Stable run** / Daily quota complete.）

### D. PEAK EFFICIENCY

- 触发：Cycle 12 完成（heat > 0）且 `0 < fidelity < 60`。
- 文案：**效率标兵** / 本周期燃烧效率创下新高。（en: **Peak efficiency** / This cycle set a new combustion record.）
- 预期中最具黑色幽默的结局。

> 触发优先级：先查 heat ≤ 0（A），再查 fidelity ≤ 0（B），最后按 Cycle 12 完成情况分 C/D。A/B/C/D 互斥。

### E. UNPLUGGED（隐藏结局）

- Cycle 09 起，设备右下角出现一个**电源插头**。它不是提示：**无 tooltip、无闪烁、无问号、无成就提示**。
- 操作：Mouse / Touch 点击；Keyboard Tab 可 focus，Enter / Space 触发。仅在 ROUND_EDITING / ROUND_RESULT 状态可触发（见 §18 状态机）。aria-label：电源插头 / Power plug（D32）。
- 表现：立即「咔」；所有仪表 → 0；火焰熄灭；观察窗 2 秒内逐渐恢复 6 种形状并重新混合；显示 **设备已停止工作 / Equipment offline**，**无正文**。
- 游戏绝不说「你终于做对了」——否则从讽刺作品变成说教（原文 §82）。

---

## 14. 结果页

### 14.1 显示项（仅五项）

```text
最高炉温 / Peak heat          （peakHeat）
最终保真度 / Final fidelity   （fidelity）
平均切除比例 / Average cut    （D4 口径）
最高增益 / Highest gain used  （highestGain）
设备状态 / Machine status     （结局名）
```

**不显示**：分数、星星、S/A/B/C、排名、成就、XP、全球玩家百分位。

### 14.2 Copy Result（仅剪贴板，无图片、无分享 SDK）

模板见 CONTENT_SPEC.md §4.9（逐字使用）。复制成功后按钮旁显示「已复制 / Copied」1.2 s；剪贴板 API 失败时静默降级（D16）。

### 14.3 重新运行

结果页提供「重新运行 / Restart」→ 回到 HOME_OFF。重新运行 = 全量重置：所有数值按 §9.1 重新初始化、GAIN 归零、隐藏状态与统计清零；`cf.tutorialSeen` 保留（D33）。

---

## 15. 视觉规范

### 15.1 方向

**Institutional laboratory equipment**：教学实验室、国营老式测试仪器、机械刻度、烤漆金属、磨砂玻璃、纸质原料带、明确的功能标签。

**不是**：Apple Glass、Cyberpunk、蒸汽朋克、AI 紫、复古 CRT 大杂烩。

### 15.2 Color Tokens

```css
--page: #0E0F0C;            --bench: #22231D;
--machine: #D8CFB3;         --machine-secondary: #C6B994;
--machine-shadow: #81775F;
--ink: #181A16;             --muted-ink: #4A493F;
--paper: #F3ECD9;
--glass: #252923;           --glass-line: #85836F;
--heat: #A43A2F;            --fidelity: #2C625A;
--warning: #D4A72C;
```

核心文字组合必须达到 WCAG AA。

### 15.3 Typography

禁止下载字体（零网络字体）。仪器标签用 monospace 栈：

```css
font-family: ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas,
  "PingFang SC", "Microsoft YaHei", "Noto Sans Mono CJK SC", monospace;
```

中文正文若 monospace 回退显机械，可单独用 `"PingFang SC", "Microsoft YaHei", system-ui, sans-serif`。

### 15.4 字号

| 项 | 值 |
|---|---|
| 正文 | 16 px，line-height 1.65（任何正文不得 < 16 px） |
| Title | 24 px desktop / 22 px mobile |
| 仪表数字 | 30 px desktop / 24 px mobile |

### 15.5 排版规则

中文（`lang=zh-CN`）：

```css
line-break: strict;  word-break: normal;  overflow-wrap: break-word;
```

禁止 `word-break: break-all` 处理中文正文。

英文（`lang=en-US`）：允许 `overflow-wrap: break-word; hyphens: auto;`；文本区最大阅读宽度 62ch。

### 15.6 大小写

源码字符串一律 **Sentence case**；工业标签的大写交给 CSS `text-transform: uppercase`（如源码 `Current load` → 视觉 `CURRENT LOAD`）。本地化字符串不得储存奇怪大写。

---

## 16. 音频规范

- **无 BGM**（冻结决定；机器操作本身就是节奏，持续音乐会增加游戏化包装）。
- 只用 **Web Audio API 程序化合成**；**不加载** MP3/WAV/OGG 等任何音频文件（零网络请求、零版权问题）。
- AudioContext 仅在 POWER ON 手势内创建/恢复（§2.2）。
- 关闭声音或 AudioContext 创建失败时，整局必须可以完成——音频只是反馈，不是逻辑依赖。

| 音效 | 合成参数 |
|---|---|
| 通电 Hum（持续，极低音量） | Osc A: sine 48 Hz, gain 0.012；Osc B: sine 96 Hz, gain 0.004；两者经 lowpass 180 Hz |
| 继电器（启动「咔」） | square 110 Hz, 22 ms + filtered noise 25 ms |
| 裁刀 Tick（每跨过一个 segment） | triangle 1200 Hz, 14 ms, gain 0.035；向右 +35 Hz，向左 −35 Hz |
| GAIN 卡位（每转一档） | triangle 660 Hz 18 ms + triangle 1050 Hz 12 ms（延迟 8 ms） |
| IGNITE | sine 82 Hz 90 ms + filtered noise（bandpass 700 Hz）；噪声时长 = `120 + heatGain × 7` ms，上限 380 ms |
| Fidelity 损伤 | damage < 8：无声；8–15：一次继电器轻响；16+：两次短促 crackle。**不要报警器**（道德倾向太明显）。轻响/crackle 具体合成参数自定（D23） |
| Heat ≥ 90 | 设备自身轻微低频共振（不是奖励音效）。具体合成参数自定（D23） |
| 结局归零滑落音 | 结局 A–D 触发时播放一次：sine 指数滑落 220→55 Hz、300 ms、gain 0.02；结局 E 仅有原「咔」，不叠加（D22） |

除上表与 Hum 外，其余 UI 交互（RESET / NEXT INPUT / 设置 / 语言切换 / 复制）**全部静音**（D21）。进入任何 ENDING 即停止 Hum（D15）。

---

## 17. 设置、About、存储

### 17.1 Settings（仅五项，除此之外没有设置）

1. 语言 / Language：简体中文 / English
2. 声音 / Sound：开 / On、关 / Off
3. 音量 / Volume：0–100，默认 70
4. 动效 / Motion：跟随系统 / System、完整 / Full、减少 / Reduced
5. 重播教学 / Replay tutorial（可用时机见 D12）

面板内另含「关于 / About」项（D31），展开显示 §17.2 免责文本。

### 17.2 About（免责声明，逐字使用 CONTENT_SPEC.md §4.8，不得改写）

### 17.3 localStorage（白名单，仅 5 键）

```text
cf.locale  cf.sound  cf.volume  cf.motion  cf.tutorialSeen
```

**禁止**：progress、score history、user id、telemetry、analytics、device fingerprint 等任何其它键。

### 17.4 刷新

当前局**直接丢失**，不实现 Save（一局只有几分钟，保存无价值）。

---

## 18. 技术架构

### 18.1 技术栈冻结

HTML + CSS + TypeScript + Vite。**禁止** React / Vue / Svelte / Phaser / Pixi / Three.js。

### 18.2 依赖

生产环境 **0 第三方运行时依赖**。开发依赖仅允许：Vite、TypeScript、Vitest、Playwright、@axe-core/playwright、`ffmpeg-static`（D39 修订：仅文档资产生成 `capture:readme` 使用）。

### 18.3 渲染

一切用 HTML DOM + CSS + inline SVG；**不使用 Canvas**（可访问、易测试、易响应式、易快照）。

### 18.4 文件结构（固定）

```text
/
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ playwright.config.ts
├─ src/
│  ├─ main.ts
│  ├─ game/
│  │  ├─ types.ts  ├─ constants.ts  ├─ scoring.ts
│  │  ├─ state.ts  ├─ transitions.ts └─ cards.ts
│  ├─ i18n/
│  │  ├─ index.ts  ├─ zh-CN.ts  └─ en-US.ts
│  ├─ ui/
│  │  ├─ machine.ts ├─ gauges.ts  ├─ cutter.ts  ├─ gain.ts
│  │  ├─ observation.ts ├─ settings.ts └─ results.ts
│  ├─ audio/
│  │  └─ engine.ts
│  └─ styles/
│     ├─ tokens.css ├─ base.css ├─ machine.css
│     ├─ controls.css ├─ responsive.css └─ motion.css
├─ tests/
│  ├─ scoring.test.ts ├─ cards.test.ts ├─ localization.test.ts
│  ├─ state.test.ts   └─ transitions.test.ts
├─ e2e/
│  ├─ home.spec.ts ├─ tutorial.spec.ts ├─ desktop.spec.ts
│  ├─ mobile.spec.ts ├─ keyboard.spec.ts ├─ locale.spec.ts
│  ├─ endings.spec.ts ├─ audio.spec.ts ├─ reduced-motion.spec.ts
│  ├─ accessibility.spec.ts └─ offline.spec.ts
├─ AGENTS.md
├─ DESIGN_SPEC.md
├─ CONTENT_SPEC.md
├─ TEST_MATRIX.md
├─ PRESENTATION_SPEC.md
├─ README.md
├─ README.zh-CN.md
├─ LICENSE
├─ .github/
│  ├─ repository-metadata.json
│  └─ workflows/
├─ scripts/
│  └─ capture-readme-media.mjs
└─ docs/
   └─ media/
      ├─ readme/（gameplay.gif / machine-zh.png / machine-en.png）
      └─ social-preview.png
```

另：`tests/` 增加 `presentation.test.ts`（D42）。index.html 仅包含 title（D18）、favicon、viewport、`lang` 四项元信息；不加 meta description / OG 标签（D34、D41）。

### 18.5 状态机

状态集：`BOOT`、`HOME_OFF`、`BOOTING`、`TUTORIAL`、`ROUND_EDITING`、`ROUND_BURNING`、`ROUND_RESULT`、`ENDING`。

合法迁移：

| 从 | 到 | 条件 |
|---|---|---|
| BOOT | HOME_OFF | 页面加载完成 |
| HOME_OFF | BOOTING | 点击 POWER ON（此处创建/恢复 AudioContext） |
| BOOTING | TUTORIAL | 校准完成 && 无 `cf.tutorialSeen` |
| BOOTING | ROUND_EDITING | 校准完成 && 已有 `cf.tutorialSeen`；cycle = 1 |
| TUTORIAL | ROUND_EDITING | 教学内 IGNITE；cycle = 1；置 `cf.tutorialSeen` |
| HOME_OFF / ENDING | BOOTING | 设置中 Replay tutorial（D12），随后走 TUTORIAL 分支 |
| ROUND_EDITING | ROUND_BURNING | IGNITE 且选区含 CORE |
| ROUND_BURNING | ROUND_RESULT | 950 ms 反馈动画完成，数值已结算 |
| ROUND_RESULT | ROUND_EDITING | NEXT INPUT（cycle+1）；仅当无终局条件 |
| ROUND_RESULT | ENDING | A：heat≤0；B：fidelity≤0；C/D：Cycle 12 完成（§13 优先级） |
| ROUND_EDITING | ENDING | E：拔插头（仅 cycle ≥ 9） |
| ROUND_RESULT | ENDING | E：拔插头（仅 cycle ≥ 9） |
| ENDING | HOME_OFF | 结果页「重新运行」 |

**非法 Transition**（上表之外的任何迁移，如 `HOME_OFF → ROUND_RESULT`）必须 **throw**：开发模式 console error；测试中直接 FAIL。

### 18.6 GameState（唯一事实源）

```ts
phase         // 状态机当前状态
cycle         // 1–12
act           // 1–3
heat          // 0–100
fidelity      // 0–100
agitation     // 0–100（隐藏）
polarization  // 0–100（隐藏）
reduction     // 0–100（隐藏）
cutLeft       // 选区左边界（segment index）
cutRight      // 选区右边界（segment index）
gain          // 0–3（受解锁时刻表约束）
peakHeat      // D10
totalCutRatio // 每轮 (1−ratio) 累积器（D4）
highestGain   // 本局最高使用档位
ending        // 'A'..'E' | null
```

**UI 不得自己计算任何分数**——所有模块从 GameState 读数。

### 18.7 内容类型

```ts
// 每卡每段
interface Segment { id: "s0"; role: Role; zh: string; en: string }
interface Card {
  id: "C01";
  segments: Segment[];        // 5–8（D1）
  coreSegmentId: string;      // 恰一个 CORE
  gain: { 1: GainText; 2: GainText; 3: GainText };  // GAIN 1–3 双语文案
}
```

### 18.8 禁止运行时 NLP

禁止关键词判断、regex 判断语义、sentiment model、embedding、API、LLM。**所有语义关系设计时已写死在卡牌数据中**。

### 18.9 网络与体积

- 生产代码不得出现 `fetch` / `XMLHttpRequest` / `WebSocket` / `EventSource`（未来若需统计也禁止在本版本加）。
- 生产资源 gzip 总计 **≤ 250 KB**（不含 favicon）。
- 性能：中档手机页面 idle CPU ~0。
- CI 浏览器矩阵：功能 e2e 三引擎（Chromium / Firefox / WebKit 桌面）；移动仿真 Chromium + WebKit；视觉基线仅 Chromium；axe 全引擎（D19）。
- 发布：GitHub Pages；先私有仓库、用户手动转公开；Vite `base: './'`；deploy 工作流 `workflow_dispatch` 手动触发（D20）。

---

## 19. 无障碍（WCAG 2.2 AA 目标）

- axe 扫描不允许 critical / serious violations。
- 特别检查：focus visible、label、color contrast、dragging alternative（§6.3）、target size（§6.4、§7.1）。
- 仪表 `role="meter"` + 完整 aria 属性（§5）。
- 观察窗 `aria-hidden="true"`（§10.5）。
- Reduced Motion 全覆盖（§2.3、§10、§16）。

---

## 附：原文溯源表（本文档 → 原规格 v2.0 节号）

| 本文档 | 原规格 |
|---|---|
| §0 | SPEC_CODING_PLAN.md G1 + P0 裁决 |
| §1 | §1–5、§28、§143、竞品表 §3 |
| §2 | §6–9 |
| §3 | §10–12 |
| §4 | §13、§91–92 |
| §5 | §14–15 |
| §6 | §16–19 |
| §7 | §20–28、§93 |
| §8 | §29–31 |
| §9 | §32–42 |
| §10 | §43–48 |
| §11 | §72–73 |
| §12 | §74（经 D5 归一） |
| §13 | §75–82 |
| §14 | §83–85 |
| §15 | §86–90、§68–70 |
| §16 | §94–102、§8、§130 |
| §17 | §103–106 |
| §18 | §107–116、§133–135 |
| §19 | §127–129 |
