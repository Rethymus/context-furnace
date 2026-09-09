# PENDING-HUMAN-REVIEW（D27）

此目录下的视觉基线由无人值守的执行 Agent 于 2026-09-06 首采（本地 Windows，Chromium via 系统 Chrome 通道）。

- **自采 ≠ 已确认**：这些基线用于无人值守阶段的回归防护；
- **首次人工会话必须复核**本目录全部基线图，不符合预期可整体作废重采：
  ```
  npx playwright test --project=desktop-chromium --project=mobile-chromium -g "visual baselines" --update-snapshots
  ```
- 此后 Agent 不得自行 update snapshots；任何 diff 视为回归。
- Linux（CI）基线由 `.github/workflows/update-baselines.yml` 手动触发生成（D28）。

## 变更记录

- 2026-09-06（clean-correction 复盘后重采 home-zh/home-en）：为贴合原规格 §2.2「开机时两仪表自检扫描」，首页圆窗仪表增加自检亮起并进入 lit 状态；boot 动画结束后圆窗描边为 --warning 色。旧基线（深色圆窗）由本规格贴合修正取代。

## 变更记录（2026-09-06 续）

- 全量重采：EXECUTION CONTRACT v1.0 §4 冻结禁止旧视觉家族（beige 仪表盘/半圆机械表盘/黑色堆叠卡），依 UI_CONTRACT.md（P3，含 STATE IMPLEMENTATION TABLE）重实现为纸片拼贴系统；全部 8 张基线随之更新。

## 变更记录（2026-09-06 M2）

- 全量重采（8 张 win32）：UI_CONTRACT §4.9 M2 材质真实化——台面确定性纹理（细颗粒+大尺度斑驳）、
  材质填充 alpha 重校（浅 0.74→0.62 / 厚 0.88→0.76）、深色玻璃提亮、发丝边/内高光/光场对比增强、
  裁刀 transform 精确对齐（修正 %left 边缘 ≤8px 偏差）、裁刀套投影收窄、仪表旋转角降低、
  玻璃面发丝边升档；细颗粒最终振幅 0.05（媒体预算收敛后重采本套）。量化：glassVisibility 0.3→5.7（浅）/4.5（深）。PENDING-HUMAN-REVIEW 不变。

## 变更记录（2026-09-06 · UI v3）

- 流水线重构（用户指令解除约束）：依 UI_CONTRACT v3 与新概念图（暖泥台面 + 深炭黑面板 + 左主右辅双栏 + 旋钮回归）全量重采 8 张金本位。行为/文案/数值未变；几何由 e2e/layout.spec.ts G1–G8 保护。

## 变更记录（2026-09-08 · UI v4 M1）

- 全量重采（8 张 win32）：UI_CONTRACT v4「材质与动效体系」落地——Apple HIG 材质分层
  （面板厚材质 blur 26px/sat 1.35 + color-mix 92% 半透叠色、浮层玻璃 0.78/0.68、
  观察窗/状态行暗玻璃 10px）、SwiftUI 弹簧动效令牌（smooth/snappy/bouncy CSS 近似）、
  按压反馈对（110ms 压入 + 300ms 弹性回弹）、浮层入场（toast-in/sheet-in）、
  裁刀拖拽 1:1 直控旁路（.dragging 禁过渡）、指针/弧线阻尼过渡、
  焦点环对比度修复（1.36:1→≈3.3:1，WCAG 1.4.11）。行为/文案/数值未变；
  几何仍由 e2e/layout.spec.ts 保护。PENDING-HUMAN-REVIEW 状态不变（自采 ≠ 已确认）。

## 变更记录（2026-09-08 · UI v4 M2+M3 修复）

- 全量重采（win32，8 张）：UI_CONTRACT v4.5 M2 层次深化 + M3 审计修复批（v4.7）。
  实际变更面仅 result-peak / result-stable 两张——ending 幕玻璃（.ending-wrap 暗玻璃幕
  + stage scrim 幕布）。其余 6 张（home×2 / cycle×3 / settings-mobile 由 mobile 目录承载）
  逐字节不变：M3-P0 令牌化按「浅/深计算值与当前像素一致」约束实施，P1-3 移除的 dialog
  采样层本就视觉无效，均为实证（基线字节比对）而非推断。
  其余交付面不在基线覆盖内：火光透射仅存在于 BURNING 反馈窗口（快照均为稳态）；
  tool-btn 悬浮 specular 不入基线（Playwright 截图前移开鼠标）；教学便签无桌面快照。
  行为/文案/数值/几何未变。自采 ≠ 已确认。

## 变更记录（2026-09-08 · UI v4.8 M4+M5 实现批次）

- 全量重采（win32，本目录 8 张）：UI_CONTRACT v4.8（所有者批复 K2/K3 后交付）。
  M4 液态玻璃：tool-btn conic 光学描边 + 四浮动面 lensing 棱线（含 cycle-plate /
  tool-btn 入镜的本目录全部快照）；M5 插画：台面丝印刻度与角部斜纹（cycle×3）、
  Act 铭牌蚀刻（cycle×3）、纸面交叉影线（全部含纸卡面）、结局幕意象层
  （result-peak / result-stable，A/D 与 C 各自的 ash/glow/grid 意象）。
  焦点面：home×2 变更仅 tool-btn 静态 conic+lensing（hover/active 态不入基线）。
  行为/文案/数值/几何断言零改动；gzip 增量 +1.24 KB（预算 ≤8 KB）。
  交付细节见 UI_CONTRACT.md v4.8 节；批复记录见 UI_CONTRACT_M5_DRAFT.md §0.2。
  自采 ≠ 已确认。

## 变更记录（2026-09-09 · UI v4.9 M6 结局版画）

- 变更面仅 result-peak / result-stable 两张（其余 6 张逐字节不变，实证）：
  结算玻璃幕顶部新增结局版画板（.ending-plate，aria-hidden 纯视觉，五结局各一幅
  LLM 直写 SVG，所有者授权链「授权你 LLM 直写 SVG」+「授权执行」）。
- 尺寸工程化（本批关键修正）：结局幕为满屏 tableau（.machine--ending
  min-height: calc(100dvh - 58px)），幕内纵向 slack 实测 100px（1440×900）。
  版画宽度 `clamp(140px, calc(100svh * 1.5 - 1220px), 300px)`：
  900 高视口 → 140px（machine 保持 842、页面零滚动，与 Linux 基线同尺寸）；
  ≥~1031px 高视口 → 300px 满幅；140px 底值兜底短视口/移动端（390×844 实测
  无水平溢出、无新增滚动）。初版 min(300px,78vw) 曾致 machine 932/滚动 90px，
  已废弃。
- Linux（CI）基线：像素内容将随本批变化，需 `.github/workflows/update-baselines.yml`
  手动触发生成（D28），machine 高度两平台同为 842（尺寸不变，仅内容 diff）。
- 行为/文案/数值/几何断言零改动。自采 ≠ 已确认。
