# research/ai-pipeline — AI 插画资产管线 PoC

> 2026-09-09 所有者委托的**无约束研究 PoC**（AI_ILLUSTRATION_RESEARCH.md §4 P0 路线的实证）。
> 本目录**独立于生产 verify**：自带 package.json（vtracer/svgo/pngjs/sharp 仅装在此处，
> 根 package.json 依赖白名单零污染）；产物不进生产 bundle。

## 结论一句话

生成端有三条**不经过 ComfyUI** 的路线，全部与下游管线兼容；其中**路线 B（LLM
直接写 SVG）已当场实证：548 字节 gzip、13 用色全合规、无几何硬伤**——比描摹
路线小一个数量级，且天然矢量。

## 生成端三路线（2026-09-09 追问实证：不用 ComfyUI）

| 路线 | 引擎 | 产物 | 实测 | 适合 |
|---|---|---|---|---|
| A 云端文生图 API | 智谱 CogView 系等（按张计费，需 key+网络；GLM-5.3-flash 本身是文本模型不产位图） | PNG → 走 vtracer 描摹管线 | 未实测（需 key） | 细节丰富的整幅版画 |
| **B LLM 直写 SVG** | **GLM-5.3 系文本模型（flash 档即可）直接输出 SVG 代码** | 原生矢量，svgo 即终态 | **✅ 实测**：`input/llm-direct-paper-to-furnace.svg` → 548B gzip / 18 元素 / 13 用色全合规 / 渲染走查无几何硬伤（一处 1-2px 连接缝可修） | 平涂版画风小插画（卡面/角标/图标族）——**预算敏感场景首选** |
| C 本地脚本直跑模型 | diffusers 十几行 Python（仍需 GPU） | PNG → vtracer | 未实测 | 有 GPU 后的批量出图 |

- 路线 B 的完整闭环：模型出 SVG → 色板校验脚本（本次 offPalette=[]）→
  svgo → 渲染走查。**可编排为「一次对话出 8 张候选 → 脚本自动过滤色板
  合规项 → 人工选 1」**的批量流。
- 与路线 A 的组合打法：小插画走 B（几百字节级），结局大幅走 A+描摹
  （细节密度需要扩散模型）。
- 提醒：路线 B 产出的「墨字刻痕」等装饰元素必须保持**非文字**（本项目
  玩家可见文本冻结在 CONTENT_SPEC——LLM 直写时需在提示词中显式约束）。

## 路线 B 候选库（2026-09-09 所有者授权后批量产出）

`llm-svg-batch/`：**授权记录**——所有者指令「授权你 LLM 直写 SVG」。

- **候选库**（`candidates/`，6 件）：五幅结局版画（A 冷灰烬 / B 信号失真 /
  C 稳态运行·fidelity 绿语义锚 / D 过载辉光 / E 拔掉插头）+ 纸带入炉小插画。
  均为 GLM-5.3 系模型直写 SVG、木刻平涂风、零文字。
- **批量闸门** `batch.mjs`（声明式子色板 manifest → svgo → gzip 计量 →
  渲染 → 走查拼贴单）：**6/6 PASS，零越板色**；单件 458–605B gzip、
  16–30 元素——**整套合计 3.1KB gzip**。
- **走查结论**（contact-sheet.png，模型视觉评审）：整套可用性 8/10，
  风格一致性良好（色体系/线宽/密度统一）；最佳 = D（四层焰舌的\"刀味\"、
  放射动势最足）；最弱 = B（碎裂过渡区中段的断线/散点衔接偏生硬，
  修法：加中间密度的过渡点列）。已知微瑕：A 的炉体-灰堆衔接缝、
  C 的表盘刻度可加密。
- **成本结论**：路线 B 的整套结局插画 ≈ 3KB，占 250KB 预算的 1.2%——
  体积在这个路线下**不再是决策变量**，审美取向成为唯一决策变量。
- 集成进生产仍需所有者过三道门（研究文档 §6 的三个数字 + 规格/契约通道），
  本库为审阅候选，未触碰 `src/`。

## 管线

```text
[生成端槽位] 本 PoC 用公有领域版画代替（生产时替换为 ComfyUI 工作流输出）
  Gustave Doré, Inferno Canto XV (1866), Public domain, 969×760
  → sharp（缩放/裁切：模拟整幅 vs 局部小插画）
  → vtracer WASM（preset poster + mode spline + palette 项目色板
    + filterSpeckle 12 + simplify 1.5 + optimize 2）
  → svgo multipass
  → 输出 SVG + gzip 报告 + 色板合规校验
```

- `pipeline.mjs` —— 主管线（有/无色板双变体对照）
- `scale-test.mjs` —— 尺寸/体积曲线（6 档输入尺寸 × 整幅/局部）
- 依赖：`@visioncortex/vtracer` 1.0.0-alpha.4（Node-WASM）、`svgo` 4.1.0、
  `sharp`、`pngjs`；全部安装于本目录。

## 实测数据（2026-09-09）

### 色板收编（pipeline.mjs）

| 变体 | 填充色数 | 越板色 | gzip |
|---|---|---|---|
| palette（17 色板） | 12 | **0（全部合规）** | 435KB（整幅 969×760 最坏情形） |
| free（maxColors 12） | 12 | 全部漂移（冷灰系 #8c8487 等） | 433KB |

### 尺寸曲线（scale-test.mjs）

| 输入 | gzip | 路径数 | 对应资产类型 |
|---|---|---|---|
| 整幅 760w | 268KB | 1162 | 不可用（超总预算） |
| 整幅 480w | 94KB | 483 | 结局大幅（5 张则超预算） |
| 整幅 320w | 33KB | 207 | 结局大幅（单张可容） |
| 整幅 200w | 11.8KB | 80 | 卡面插画（12 张 = 141KB，需预算决策） |
| 局部 200w | 10KB | 75 | 卡面插画 |
| 局部 120w | **3.5KB** | 28 | 小插画（12 张 = 42KB，从容） |

### 风格修正实验（色板即风格）

首跑发现老化纸色在 OKLab 最近色匹配中落到 `#2c625a`（fidelity 绿）——
换用**美术资产专用暖色板**（去绿黄、强化余烬族 `#c0503f/#7c2a20`）后：
填充表 11 色全暖、体积/路径数零变化、视觉走查确认旧纸炭色版画感成立。

推论：**给每个资产族准备专用子色板**（结局幕 = 暖+余烬；观察窗 = 灰阶+
信号色），比全局色板更可控。

## 已知问题与改进旋钮（按实测）

1. 密排整幅版画的暗部人物会被吞进深色块 → 生成端就该出 poster 级平涂
   （AI 生成输入可控，百年扫描件是最坏 stress test）；或整幅升 480w（+60KB）。
2. 局部 120w 是甜点位：3.5KB/28 路径，肉眼与 200w 差异小。
3. 未做：Real-ESRGAN 预放大（生成端为光栅时）、`hierarchical: cutout` 对照、
   深色外观双画（SVG 内换色板即得，代价为零——双语义双画构想的免费实现）。

## 许可注意

- 输入样张：Gustave Doré《Inferno》Canto XV 插图（1866，Public domain，
  Wikimedia Commons `9/91/Brunetto_Latini_accosts_Dante...jpg`），仅作 PoC 输入。
- vtracer（BSD-2）、svgo（MIT）、sharp（Apache-2.0）、pngjs（MIT）——
  生产引入时需按 PRESENTATION_SPEC 的许可口径复核（另：SVGcode/Potrace 系
  为 GPLv2，只借鉴思路不引代码）。
