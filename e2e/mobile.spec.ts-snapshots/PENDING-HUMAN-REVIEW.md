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
