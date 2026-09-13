# D27 首次人工复核 · 过目包索引

> 自采 ≠ 已确认（D27）：以下 10 张 win32 基线全部由执行 Agent 自采，首次人工会话
> 必须复核；不符合预期可整体作废重采（所有者专属权限）。
> 复核完成后告知执行 Agent 翻转 PENDING-HUMAN-REVIEW 状态。

## 快速过目路径（约 15 分钟）

| 基线 | 内容与看点 | 最近变更 |
|---|---|---|
| [home-zh](home-zh-desktop-chromium-win32.png) / [home-en](home-en-desktop-chromium-win32.png) | 首页：铭牌/启动按钮/**冷炉待机版画**（M7 H1，140px@900）/材质层次 | M7 |
| [cycle4-zh](cycle4-zh-desktop-chromium-win32.png) | 周期 4：**卡面印章 C04**（浮动落款）/裁刀/仪表/**观察窗炉膛内景**（M7 G1）/台面刻度（M5） | M7 |
| [cycle8-en](cycle8-en-desktop-chromium-win32.png) | 周期 8（英文）：印章 C08、en 排版与印章共存 | M7 |
| [cycle12-zh](cycle12-zh-desktop-chromium-win32.png) | 周期 12：印章 C12（teal 冷锚）/Act3 状态 | M7 |
| [result-peak](result-peak-desktop-chromium-win32.png) | 结局 D：**过载版画**（M6）/结局幕玻璃/意象层 | M6 |
| [result-stable](result-stable-desktop-chromium-win32.png) | 结局 C：**稳态版画**（fidelity 绿锚）/仪表归零表达 | M6 |
| [settings-mobile](../mobile.spec.ts-snapshots/settings-mobile-mobile-chromium-win32.png) | 设置浮层：lensing 暗环/纸面控件 | M4 |

## 复核清单（每张问四句）

1. 插画/装饰是否与冻结文案、控件**零冲突零遮挡**？
2. 材质与光（玻璃/纸/火）是否符合 UI_CONTRACT Art Direction？
3. 有无渲染异常（错位/残影/断层）？
4. 整体是否「可接受作为回归基准」？

## 不满意时

- 整体作废重采：`npx playwright test --project=desktop-chromium --project=mobile-chromium -g "visual baselines" --update-snapshots`
- 个别图不满意：点名（如「印章 C07 重画」），修候选库不修基线。
