# UI_CONTRACT v4.5 · M4 批次设计草案 — 液态玻璃语汇（Liquid Glass Vocabulary）

> **批复与交付（2026-09-08）**：所有者批复 K3「M4 同批实现」，四项 + 跨引擎
> 方案 B 全部采纳，已随 UI_CONTRACT v4.8 交付（令牌/recipe/断言见正文 v4.8 节；
> 本文件保留为调研与决策依据，方案 A 像素基线与备选 A-2 颜色插值维持未启用）。

> **本文件为草案（design draft）。** 仅含调研结论与设计提案，不含任何实现。
> 本 agent 未改动任何现有代码、未运行测试套件、未 commit、未 push。
> 实现由后续批次执行；落地前须由所有者逐项批准，并把采纳项写回 `UI_CONTRACT.md`
> v4.x 正文（含 v4.3 令牌表用途栏的任何扩展）。未被批准的部分不得实施。
> 调研日期：2026-09-08。

---

## 0. 范围与前置约束

- M4 批次的四个既定条目（UI_CONTRACT v4.5）：
  1. 控件激活态边缘 specular 高光
  2. 按压液感（cap 高光位移）
  3. 旋钮卡位定位感（微过冲调参）
  4. 跨引擎基线固化
- 硬约束（AGENTS.md / UI_CONTRACT v4）：不新增运行时依赖、不引入网络请求、
  不改 SVG 为 Canvas、不做 JS 运行时渲染、不动几何断言（G1–G8）、不动冻结色
  （`--heat` / `--fidelity` / `--warning`）、不动文案与数值、全部新动效处于既有
  RM / freeze kill-switch 覆盖之下。因此本草案的语汇全部是 **CSS-only**：
  渐变、box-shadow、伪元素、custom property、既有 backdrop-filter 体系。
- 优先在伪元素与样式层内完成，不改 DOM 结构、不改 `src/ui/*.ts` 行为逻辑。

---

## 1. 调研来源表

| # | 来源 | URL | 贡献的参数 / 机制 |
|---|---|---|---|
| S1 | Apple HIG — Materials（2025-09-09 修订） | https://developer.apple.com/design/human-interface-guidelines/materials （JS 渲染，经官方 JSON 数据端点 `…/tutorials/data/design/human-interface-guidelines/materials.json` 抓取） | 内容层 vs 浮动功能层划分：「Liquid Glass forms a distinct functional layer for controls and navigation elements … floats above the content layer」「Don't use Liquid Glass in the content layer」；regular/clear 双变体定义；**亮内容上加 35% 不透明暗色减光层**（"consider adding a dark dimming layer of 35% opacity"，属 Glass/clear 指引）；厚材质保对比 / 薄材质保上下文；vibrancy 分级与 quaternary 禁用于薄材质 |
| S2 | WWDC25 Session 219 — Meet Liquid Glass | https://developer.apple.com/videos/play/wwdc2025/219/ | lensing 定义（"dynamically bends, shapes, and concentrates light in real time"，对比旧材质的散射）；放大形态 = 更厚材质（更深阴影、更强 lensing、更柔散射）；specular 高光响应几何与光位，**交互时高光在空间中移动、部分场景响应设备倾斜**；按压反馈（"instantly flexing and energizing with light"…"the glow spreads throughout the element"，自指尖扩散的内发光）；滚动内容从玻璃下经过时的自适应（阴影加重、tint 与动态范围偏移保按钮可读；深色内容经过时切换为 subtle dimming）；可及性退化：Reduce Transparency → 更磨砂、Increase Contrast → 黑白实色 + 对比描边、Reduce Motion → 弹性关闭；**禁止 glass 叠 glass**；tint 生成随底内容亮度映射的色阶 |
| S3 | WWDC25 Session 356 — Get to know the new design system | https://developer.apple.com/videos/play/wwdc2025/356/ | 浮动功能层定位（"floating above your content … without ever stealing focus"）；模态打断时 Liquid Glass 须搭配减光层；更深入介入时玻璃「recedes——更不透明、尺寸微增」；scroll edge effect 两种（soft 默认 / hard）且不可混用叠放；同心圆角（concentric）体系；自定义控件「把材质加在控件本身，而非其内部子视图」 |
| S4 | Apple 开发者文档 — Applying Liquid Glass to custom views | https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views （同经 JSON 端点抓取） | `glassEffect(_:in:)` 默认 `Glass.regular` + Capsule 形状；`.interactive()` 提供与系统玻璃按钮一致的实时反应；`GlassEffectContainer` 合并多块玻璃优化性能；效果数量要节制 |
| S5 | Apple 开发者文档 — Adopting Liquid Glass | https://developer.apple.com/documentation/TechnologyOverviews/adopting-liquid-glass （同经 JSON 端点） | 标准控件自动采用；滑杆 / 开关的**旋钮在交互期间变为 Liquid Glass**（"the knob transforms into Liquid Glass during interaction"）——本项目旋钮卡位「定位感」的语义来源；`UIDesignRequiresCompatibility` 旧外观回退开关的存在证明系统层面也承认材质需要整层降级路径 |
| S6 | Apple HIG — Buttons | https://developer.apple.com/design/human-interface-guidelines/buttons （同经 JSON 端点） | 「Always include a press state for a custom button」；彩色内容层上按钮标签宜用单色外观（见 Liquid Glass color） |
| S7 | Apple 开发者文档 — SwiftUI `Glass` | https://developer.apple.com/documentation/swiftui/glass （同经 JSON 端点） | `regular` / `clear` / `identity` 三态与 `interactive(_:)` / `tint(_:)` 的 API 语义（行为细节在 S1/S2/S4） |
| S8 | MDN — backdrop-filter | https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter | **Baseline 2024（2024-09 newly available）**；backdrop root 陷阱（祖先 `opacity<1` / `filter` / `mix-blend-mode` / `will-change` 会截断采样）；必须半透明底才可见。分版本通行记录：Chromium 76 起无前缀（2019-07），Firefox 103 起默认开启（2022-07，此前在 `layout.css.backdrop-filter.enabled` flag 后），Safari ≤17 需 `-webkit-backdrop-filter`（9/iOS 9 起有前缀实现），Safari 18 起无前缀——这正是 Baseline 定在 2024-09 的原因 |
| S9 | web.dev — backdrop-filter | https://web.dev/articles/backdrop-filter | 滤镜链组合建议（blur + saturate + brightness 链式）；性能警告（"backdrop-filter may harm performance. Test it before deploying"）；`@supports (backdrop-filter: none)` 回退策略；任何非 none 值会创建 stacking context |
| S10 | MDN — prefers-reduced-transparency | https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency | 定义与 OS 映射（Windows 透明效果 / macOS 与 iOS 的 Reduce Transparency）；状态为 **Experimental、非 Baseline（Limited availability）**——降级矩阵必须「自我声明」而非假设全网支持 |
| S11 | MDN — @property | https://developer.mozilla.org/en-US/docs/Web/CSS/@property | 注册带类型的 custom property 才能被插值动画（未注册 = 离散翻转）；**Baseline 2024-07**（Firefox 128 补齐；Chromium 85 起、Safari 16.4 起）。仓库已在 `--knob-rot` 上使用同机制 |
| S12 | MDN — conic-gradient() | https://developer.mozilla.org/en-US/docs/Web/CSS/gradient/conic-gradient | Baseline「Widely available，跨浏览器自 2020-11」（Firefox 83 补齐）；`repeating-conic-gradient()` 变体 |
| S13 | MDN — background-clip | https://developer.mozilla.org/en-US/docs/Web/CSS/background-clip | `padding-box` + `border-box` 双层背景 + 透明 border 的渐变描边手法（背景永远画在 border 之下，透明 border 才露得出 border-box 层）；Baseline widely available（2015-07 起）；新值 `border-area` 支持最弱，**不采用** |

**不可达来源备注**（均已换源，未编造参数）：
- HIG 的 Liquid Glass 独立页 slug 404（其内容已并入 Materials 页，即 S1）。
- `www.wwdcnotes.com` TLS 证书不匹配（cert 指向 github.io），改用 Apple 官方视频页直取 transcript。
- `nngroup.com`、`css-tricks.com` 分别被 403 / 反爬拦截，其内容改由 MDN 官方文档覆盖（S13 替代 css-tricks 的渐变边框文）。
- 内置 WebSearch 后端配额耗尽（至 2026-10-03），全部改用 WebFetch 直取权威 URL。

---

## 2. 调研结论 → 本项目语汇映射

### 2.1 变体裁决：只采用 regular 一支

S1：「Only use clear Liquid Glass for components that appear over visually rich
backgrounds」；S2 列出 clear 的三个前置条件（媒体富内容之上 / 不被减光层伤害 /
其上内容 bold and bright）。本项目**不存在任何照片 / 视频类媒体背景**——玻璃之下
只有台面渐变与机面板烤漆，因此 **clear 变体整体不适用，M4 只映射 regular 语义**。
regular 的「adaptive（任何底上保可读）」在本项目里的对应物就是既有体系：
语义令牌双值（`prefers-color-scheme`）+ Reduce Transparency 矩阵（tokens.css 文末）。

35% 减光规则（S1）核对本项目现状：dialog 的 `--scrim` 为 0.45（浅）/ 0.55（深），
**已高于 35% 指引值**，M4 无需改动；toast 走 regular 语义（叠色 α 0.78–0.82 自带
自适应），不触发该规则。此两项记为「已满足，不动」。

「thicker = legibility, thinner = context」（S1）在 M1 已落成三档映射
（`--mat-thick-bg` α0.94+blur26 = 厚 / `--glass-float-bg` α0.78–0.82 = 浮层 /
暗面玻璃 = 深色内容层），M4 **不改动该映射**，只在其上增加光学细节。

### 2.2 草案令牌（命名沿用 `--mat-*` / `--glass-*` / 按压族）

```css
:root {
  /* ── M4 液态玻璃语汇（草案；实现批次经批准后入册）──
     静态光位：光从正上方偏左来（与 --hi-light 的 inset 0 1px 顶部内高光、
     --stage-glow 顶部光晕同一光向约定）。S2 的设备倾斜响应在桌面浏览器
     无输入源，降级为静态光位（本节 2.5 详述）。 */
  --mat-spec-hi: rgba(255, 252, 240, 0.5);      /* 迎光边 specular（顶带，静置） */
  --mat-spec-hi-act: rgba(255, 252, 240, 0.9);  /* 激活态迎光边（:active 局部覆写用） */
  --mat-spec-lo: rgba(122, 106, 74, 0.28);      /* 背光边（底带，暖中性暗） */
  --glass-lens-out: rgba(84, 70, 44, 0.22);     /* 外缘 1px 暗环（lensing 近似的外侧弯光） */
  --glass-lens-rim: rgba(255, 252, 240, 0.18);  /* 内底棱线（lensing 近似的内侧聚光） */
  --press-glow: rgba(255, 252, 240, 0.4);       /* 按压 energize 内发光（S2 "illuminates from within"） */
  --cap-shift: 1px;                              /* cap 高光位移量（与按压 translateY 同向同量） */
}

@media (prefers-color-scheme: dark) {
  :root {
    --mat-spec-hi: rgba(255, 252, 240, 0.22);
    --mat-spec-hi-act: rgba(255, 252, 240, 0.4);
    --mat-spec-lo: rgba(0, 0, 0, 0.35);
    --glass-lens-out: rgba(0, 0, 0, 0.4);
    --glass-lens-rim: rgba(228, 222, 203, 0.08);
    --press-glow: rgba(255, 252, 240, 0.14);
  }
}
```

设计规则：**零新增裸 hex**。全部新颜色走 rgba() 令牌，hex 白名单
（material.test.ts 防硬化回归）不扩册。色相取自既有暖中性族
（`255,252,240` = `--hi-light` 同源；`122,106,74` = `--shadow-press` 同源），
不引入新色相，不触碰 §15.2 冻结色。

### 2.3 Recipe LG-1 · 激活态边缘 specular（conic 渐变描边）

**手法**（S13）：`padding-box` + `border-box` 双层背景 + 1px 透明 border，
把 conic 渐变只画在 border 圈层内。不用 mask（规避 `-webkit-mask` 前缀矩阵），
不用 `border-image`（不跟圆角），不用 `border-area`（支持最弱）。

```css
/* 草案示意 — .tool-btn（machine.css）；激活态 = :active（:hover 归 M2，见 §3） */
.tool-btn {
  border: 1px solid transparent;                 /* 原 1px var(--glass-float-edge) 改为透明 */
  background:
    linear-gradient(var(--glass-float-bg), var(--glass-float-bg)) padding-box,
    conic-gradient(
      var(--mat-spec-lo) 0deg 150deg,
      var(--mat-spec-hi) 170deg 190deg,          /* 顶部 ±20° 迎光带（静态光位） */
      var(--mat-spec-lo) 210deg 360deg
    ) border-box;
  /* backdrop-filter / 阴影 / 过渡均维持 M1 现状不动 */
}

.tool-btn:active {
  --mat-spec-hi: var(--mat-spec-hi-act);         /* 激活 = 局部令牌覆写，不新增声明树 */
}
```

- 静置时 `--mat-spec-hi` α=0.5 / `--mat-spec-lo` α=0.28，conic 描边呈现
  「上亮下暗」的静态高光；激活时顶带抬到 α=0.9（S2「energizing with light」
  的描边分量）。
- 覆写走 custom property 而非重写 conic：状态切换 = 一行令牌覆写，
  可静态断言（§5）。
- **不插值**：custom property 未注册 `<color>`，状态切换为离散跳变。
  这是刻意选择——注册 `@property --mat-spec-hi` 可获得颜色过渡（S11，
  Chromium 85+ / Safari 16.4+ / Firefox 128+），但会在引擎间产生
  「渐变 vs 跳变」的可视差异，直接威胁 M4 第 4 项（跨引擎基线）。
  插值版列为备选 A-2，须所有者批准并三引擎实测后才可启用。
- backdrop-filter 与双层背景无冲突：backdrop-filter 作用于元素**背后**的
  采样，不作用于元素自身 background 层（S8）。

### 2.4 Recipe LG-2 · 边缘 lensing 近似（双层 box-shadow 明暗棱）

S2 的真 lensing 是实时折射（内容在边缘被弯折位移）。CSS-only 能做的只有
**亮度梯度近似**：外缘一圈暗（光被弯走的减光带）+ 内底一道亮棱（聚光带）。
真位移需要 `feDisplacementMap` 或 WebGL —— 两者均被否决（§2.8）。

```css
/* 草案示意 — 浮动层四面的公共增量（toast / dialog / cycle-plate / tool-btn） */
box-shadow:
  0 0 0 1px var(--glass-lens-out),     /* 新增：外缘暗环 */
  var(--shadow-float),                 /* 既有投影不动 */
  inset 0 1px 0 var(--hi-light),       /* 既有顶部内高光不动 */
  inset 0 -1px 0 var(--glass-lens-rim); /* 新增：内底亮棱 */
```

- 既有 1px 实色 border 保留（结构线），lensing 棱线叠在其内外侧。
  LG-1 与 LG-2 可同面共存（tool-btn：conic 描边 + 内底棱；border 本身
  已透明化，外环由 `--glass-lens-out` 承担）。
- cycle-plate（999px 胶囊）与 S3「capsule 形状在系统中无处不在」的
  方向一致，lensing 在胶囊端点处自然汇聚，是本 recipe 观感最好的表面。

### 2.5 Recipe LG-3 · 按压液感（cap 高光位移 + energize 内发光）

**语义来源**：S2「Liquid Glass responds to interaction by instantly flexing and
energizing with light … the material illuminates from within as a form of
feedback. Starting right under your fingertips, the glow spreads throughout the
element」；S6「Always include a press state for a custom button」。
SwiftUI 里玻璃按钮受压时表面高光带（cap）随形变流动——CSS 近似为：
顶部高光带伪元素随按压位移下沉 + 内发光增亮，与既有「按压反馈对」同沿。

```css
/* 草案示意 — .tool-btn（唯一玻璃控件；.btn 纸面族不套用，见 §2.7） */
.tool-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(180deg, var(--hi-light) 0%, rgba(255, 252, 240, 0) 42%);
  opacity: 0.5;
  pointer-events: none;                            /* 不参与命中测试 */
  transition: transform var(--spring-snappy), opacity var(--spring-snappy);
}

.tool-btn:active::after {
  transform: translateY(var(--cap-shift));         /* cap 高光随按压下沉 1px */
  opacity: 0.85;                                   /* energize：亮度抬升 */
  transition: transform var(--press-in), opacity var(--press-in);
}

.tool-btn:active {
  transform: translateY(1px);                      /* 按压反馈对：transform + box-shadow + 按下沿，三者成对 */
  box-shadow:
    0 0 0 0 var(--shadow-press),
    inset 0 2px 4px var(--press-glow),             /* 新增：energize 内发光 */
    inset 0 -1px 0 var(--glass-lens-rim);
  transition: transform var(--press-in), box-shadow var(--press-in);
}
```

- **时序零新增**：回弹沿用 `--spring-snappy`、按下沿用 `--press-in`，
  与 v4.3 按压反馈对的「基线 = 回弹沿，:active 覆盖 = 按下沿」完全同构。
- `.tool-btn` 需补 `position: relative`（现值无定位）；伪元素不新增 DOM。
- `::after` 覆盖在文本之上：带状高光 α ≤ 0.55 且只占顶部 42%，
  浅色下加亮背景只会提高 `--ink` 对比；深色下 `--hi-light` 已降至 α0.14。
  对比度数值须在实现批次的 `scripts/audit-ui.mjs` 审计中复核（记入 §7 风险）。
- 设备倾斜 / 光源跟随（S2）在桌面无输入源，**降级为静态顶光**——这同时是
  v4 既有的光向约定（`--hi-light` 恒为 `inset 0 1px 0`）。不自造鼠标跟随光
  （需要 JS 或无法无依赖实现，双重违反约束）。

### 2.6 Recipe LG-4 · 旋钮卡位定位感（微过冲调参分析 —— 零新曲线）

**现状**：`.gain-pointer { transition: --knob-rot var(--spring-snappy); }`，
`--knob-rot` 已注册 `<angle>`（tokens.css @property），因此角度可插值。

**量纲分析**（估算值，草案标注，非来源参数）：

| 令牌（v4.3 冻结值） | bezier | 过冲量级（占行程比例，估算） | 指针行程 = 40°（相邻卡位）时 | 指针行程 = 120°（0→3 跨三档）时 |
|---|---|---|---|---|
| `--spring-snappy` 300ms (.26,1.16,.36,1) | y2=1.16 | ≈3–5% | ≈1–2° | ≈4–6° |
| `--spring-bouncy` 420ms (.34,1.44,.5,1) | y2=1.44 | ≈10–12% | ≈4–5° | ≈12–15° |

- 卡位刻度间距 40°（−60/−20/+20/+60）。snappy 的 3–5% 过冲在单步切换时
  约 1–2°，是「越过一点再落回」的**定位感**；bouncy 在跨档切换时会冲出
  12–15° —— 超过相邻刻度间距的 1/3，指针将短暂「停在错误的印刷刻度上」，
  对仪表语汇是误读而非手感。
- **结论：M4 不改任何 bezier、不新增时长令牌。**「微过冲」已由
  `--spring-snappy` 的 y2=1.16 提供；M4 对本条目的交付是**把上述量纲分析
  写入 UI_CONTRACT 注释层**（锁定「旋钮 = snappy、禁 bouncy」），
  并以回归断言固化（§5：负向断言，防止后续批次无声换成 bouncy）。
- 交互期间「旋钮变成玻璃」的原生行为（S5）在本项目映射为：拖拽 / 键盘
  步进期间指针即玻璃态——不需要额外转换动画，符合 v4.3「直控零延迟原则」。
- 若所有者实测后认为过冲不足，**唯一授权的调参面**是在 snappy / bouncy
  二者间为 `.gain-pointer` 重新选择，且必须同步修订 v4.3 令牌表「用途」栏
  （bouncy 现注「仅小面积点缀（toast 入场）」）——该修订属契约变更，
  不在本草案权限内。

### 2.7 适用表面清单

**允许（浮动功能层，且仅此四面 —— 与 v4.2 玻璃面完全同集合）**：

| 表面 | LG-1 specular | LG-2 lensing | LG-3 按压液感 | 说明 |
|---|---|---|---|---|
| `.tool-btn`（⚙ 工具钮） | ✔（:active） | ✔ | ✔ | 唯一可交互玻璃控件，M4 主载体 |
| `.cycle-plate`（周期胶囊） | ✘（非交互，无激活态） | ✔ | ✘ | 静置材质升级；S3「材质加在控件本身」的反向应用：非控件只取材质不取交互 |
| `.toast`（GAIN 解锁提示） | ✘（瞬态浮层，入场动画已足够） | ✔ | ✘ | 入场已走 `--spring-bouncy`（v4.3） |
| `.dialog`（设置浮层） | ✘（容器非控件；激活态留给内部控件，但内部控件为纸 / 炭语汇） | ✔ | ✘ | 深面玻璃，lensing 用 dark 值 |

**禁止（内容层及机械语汇面，HIG S1「Don't use Liquid Glass in the content
layer」+ 本项目语汇一致性）**：

| 表面 | 禁止原因 |
|---|---|
| `.machine-panel`（机面板，厚材质） | 内容层主承载面；M1 已裁定用标准厚材质（color-mix 92% + blur26）。specular 描边会把「烤漆」读成「玻璃」，破坏奶油烤漆语汇 |
| `.panel` 纸卡（INPUT/OUTPUT） | 纸卡是文本载体 + 纸质语汇；lensing/specular 属玻璃光学，材质语汇冲突；且高光带与文字争抢注意力 |
| `.observation` / `.status-line` | 内容层信息面（深炭玻璃内嵌窗 / LCD 条）；其玻璃是「窗」而非「浮动控件」，S2 的玻璃禁则不适用反面也不适用正面——不升级 |
| `.tutorial-note` / `.result-card` / `.furnace-card` | 纸质 / 设备面，非浮动功能层 |
| `.btn` / `.btn-primary` / `.gain-stop` / `.btn-dark` / `.btn-ghost` | 机械纸面控件族：按压反馈对已在 v4.3/M1 定义（translateY + 厚度阴影），语义是「物理按键行程」而非「液态玻璃受压」。两套按压语义并存会分裂控件语言 |
| `.dialog` 内部（select / range / `.dialog-close`） | S2「never stack glass-on-glass」：dialog 容器已是玻璃，内部控件保持纸 / 炭，天然规避叠玻璃 |
| SVG 表盘族（`.gauge-*`） | SVG 不得改 Canvas / 不加滤镜；仪表指针的阻尼已由 `--spring-smooth` 承担 |

### 2.8 明确否决的手法（及理由，留档防翻案）

| 手法 | 否决理由 |
|---|---|
| `filter: url(#feDisplacementMap)` 真·边缘折射 | backdrop-filter 对 url() 引用的支持在引擎间残缺（Firefox 限定）；对 HTML 元素套 SVG 位移滤镜性能差且破坏文本渲染；S9 已警告滤镜成本。CSS-only 约束下风险收益比完全不成立 |
| `mask-image` 渐变描边 | 引入 `-webkit-mask` 前缀双写矩阵，跨引擎基线（M4 第 4 项）成本高于 S13 的双层背景手法，后者零前缀 |
| `border-area`（Backgrounds L4 新值） | S13 明示实现最弱，非 Baseline |
| JS 光标跟随光源（S2 设备倾斜的指针模拟） | 违反「JS 运行时渲染 / 新增脚本行为」约束；且桌面无倾斜输入，静态光位是 v4 既有约定 |
| `@property` 注册 `<color>` 做 specular 颜色过渡（A-2 备选） | 引擎间「插值 vs 离散跳变」差异直接造成跨引擎视觉分叉；除非三引擎实测一致，否则维持离散跳变（§2.3） |
| BGM 式「玻璃流动」无限循环动画 | 规格 frozen；动效白名单外 |

---

## 3. 与 M2 / M3 的边界

| 相邻项 | 归属 | 边界划定 |
|---|---|---|
| tool 按钮**悬浮态** specular | **M2**（v4.5 明文「tool 按钮悬浮态 specular」） | M2 拥 `:hover`；M4 拥 `:active` / `:focus` 之外的受压语义。两批次共享本草案 §2.2 的静置令牌（`--mat-spec-hi/lo`）——先落地者定义令牌，后落地者只引用不得重定义。若 M2 先行，M4 追加 `--mat-spec-hi-act` 与按压族；若 M4 先行，反向同理 |
| 火光透射观察窗 / ending 幕玻璃 / 便签纸材质化 | **M2** | M4 不触碰 `.observation`、`.stage--ending*`、`.tutorial-note`（§2.7 禁止表同源） |
| 采样模糊 GPU 层级梳理 / Safari·旧引擎回退矩阵实测 / RT·IC 全链路走查 | **M3** | M4 的降级**设计**（§4）属交付物；降级的**实测验证**归 M3 审计。M4 交付的跨引擎断言与基线方案（§5、§6）为 M3 提供走查入口，不重复其审计工作 |
| 跨引擎基线 | **M4**（v4.5 明文） | 涉及 D19/D28（视觉基线 Chromium-only）的契约面，见 §6 —— 需所有者显式批准，本草案只给方案 |

---

## 4. 降级路径

| 环境 | 行为 | 机制 |
|---|---|---|
| `prefers-reduced-transparency: reduce` | **全部 M4 令牌塌缩回实色**：`--mat-spec-hi/-lo → var(--glass-float-edge)`（conic 两 stop 同色 = 平边框，视觉回到 M1 状态）、`--glass-lens-out/-rim → transparent`、`--press-glow → transparent`、`--cap-shift: 0px`（高光带仍在但不位移） | 在 tokens.css 既有 `@media (prefers-reduced-transparency: reduce)` 块内追加 M4 令牌覆写——**纯令牌级塌缩，零选择器分叉**，可静态断言。注意 S10：该 media query 非 Baseline，不支持它的引擎自然落回默认值（即完整效果），与既有 v4.2 矩阵行为一致 |
| `prefers-contrast: more` | 同 RT 塌缩（specular 低α描边在增强对比下让位给实色边界，与焦点环加粗的处理哲学一致） | 既有 `@media (prefers-contrast: more)` 块内追加 |
| 引擎无 backdrop-filter（S8：Firefox<103 / 极旧 WebKit） | 既有行为不变：半透明叠色仍在，模糊 / 提饱和丢失。**M4 全部新效果（conic 描边 / 阴影棱线 / 按压位移）不依赖 backdrop-filter**，在无模糊引擎里完整存活——这是把 M4 语汇做成「渐变 + 阴影」而非「更多 backdrop 滤镜」的核心理由（同时呼应 S9 性能警告：不给采样模糊加面积） |
| `prefers-reduced-motion: reduce` / `data-motion='reduced'` / `data-freeze='1'` | cap 位移与一切新过渡被 motion.css 既有通配 kill-switch（`*,*::before,*::after` 0.01ms）覆盖，静态 specular / lensing 不受影响 | 零新增开关，断言沿用 v4.6 既有条目 |
| Safari ≤17 | `-webkit-backdrop-filter` 双写已存在于 M1 代码；M4 不新增 backdrop 声明，无新增前缀面 | 维持现状 |

---

## 5. 验收断言提案（tests/material.test.ts，v4.6 风格）

以下为实现批次落地时并入 `tests/material.test.ts` 的新 describe 块草案
（CSS 源码字符串断言 + 块级作用域切分，风格与既有 v4.6 完全一致；
选择器名以实现为准，此处锚定草案目标面）：

```ts
// ── v4 M4 液态玻璃语汇（草案提案，实现批次启用）──
describe('v4 M4 liquid glass vocabulary', () => {
  it('M4 tokens exist (specular pair, lensing pair, press glow, cap shift)', () => {
    for (const t of [
      '--mat-spec-hi:', '--mat-spec-hi-act:', '--mat-spec-lo:',
      '--glass-lens-out:', '--glass-lens-rim:', '--press-glow:', '--cap-shift:',
    ]) {
      expect(tokens).toContain(t);
    }
  });

  it('edge specular = padding-box/border-box double background conic (no mask, no svg filter)', () => {
    const tb = machine.split('.tool-btn {')[1]?.split('}')[0] ?? '';
    expect(tb).toContain('padding-box');
    expect(tb).toContain('border-box');
    expect(tb).toContain('conic-gradient(');
    expect(machine).not.toContain('mask-image');        // §2.8 否决项回归锁
    expect(machine).not.toContain('feDisplacementMap'); // §2.8 否决项回归锁
  });

  it('activation raises specular via local token override (one-line state)', () => {
    const act = machine.split('.tool-btn:active')[1]?.split('}')[0] ?? '';
    expect(act).toContain('--mat-spec-hi: var(--mat-spec-hi-act)');
  });

  it('press liquid feel: cap displaces on the press-in edge (pair contract extended)', () => {
    const capAct = machine.split('.tool-btn:active::after')[1]?.split('}')[0] ?? '';
    expect(capAct).toContain('translateY(var(--cap-shift))');
    expect(capAct).toContain('var(--press-in)');
    const act = machine.split('.tool-btn:active')[1]?.split('}')[0] ?? '';
    expect(act).toContain('transform: translateY(1px)');      // 按压反馈对不被削弱
    expect(act).toContain('inset 0 2px 4px var(--press-glow)'); // energize 内发光
    expect(act).toContain('var(--press-in)');
  });

  it('lensing rims attach to the floating layer only (content layer stays clean)', () => {
    for (const block of [
      controls.split('.toast {')[1]?.split('}')[0] ?? '',
      controls.split('.dialog {')[1]?.split('}')[0] ?? '',
      machine.split('.cycle-plate {')[1]?.split('}')[0] ?? '',
      machine.split('.tool-btn {')[1]?.split('}')[0] ?? '',
    ]) {
      expect(block).toContain('var(--glass-lens-');
    }
    for (const anchor of ['.machine-panel {', '.tutorial-note {', '.observation {']) {
      const block = machine.split(anchor)[1]?.split('}')[0] ?? '';
      expect(block).not.toContain('spec');
      expect(block).not.toContain('lens');
    }
    const paper = machine.split('.panel:not(.on-dark)')[1]?.split('}')[0] ?? '';
    expect(paper).not.toContain('spec');
  });

  it('knob detent stays on snappy spring (micro-overshoot locked; bouncy forbidden)', () => {
    const p = controls.split('.gain-pointer {')[1]?.split('}')[0] ?? '';
    expect(p).toContain('transition: --knob-rot var(--spring-snappy)');
    expect(p).not.toContain('bouncy');   // §2.6 量纲分析的行为锁
  });

  it('degradation matrix collapses M4 tokens (RT block redefines them)', () => {
    const rt = tokens.split('@media (prefers-reduced-transparency: reduce)')[1] ?? '';
    expect(rt).toContain('--mat-spec-hi: var(--glass-float-edge)');
    expect(rt).toContain('--glass-lens-out: transparent');
    expect(rt).toContain('--press-glow: transparent');
    expect(rt).toContain('--cap-shift: 0px');
  });

  it('M4 adds zero new hex (all new colors are rgba tokens; allowlist unchanged)', () => {
    // 既有 hex 白名单断言已覆盖：只要 M4 recipe 全走令牌，此测试无需改动即通过。
    // 实现批次自检点：新增样式若出现裸 hex 即违规（含 white 关键字也不得用于着色）。
  });
});
```

补充（非 material.test.ts，属 e2e / 审计层，实现批次另行立项）：
- 对比度：`scripts/audit-ui.mjs` 增采 `.tool-btn:active` 计算样式的
  内发光叠加后文本对比（LG-3 风险项，§7）。
- 跨引擎：见 §6。

---

## 6. 跨引擎基线固化（M4 第 4 项 —— 涉及契约修订，需所有者批准）

现状：D19/D28 视觉基线 Chromium-only（playwright.config.ts 注释明示；
desktop-firefox / desktop-webkit 项目仅跑功能）。M4 的「跨引擎基线固化」
有两个方案：

- **方案 B（推荐 v1）**：像素基线维持 Chromium-only；跨引擎以
  **计算样式断言**固化 —— 在 e2e 增一条 spec（或并入 desktop.spec.ts），
  对 Firefox / WebKit `getComputedStyle` 断言 `.tool-btn` 的
  `background-image` 含 `conic-gradient`、`box-shadow` 含内棱线、
  `.gain-pointer` transition 未变。零像素抖动、确定性高、不受 S8/S12
  的引擎渲染微差影响。
- **方案 A（可选，须显式修订 D19/D28）**：为 desktop-webkit 增开
  `toHaveScreenshot` 基线（Windows 本地 Playwright WebKit 可跑；CI 需
  相应 runner）。所有新基线按 D27 标 `PENDING-HUMAN-REVIEW`，且
  1px conic 描边在三引擎的抗锯齿微差大概率产生像素级 diff ——
  需接受较高的基线维护成本。**未经所有者批准不得启用。**

Firefox 的 backdrop-filter 自 103（2022-07）默认开启（S8），三引擎的
M4 效果面（渐变 / 阴影 / 伪元素）均在 Baseline 2024 之前的稳定集内，
方案 B 的断言在三引擎上等价成立。

---

## 7. 风险与未决项（实现批次须知）

1. **`::after` 覆文本的对比复核**（LG-3 最大单点风险）：带状高光叠在
   `.tool-btn` 文字上，浅色增益、深色近零——需 audit-ui 实测
   `:active` 态对比，若不达标则把带高限制在顶部 30% 或降 α。
2. **M2 / M4 落地顺序耦合**：静置 specular 令牌（§2.2）两批次共享，
   先落地者定义、后者引用；实现前须核对另一批次状态。
3. **离散跳变 vs 插值的观感**：LG-1 刻意选离散（跨引擎一致），
   `:active` 的描边增亮瞬时切换可能与 110ms 按下沿的位移不同步 ——
   若观感突兀，备选 A-2（@property `<color>` 插值）需所有者批准 +
   三引擎实测后再启用。
4. **conic 描边 + backdrop-filter 同元素叠加的渲染成本**：四块玻璃面
   面积都很小（≤ toast 尺寸），S9 的性能警告影响有限，但仍属 M3
   GPU 层级梳理的走查对象。
5. **D19/D28 修订决策**：§6 方案 A 未获批准前，跨引擎只做计算样式断言。
6. **旋钮曲线换用 bouncy 的诱惑**：§2.6 已给量纲否决理由；负向断言
   （§5）是唯一防线，任何修订必须走契约变更而非实现层私改。

---

## 8. 草案声明

本文件是 **UI_CONTRACT v4.5 M4 批次的设计草案**，不是规格、不是契约正文、
不是实现。全部 recipe、令牌值、断言提案均待所有者批准后方可进入实现批次；
批准时应把采纳项写回 `UI_CONTRACT.md` v4.x 正文并更新 v4.5 批次表状态。
本草案的撰写过程未改动任何现有文件、未运行任何测试、未产生任何提交。
