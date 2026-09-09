# AI 插画深度调研 — GitHub 开源生态与实现构想（无约束探索稿）

> **委托（所有者，2026-09-09）**：「你再深入调研插画部分，最好能够结合 AI 绘图
> 能力去实现，先调研 GitHub 上有关的或者类似的开源仓库，研究仔细后再去思考
> 如何实现，抛开项目的所有约束限制去尽情发挥想象力！」
>
> **性质**：研究 + 构想文档。按委托**抛开现行规格约束**撰写；它不是契约、不是
> 实现批次、不构成对任何冻结文档的修订。文中任何构想的落地仍需所有者裁决并
> 走规格/契约修订通道（§5 一句话边界）。撰写过程未改动 `src/` 与任何测试。
> 检索通道：`gh`（已认证）GitHub Search API + 关键仓库 README 直读；
> 内置 WebSearch 配额至 2026-10-03 仍未恢复，全部来源可复核。

---

## 1. GitHub 开源仓库调研

### 1.1 生成引擎与工作台（AI 绘图的「厨房」）

| 仓库 | ★ | 对本调研的意义 |
|---|---|---|
| [AUTOMATIC1111/stable-diffusion-webui](https://github.com/AUTOMATIC1111/stable-diffusion-webui) | 164.9k | 事实标准的本地 SD 界面；`--api` 模式可脚本化 |
| [Comfy-Org/ComfyUI](https://github.com/Comfy-Org/ComfyUI) | 132.2k | **节点图工作流引擎，本调研的首选**：工作流可存为 JSON 固化（模型/seed/采样器/ControlNet 全参数化）、可经 API 无头执行——「可复现的生成配方」正是资产管线需要的形态 |
| [invoke-ai/InvokeAI](https://github.com/invoke-ai/InvokeAI) | 28.2k | 面向专业艺术家的画布式引擎，canvas/layer 概念适合精修 |
| [lllyasviel/stable-diffusion-webui-forge](https://github.com/lllyasviel/stable-diffusion-webui-forge) | 13.0k | 优化分支，长上下文/显存友好 |

### 1.2 风格与质量控制（「画什么风格、像不像」）

| 仓库 | ★ | 要点 |
|---|---|---|
| [lllyasviel/ControlNet](https://github.com/lllyasviel/ControlNet) | 34.1k | 用参考图控制生成结构：`lineart` / `softedge` 预处理器可把「先手绘线稿→AI 按线稿上墨」变成稳定流程——风格一致性的核心工具 |
| [Mikubill/sd-webui-controlnet](https://github.com/Mikubill/sd-webui-controlnet) | 17.8k | WebUI 集成版 |
| [Fannovel16/comfyui_controlnet_aux](https://github.com/Fannovel16/comfyui_controlnet_aux) | 4.2k | ComfyUI 侧预处理器节点（lineart 提取等） |
| [xinntao/Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN) | 36.7k | 通用超分/修复：AI 出图 → 放大去噪 → 再矢量化，显著改善矢量化的边缘质量 |
| kohya-ss/sd-scripts 生态（sd-webui-forge / ComfyUI-TrainTools-MZ 等 GUI 封装） | — | **风格 LoRA**：用 20–50 张目标风格图微调，让「本项目版画风」成为可复用模型而非每次碰运气的 prompt |

### 1.3 光栅 → 矢量（本项目的**关键桥梁**，README 已深读）

| 仓库 | ★ | 要点 |
|---|---|---|
| [visioncortex/vtracer](https://github.com/visioncortex/vtracer) | 6.9k | 彩色位图→SVG。关键参数（README 逐字核对）：`--clustering color-cluster/bw/watershed`、`--hierarchical stacked/cutout`、`-m pixel/polygon/spline`、`-f --filter-speckle`（去斑点）、`-p --color-precision`、`--palette/--palette-file/--max-colors`（**固定 OKLab 最近色板**）、`--preset bw/poster/photo`、`--simplify <TOLERANCE>`（README 原文：曲线重拟合通常**体积减半**）、`--optimize 0-2`。提供 **Rust CLI / Python / Node-WASM** 三形态——最后者意味着矢量化可以直接写进 Node 资产脚本，零原生依赖 |
| [tomayac/SVGcode](https://github.com/tomayac/SVGcode) | 1.1k | Potrace-WASM 的彩色位图→SVG PWA（svgco.de），自动过 svgo。注意 **GPLv2**（Potrace 传染）——只借鉴思路，不引代码 |
| [btk/vectorizer](https://github.com/btk/vectorizer) | 0.4k | Potrace 多色分层矢量化参考实现 |

### 1.4 浏览器端推理（「运行时 AI」的现实检查）

| 仓库 | ★ | 要点（README 深读） |
|---|---|---|
| [mlc-ai/web-stable-diffusion](https://github.com/mlc-ai/web-stable-diffusion) | 3.7k | SD1.5 完全在浏览器跑（TVM→WebGPU）。**硬数据**：需 8GB 显存级 GPU、仅 FP32、Chrome 因 robustness 检查慢约 3 倍（需 Canary 特殊 flag 才追平原生）——对「小而美」的网页作品目前不成立 |
| [huggingface/transformers.js](https://github.com/huggingface/transformers.js) | 16.3k | 浏览器端 Transformers（含小型扩散模型支持），onnxruntime-web/WebGPU |
| [cochranblock/pixel-forge](https://github.com/cochranblock/pixel-forge) | 10 | **微扩散路线存在性证明**：1M–17M 参数的三档像素精灵扩散模型，纯 Rust（Metal/CUDA）——「小到可以塞进客户端的扩散模型」是真实研究方向 |

### 1.5 AI 直接生成矢量（前沿观察哨）

| 仓库 | ★ | 要点（README 深读） |
|---|---|---|
| [kingnobro/Chat2SVG](https://github.com/kingnobro/Chat2SVG)（CVPR 2025） | 0.25k | 三段式：① LLM 生成 SVG 模板（ImageReward/CLIP 择优 + VLM 纠错）→ ② SDXL+tile ControlNet 生成目标光栅、SAM 分割补形 → ③ diffvg 可微渲染优化路径。GPU <4GB。意义：**「AI 直接产出可编辑矢量」**从研究走向工程，但目前依赖商用 LLM API + 重管线，离「网页小游戏资产」还差一个世代 |

### 1.6 生成式艺术与游戏资产管线（灵感与邻近实践）

| 仓库 | ★ | 用途 |
|---|---|---|
| [williamngan/pts](https://github.com/williamngan/pts) | 5.3k | 可视化/创作编码库——P1「程序化生成层」的参考 |
| [inconvergent/weird](https://github.com/inconvergent/weird) | 1.6k | 生成式艺术（Common Lisp），算法美学金矿 |
| [javierbyte/pintr](https://github.com/javierbyte/pintr) | 0.8k | 照片→**单线插画**：构型与观察窗「众生相」的点子来源 |
| [mattwilliamson/comfyui-ai-gamedev](https://github.com/mattwilliamson/comfyui-ai-gamedev) | 29 | ComfyUI 的游戏资产节点集（含 Hunyuan3D） |
| [acatovic/ai-game-studio](https://github.com/acatovic/ai-game-studio) | 73 | 2D spritesheet 的 AI 生成实践 |
| [svg/svgo](https://github.com/svg/svgo) | 22.7k | SVG 优化器：矢量化后的最后一道体积压缩 |

### 1.7 同类开源游戏仓库（先行者们怎么做美术与传播）

> 2026-09-09 补充委托：「不仅是 AI 绘图的仓库，更需要类似我这种游戏的开源仓库」。
> 检索 + 仓库结构直读（`gh api repos/.../contents`），按相关度分三层。

**Tier A — 同域同体量：新闻/信息反馈循环的「可玩小册子」（Nicky Case 体裁）**

| 仓库 | ★ | 直读发现 |
|---|---|---|
| [ncase/wbwwb](https://github.com/ncase/wbwwb)（We Become What We Behold） | 1.5k | **本作 DESIGN_SPEC §1.5 的头号参照，开源（代码+美术 CC0）**。技术栈 PIXI.js（canvas 渲染）+ Howler.js；仓库结构实读：`sprites/` 分类资产目录（`peeps/` 表情角色、`chyron*.png` 新闻字幕条、`cam/`、`tv.png`、`laptop.png` 358KB、`snow.png` 767KB）——**光栅 PNG、数百 KB/张、总量 MB 级**；`js/textStrings.js` 单文件 31KB 集中全部游戏文案（与 CONTENT_SPEC「文案单源」同构）；README 明示欢迎 remix 与课堂使用，翻译走 Issues 认领。可学点：①插画角色（peeps 表情）是这类游戏的传播引擎——被截图的是「表情反应」；②同体量作品的美术预算实际相当宽裕（对比本作 30KB gzip——那是矢量美学的选择，不是体裁必然）；③ CC0+remix 授权本身是传播放大器 |
| [ncase/polygons](https://github.com/ncase/polygons)（Parable of the Polygons） | 1.4k | 「无害的选择如何造成有害的世界」——主题近亲（涌现偏见），可玩博客帖子形态；多语言翻译仓从中分叉（polygons-es/de/fr/nl…） |
| [ncase/trust](https://github.com/ncase/trust) | 6.3k | 合作博弈论互动指南——「explorable explanations」体裁的代表作；角色化插画 + 单一机制 + 5 分钟 + 可嵌入博客传播的标准配方 |
| ncase/crowds ★448 / ncase/anxiety ★496 / ncase/joy ★572 / ncase/loopy ★1.7k / ncase/nothing-to-hide ★786 | — | 同体裁全家桶：社会心理主题 × 插画 × 微机制的持续实践；nothing-to-hide 证明开源+反监控主题可共存 |

**Tier B — 极简文本浏览器经典（氛围与长尾）**

| 仓库 | ★ | 直读发现 |
|---|---|---|
| [doublespeakgames/adarkroom](https://github.com/doublespeakgames/adarkroom) | 8.3k | 极简文本冒险的顶点。README 实读：23 种语言经 `?lang=` 参数切换；浏览器小游戏 → iOS/Android/Steam 的多平台长尾（「完成后的留存」来自新平台而非重玩机制）；氛围 = 极低信息密度 + 渐进揭示（opening：「awake. head throbbing…」）——**极简 ≠ 单调的实证** |
| [candybox2/candybox2.github.io](https://github.com/candybox2/candybox2.github.io) + candybox | 611/244 | ASCII 美术 + 悬念式解锁：纯字符界面的「插画感」来自排版节奏与惊喜 |
| [swarmsim/swarm](https://github.com/swarmsim/swarm) | 525 | 纯文本增量模拟（Universal Paperclips 同族）——数字与名词即可承载百小时留存 |

**Tier C — 社交传播机制与同域研究工具**

| 仓库 | ★ | 直读发现 |
|---|---|---|
| [antfu/handle](https://github.com/antfu/handle)（汉字 Wordle） | 1.4k | Wordle 家族的开源样本。**分享格子**（纯文本 emoji 网格）是「社交讨论张力」的最强单点设计：零图片、零隐私、可无限转发的社交货币——本作「烧制印章」（§3 构想 5）的直系祖先。注：原 cwackerfuss/react-wordle 已 404（商标压力下架——衍生作品命名需避商标坑） |
| [TheMisinformationGame/MisinformationGame](https://github.com/TheMisinformationGame/MisinformationGame) | 33 | 研究级社交媒体 Feed 模拟器（*Behavior Research Methods* 2023 配套，CC BY 4.0）：帖子/来源/互动指标全部由电子表格配置，含动态可信度分数与完整行为日志——**主题同域（错误信息）的工程范本**，「可配置信息流」的架构思路值得借鉴 |

**五维回连（对照 M5 调研 §2）**

- 第一次理解：wbwwb 全程一个按钮（比本作两个操作还少）；peeps 插画让事件「一眼可读」——**插画承担了解释功能的极大部分**。
- 社交张力：被截图传播的是 chyron 字幕条 + peeps 表情；Wordle 证明分享物甚至不必是图片。
- 有趣：A Dark Room / Candy Box 证明文本极简的「留白感」本身即魅力，靠渐进揭示而非美术密度。
- 重玩：上述作品几乎都不做重玩设计——**短篇单义作品靠传播获得长尾，留存来自新玩家而非老玩家**（与 M5 §2.1 结论互证）。
- 长期留存：adarkroom 的答案在游戏之外——多平台再发行。

**对 §2–§4 插画路线的直接修正**

1. wbwwb 把「角色是传播引擎」摆在眼前，但本作现行 §1.4 禁人物；中间道路是
   **机器本体角色化**（设备的「表情」= 仪表/火/观察窗的状态组合，本作已有）
   与 §3 构想 2 的「观察窗众生相」——不画人，画「被加工的个体痕迹」。
2. 资产体积的真相（Tier A 实读）：同体量作品的光栅资产是数百 KB～MB 级；
   本作 250KB gzip 预算是矢量美学的自主选择。走 AI 版画路线（P0）时，
   预算决策是第一决策（§4 估算 +40–80KB 仍然成立且宽裕）。
3. 文案单源（textStrings.js ≙ CONTENT_SPEC）是这类作品的行业共识。
4. 若追求传播：CC0/开放授权 + 明示 remix 许可是 Nicky Case 系作品的放大器
   （对本作还涉及 PRESENTATION_SPEC 冻结面——仅记录为观察，不做建议）。

---

## 2. 能力 × 本作语汇的匹配分析

### 2.1 风格锁定：AI 该学什么画风

本作视觉基因是「国营老式测试仪器 + 纸带 + 烤漆 + 暗玻璃」的**档案感**。与 AI
绘图生态交叉，最契合的三个风格族恰好都是**强轮廓、有限色、可完美矢量化**的：

1. **木刻/铜版版画（woodcut / engraving）**——旧报纸插图的质感，与「新闻原料
   纸带」天然同构；vtracer `--preset poster` + 固定色板的最佳输入。
2. **技术图解（technical diagram / blueprint / exploded view）**——说明书美学，
   与设备铭牌、教学页同构；ControlNet lineart 的最佳场景（手绘线稿→AI 上墨）。
3. **Riso 双色套印**——有限色 + 错位叠印，与既有暖中性/余烬色板严丝合缝。

### 2.2 三个关键洞察（整份调研的地基）

- **洞察一：生成时约束 ≠ 运行时约束。** 「AI 绘图」完全可以发生在**资产作者
  侧**（离线、一次性、人工精选），入库的是普通静态 SVG——运行时依旧零依赖、
  零网络、零模型。AI 是画笔，不是引擎。这把「AI 绘图」与「运行时 AI 禁令」
  从冲突关系变成了平行关系。
- **洞察二：固定色板是风格一致性的最强单一工具。** vtracer 的
  `--palette-file` 把任何生成图强制收编进项目色板（OKLab 最近色）；配合风格
  LoRA，多张资产的色彩体系不会漂移。
- **洞察三：确定性免费获得。** ComfyUI 工作流 JSON（含 seed）可存档可复现；
  最终资产是静态文件，进入基线体系后与手绘资产无区别。

---

## 3. 想象力全开：十个构想

（按委托抛开一切约束；每条标注 AI 的角色、矢量化路径、回连 M5 调研的竞品
证据锚点。编号不代表优先级。）

1. **「十二张纸带的木刻插画」**——每条新闻原料配一幅版画小图（AI 生成 →
   vtracer 14 色 SVG → 手工微调 ≤ 30 分钟/张）。旧报纸的「文字+木刻」版式
   直接提升「第一次是否理解」：画面先于文字建立场景。锚点：城市天际线社区
   教训——不可见的系统靠社区补课；可见的画面让初见零门槛。
2. **「观察窗众生相」**——18 个几何 glyph 升级为 18 张**单线肖像**（pintr 式
   抽象个体照，AI 批量生成）。Reduction 发生时「个体照」逐档退化为标签图形
   ——把隐藏状态从隐喻变成**可截图的名场面**。锚点：猛兽派对「游戏的最高
   配置就是朋友」——值得传播的是状态的可视后果。
3. **「五张结局大幅版画」**——现有 IL-4 意象层升级为整幅铜版蚀刻：A 熄炉残
   烬 / B 信号噪点的版画化 / C 稳态工程图 / D 过载辉光 / E 拔掉的插头。
   锚点：结局页是玩家自截图传播的主要画面（M5 §2.1「名场面可截图性」）。
4. **「双语义双画（Semantic Twin 的视觉对应）」**——同一条原料：zh 配木刻、
   en 配铜版蚀刻。翻译不只是换字，是换**排版传统**——把「两种语言各自像
   母语写成」的设计原则推到插画层。这是全清单里最「作品」的一条。
5. **「烧制印章」**——通关结算页生成一枚个人化火漆印章 SVG（seed = 本局
   决策序列哈希：切了多少、烧到多热、是否拔插头）。纯程序化（P1）或
   AI 生成纹样库 + 程序化组合。锚点：城市天际线「我的城市」截图是社交
   货币——个人化产物天然可传播。
6. **「机器的解剖图」**——设置/About 加一页 exploded-view 设备剖面图（AI
   生成技术图解 → 矢量化 → 交互式 hover 高亮部件）。世界观不解释、但
   「允许被凝视」——设备的物质性加深在场感。
7. **「台面的使用痕迹」**——工位级环境叙事微粒：咖啡渍、铅笔批注、
   校准贴纸（AI 生成素材库，程序化摆放）。锚点：二周目才发现的细节
   （重玩维度的视觉上限）。
8. **「教学页 = 1950s 安装手册」**——五步教学改造成旧安装说明书版式：
   AI 生成步骤图解（lineart ControlNet：手绘示意→AI 上墨），配既有冻结
   文案（文字不动，图说话）。
9. **「渐老的纸」**——纸带纹理随 Act 递进老化（折痕、焦边、油渍渐增），
   素材由 AI 生成四档、程序化切换。机器对纸带做的事，纸带记得。
10. **「机器的梦」（狂想档）**——结局页用 **1M–17M 参数微扩散模型**
    （pixel-forge 路线 + transformers.js/WebGPU）在本机、离线、一次性生成
    一幅 512px「机器梦到的画面」。今天不可行（显存/启动时间/体积差几个
    数量级），但它是这条技术曲线的终点站：**生成式 AI 作为结局的私语，
    而不是运行时的引擎**。

---

## 4. 实现路径（从可落地到狂想，三级）

### P0 — 离线 AI 资产管线（推荐；全部工具今天就是开源现成品）

> **2026-09-09 更新（所有者不希望使用 ComfyUI）**：生成端有三条不经 ComfyUI
> 的路线（云端 CogView 系 API / **LLM 直写 SVG——已实测，548B gzip 全合规**/
> 本地 diffusers 脚本），下图的 ComfyUI 槽位可任选其一替换；详见
> `research/ai-pipeline/README.md` 三路线对照表。

```text
[手绘线稿/构图草图（可选，人出构图）]
  → 生成端（三选一，均可替换）：ComfyUI 无头 API（工作流 JSON 固化：
    SDXL/SD1.5 + ControlNet lineart/softedge + 固定 seed + 风格 LoRA）
    ｜ 智谱 CogView 系等云端文生图 API（PNG，按张计费）
    ｜ GLM-5.3 系 LLM 直写 SVG（原生矢量，flash 档即可；平涂小插画首选）
  → Real-ESRGAN 放大修复（4×，改善矢量化边缘；仅光栅输入需要）
  → vtracer（Node-WASM 一键脚本：--preset poster
    --palette-file 项目色板 --simplify 1.5 --optimize 2）
  → svgo（最后一道体积压缩）
  → 人工精选 + 手工微调（AI 出 8 张选 1 张；画笔级修整 30 分钟）
  → 静态 inline SVG 入库（与手绘资产完全同权）
```

- 工程形态：`scripts/ai-asset-pipeline.mjs`（ComfyUI API + vtracer-wasm +
  svgo，全 Node，无原生依赖）；生成配方（工作流 JSON + seed + prompt）与
  素材原图一并入库留档，**可复现、可审计**。
- 体量估算：版画类矢量化后单资产约 3–8 KB；构想 1+3+6+7 全做约
  +40–80 KB——超过现行 250 KB 预算的一半余量，需要预算决策（或砍数量）。
- 质量闸门：色板合规（≤14 色，vtracer 产物可脚本校验）、axe 对比度、
  基线重采走既有 PENDING-HUMAN-REVIEW 纪律。

### P1 — 程序化生成层（零模型零网络的「无 AI 生成感」）

- seeded 确定性程序化 SVG（pts/weird 的算法美学）：构想 5 烧制印章、
  构想 9 渐老的纸、灰烬/噪点密度层。与 P0 组合时，P0 出「素材库」、
  P1 做「确定性编排」。

### P2 — 浏览器端微扩散（狂想档，明确标注「今天不成立」）

- 现实检查（README 实证）：web-stable-diffusion 需 8GB 级 GPU、FP32、
  Chrome 慢 3×；本作 gzip 总预算 30 KB——差距 4–5 个数量级。
- 成立条件（2–3 年硬件周期 + 模型小型化）：pixel-forge 式 1M–17M 微模型、
  int4/WebGPU 成熟、按需下载（结局页才开始拉模型，且需放开「零网络」）。
- Chat2SVG 作为「AI 直接画矢量」的观察哨：等它的管线脱离商用 LLM API
  与 4GB GPU 依赖，P0 的「矢量化」环节可以整体退役。

### 三级对照表

| | P0 离线资产管线 | P1 程序化层 | P2 浏览器微扩散 |
|---|---|---|---|
| 今天的可行性 | ★★★★★ 全现成工具 | ★★★★★ 无新依赖 | ☆ 今天不可行 |
| 运行时影响 | 零（静态 SVG） | 零（纯代码） | 网络+显存+体积全面冲击 |
| 确定性 | 资产静态=确定 | seeded=确定 | 需固定 seed+本地模型 |
| 「AI 感」控制 | 人工精选+色板收编 | 无 AI | 最难控制 |
| 需要的决策 | 资产预算+AI 资产价值观 | 仅资产预算 | 规格全面修订 |

---

## 5. 与现行规格的关系（一句话边界）

本文档按委托抛开约束撰写；若所有者决定采纳任何构想，落地路径是：
无文本的插画走 DESIGN_SPEC §15 / UI_CONTRACT 契约通道 + bundle 预算修订
+ 基线协议；带文本或新交互面的构想另需 CONTENT_SPEC / TEST_MATRIX 修订。
「是否接受 AI 参与资产创作」本身是所有者的价值观决定，不属于工程判断。

## 6. PoC 清单与实测结果（2026-09-09 已执行，`research/ai-pipeline/`）

原清单五项中 1/3/4/5 已完成（2 的「AI 生成」槽位以公有领域版画代替——生成端
可替换为 ComfyUI，管线本身已全真）：

- ✅ **管线骨架**：`research/ai-pipeline/pipeline.mjs` + `scale-test.mjs`
  （vtracer-WASM + svgo + sharp；依赖隔离在 research/ 子包，根 package.json
  依赖白名单零污染）。
- ✅ **色板收编验证**：17 色板变体 12 个填充色**全部合规**（越板 0）；
  无色板对照组全部漂移为冷灰——`palette` 参数的价值实证。
- ✅ **体积曲线**（gzip）：局部 120w=3.5KB / 局部 200w=10KB / 整幅 200w=11.8KB /
  整幅 320w=33KB / 整幅 480w=94KB / 整幅 760w=268KB。
  → 12 张卡面小插画 ≈ 42KB（从容）；结局大幅按 320w 单张 33KB。
- ✅ **端到端计时**：脚本级秒级往返（矢量化+压缩 <10s/张，不含生成端）。
- 🆕 **风格修正实证**：老化纸色误映射到 fidelity 绿（OKLab 最近色）→ 换美术
  专用暖色板后绿色清零、体积零代价、旧纸炭色版画感成立——**「给每个资产族
  准备专用子色板」比全局色板更可控**（推论已并入 P0 设计）。
- 🆕 **视觉走查**：密排整幅（最坏 stress test）5.5/10（暗部人物被吞，
  需生成端出平涂或 480w）；局部小插画保真良好。详细数据见
  `research/ai-pipeline/README.md` 与 `output/*-report.json`。

### 待所有者决策的三个数字

> 2026-09-09 更新：所有者已授权路线 B（LLM 直写 SVG）为生成方式；候选库
> 已批量产出并通过全部闸门（6 件、零越板、整套 3.1KB gzip、走查 8/10，
> 见 `research/ai-pipeline/llm-svg-batch/`）。**体积在该路线下不再是决策
> 变量**——下列第 2 项的预算顾虑解除，剩余决策为审美/集成取舍。

1. 卡面插画档位：120w（3.5KB/张×12=42KB）还是 200w（11.8KB/张×12=141KB）？
2. 结局大幅：做（320w×N 张，需预算上探）还是维持现 IL-4 抽象层？
3. 美术子色板（暖/余烬族）是否采纳为资产默认色板？
