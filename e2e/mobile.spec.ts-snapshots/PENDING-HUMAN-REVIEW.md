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

- 重采（settings-mobile win32）：同桌面 v4 材质/动效体系（详见 desktop 目录同日条目）。
  自采 ≠ 已确认。

## 变更记录（2026-09-08 · UI v4 M2+M3 修复）

- 重采（settings-mobile win32）：逐字节不变——dialog 背景（P1-3）与观察窗/状态条/面板
  端点（P0-1）令牌化为像素等价改写；移除的 dialog 自有采样层本就视觉无效（M3 审计
  §3.1：backdrop 根截断，只能模糊纯色 scrim）。同批 M2 变更面（ending 幕玻璃、
  火光透射、悬浮 specular、便签纸材质）不在本目录快照覆盖内，详见 desktop 目录
  同日条目与 UI_CONTRACT v4.7。自采 ≠ 已确认。

## 变更记录（2026-09-08 · UI v4.8 M4+M5 实现批次）

- 重采（settings-mobile win32）：dialog 外缘 lensing 暗环 + 内底亮棱（M4 LG-2）、
  设置浮层内纸面控件无变更；M5 纸纹不触及 dialog 内部（暗面玻璃）。其余交付面
  详见 desktop 目录同日条目与 UI_CONTRACT v4.8。自采 ≠ 已确认。
