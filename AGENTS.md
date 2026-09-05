# AGENTS.md

This repository implements a frozen interactive game specification.

You are an implementation agent, not a game designer, product manager,
writer, translator, or balancing designer.

Implement the specification exactly.
Do not reinterpret product intent.
Do not add features.
Do not rewrite content.

---

## 1. 权威文档与优先级

| 文档 | 职责 |
|---|---|
| `DESIGN_SPEC.md` | 规则、数值、行为、视觉、音频、技术架构；**§0 裁决记录（D1–D42）与规格正文同等冻结** |
| `CONTENT_SPEC.md` | 全部玩家可见文本（12 张卡、界面文案、术语表）；`language_qa_status` |
| `TEST_MATRIX.md` | 全部测试、黄金路径精确断言、verify 管线 |
| `PRESENTATION_SPEC.md` | 全部公开呈现面文本（README、仓库元数据、媒体规格、展示测试） |
| `AGENTS.md` | 本文件：Agent 行为约束 |

文档之间冲突、或文档与实现现实无法同时满足时：**你不要做决定**，走 §3 的 SPEC BLOCKER 协议。

历史版本（v1.0 / v1.1 / 原始规格文稿、对话记录）一律不是依据。

## 2. 明确禁止

执行 Agent 不得：

- 「优化」游戏玩法
- 修改公式；调整数值
- 新增 / 删除 Card；改 Card 顺序
- 重写中文；重新翻译英语；替换术语表同义词
- 新增音频；加 BGM
- 加动画（规格未定义的）；加升级；加排行榜；加登录；加分享图片
- 加后端；加分析统计；加 AI / LLM / 运行时 NLP
- 加新的设置项；加隐藏彩蛋；自己创造新结局
- 把 Vanilla 改成 React / Vue / Svelte / Phaser / Pixi / Three.js
- 把 SVG 改成 Canvas
- 为了「架构优雅」增加状态管理库或任何运行时依赖
- 引入网络请求（fetch / XMLHttpRequest / WebSocket / EventSource）
- 添加 TODO / FIXME / TEMP / PLACEHOLDER / MOCK / STUB / COMING SOON 标记
- 自行 update 视觉回归快照（diff = 回归，修代码不修基线）
- 在 localStorage 白名单（`cf.locale` / `cf.sound` / `cf.volume` / `cf.motion` / `cf.tutorialSeen`）之外读写任何键

**唯一豁免（DESIGN_SPEC D23）**：音效表中标注「参数自定（D23）」的两项——保真损伤的继电器轻响/crackle、heat≥90 低频共振——其具体合成参数（频率/时长/包络/增益）可由实现者自行决定。这是全项目**唯一**授权的自由发挥点；除此之外，任何调参、加音、加动效、改文案仍属禁止。

## 3. SPEC BLOCKER 协议

如果规格确实出现无法同时满足的要求，停止实现并输出：

```text
SPEC BLOCKER

Conflicting requirements:
...

Why they conflict:
...

Minimum options:
A.
B.
```

等待人工批准后再继续。**不做任何单方面决定。**

（注意区分：DESIGN_SPEC §0 裁决记录里已经裁决过的问题（D1–D12）不是 blocker，按裁决执行。）

## 4. 工作流要求

- 完成任何工作前运行 `npm run verify`；全绿才算完成。
- 所有玩家可见文本逐字取自 CONTENT_SPEC.md，包括标点。
- 数值实现逐行对照 DESIGN_SPEC §9；魔数旁以注释标注出处（如 `/* §9.3 NEG=18 */`）。
- UI 不计算任何分数：一切数值来自 GameState（DESIGN_SPEC §18.6）。
- 每次提交前自检 §2 禁止清单。
- **测试冻结开关（DESIGN_SPEC D29）属授权的测试基础设施**：`?freeze=1` 等参数仅测试构建/测试用例启用，生产默认不可用；它不是游戏功能，不得扩展为其它"开关"。
- **无人值守基线规则（D27/D28）**：视觉基线由你自采（本地与 CI 双套），全部标记 `PENDING-HUMAN-REVIEW`；自采 ≠ 已确认，不得在日志或提交信息中声称"UI 已确认"。此后不得自行 update snapshots。

## 5. Repository Presentation Freeze（公开呈现面冻结）

`PUBLIC PRESENTATION IS FROZEN.`

```text
PUBLIC PRESENTATION IS FROZEN.

README files, repository metadata, screenshots, GIF captions,
package descriptions, page metadata, and social-preview copy are
product surfaces, not documentation scratch space.

Do not explain, name, interpret, or reveal the game's thematic subtext.

Do not describe the project as satire, commentary, media criticism,
misinformation education, journalism criticism, propaganda criticism,
or any equivalent concept.

Describe only:
- what the player operates,
- the visible game mechanics,
- supported languages,
- technical implementation,
- local setup,
- testing,
- accessibility,
- deployment.

All public-facing copy defined by this specification is verbatim.
Do not rewrite it for style, SEO, discoverability, clarity, humor,
marketing, or completeness.

If a public-facing field is not specified, leave it empty and report
SPEC BLOCKER rather than inventing copy.
```

全部公开面文本的唯一来源是 `PRESENTATION_SPEC.md`（README 逐字开头、仓库 description、Topics、媒体规格、展示测试）。`npm run verify` 包含 presentation 项，游戏本体与 GitHub 门面同时受保护。
