# CONTENT_SPEC.md — 《断章取火器 / Context Furnace》内容规格

> **权威版本：v2.0-frozen + P0 裁决（2026-09-06）**
> 本文档是**全部玩家可见文本**的唯一来源：卡牌内容、界面文案、术语表。
> 执行 Agent **不得重写中文、不得重新翻译英语、不得换同义词**（原规格 §71 / §122）。
> **公开呈现面**（README、仓库元数据、Topics、Social Preview 等）文本不属于本文档范畴，以 `PRESENTATION_SPEC.md` 为准。

---

## 语言 QA 状态

```yaml
language_qa_status:
  zh-CN: APPROVED
  en-US: APPROVED
```

本文档中的全部中文与英文文本均为**正式定稿文本**。实现时逐字复制，不做任何"润色"。

---

## 1. Semantic Twin 原则

- 中英文内容**不共用模板翻译**。不存在 `translate(chineseSource)`，不维护 zh → machine translation → en 链路。
- 每张卡先定义 `meaning / segments / roles / mechanic`，然后中文作者写一条母语中文、英文作者重写一条母语英文。
- 只要求：**segment ID 相同、semantic role 相同、scoring 相同**。不要求字面相同。
- 示例（C12）：「冷样本总是被冷落」的正确英文不是 `Cold samples are always neglected.`（双关丢失），而是 **"Cold samples always get the cold shoulder."**——英语用自己的 idiom，这才是本地化。

## 2. Locale 规则

- 生产只允许两个 Locale ID：`zh-CN`、`en-US`（禁止写 `zh` / `en`）。
- 首次检测链：`localStorage cf.locale` → 否则 `navigator.languages`：以 `zh` / `zh-CN` / `zh-Hans` 开头 → `zh-CN`；否则 → `en-US`。
- 任何时间点击「中文 / EN」立即切换；当前 `cycle / cutLeft / cutRight / gain / heat / fidelity` 全部保持，不重新开始。
- `<html lang>` 必须实时更新为 `zh-CN` 或 `en-US`。

---

## 3. UI 术语表（冻结）

| zh-CN | en-US |
|---|---|
| 断章取火器 | Context Furnace |
| 启动 | Power on |
| 炉温 | Heat |
| 保真度 | Fidelity |
| 原料 | Feed |
| 截取 | Extract |
| 成品 | Output |
| 增益 | Gain |
| 复原 | Reset cut |
| 入炉 | Ignite |
| 下一份 | Next input |
| 周期 | Cycle |
| 校准 | Calibration |
| 增压 | Pressure |
| 共振 | Resonance |
| 设置 | Settings |
| 声音 | Sound |
| 音量 | Volume |
| 动效 | Motion |
| 关于 | About |
| 重新运行 | Restart |
| 复制结果 | Copy result |

**P0 补齐项**（D7，原术语表未覆盖，与上表同风格同效力）：

| zh-CN | en-US |
|---|---|
| 重播教学 | Replay tutorial |
| 共振观察窗 | Resonance window |
| 开 | On |
| 关 | Off |
| 周期 04 / 12（格式：`周期 {nn} / 12`） | Cycle 04 / 12（格式：`Cycle {nn} / 12`） |
| 当前负载 | Current load |

---

## 4. 界面文案全集

> 源码一律 Sentence case；视觉大写交给 CSS `text-transform: uppercase`。
> 标记〔雕印〕的字符串是机器铭文，**两种语言下均显示英文原文**。

### 4.1 首页与开机

| key | zh-CN | en-US |
|---|---|---|
| home.model | CF-01 | CF-01 |
| home.title | 断章取火器 | Context Furnace |
| home.subtitle | 语境精炼装置 | Context Refining Unit |
| home.power | 启动 | Power on |
| home.motto | 本机只负责加工，不负责理解。 | Processing only. Understanding not included. |
| home.localeToggle | 中文 / EN | 中文 / EN |
| boot.calibrationComplete | 校准完成 | Calibration complete |

首页**禁止**出现：开始游戏、Play Game、New Game。

### 4.2 教学固定文本与步骤

教学原料（3 个 semantic units，中英文各自划分）：

| key | zh-CN | en-US |
|---|---|---|
| tutorial.text | 高温处理后的金属片，需要完全冷却后才能进行下一步检测。 | A heated metal plate must cool completely before the next inspection. |

教学 segment 划分（zh：`高温处理后的金属片 ｜ 需要完全冷却 ｜ 才能进行下一步检测`；en：`A heated metal plate ｜ must cool completely ｜ before the next inspection`）。教学卡无 roles、无 CORE 约束（D8）。

| key | zh-CN | en-US |
|---|---|---|
| tutorial.step1 | 移动左裁刀。 | Move the left cutter. |
| tutorial.step2 | 调整保留范围。 | Adjust the retained range. |
| tutorial.step3 | 成品会实时更新。 | The output updates immediately. |
| tutorial.step4 | 入炉 | Ignite |
| tutorial.done | 校准完成 | Calibration complete |

### 4.3 主界面

| key | zh-CN | en-US |
|---|---|---|
| gauge.heat | 炉温 | Heat |
| gauge.fidelity | 保真度 | Fidelity |
| meter.heat.aria | 炉温 {value} / 100 | Heat {value} out of 100 |
| meter.fidelity.aria | 保真度 {value} / 100 | Fidelity {value} out of 100 |
| cycle.display | 周期 {nn} / 12 | Cycle {nn} / 12 |
| act.1 | 校准 | Calibration |
| act.2 | 增压 | Pressure |
| act.3 | 共振 | Resonance |
| load.label | 当前负载 | Current load |
| load.normal | 正常 | Normal |
| load.high | 高负载 | High load |
| load.overdrive | 过载运行 | Overdrive |
| panel.feed | 原料 | Feed |
| panel.extract | 截取 | Extract |
| panel.output | 成品 | Output |
| panel.window | 共振观察窗 | Resonance window |
| cutter.left | LEFT〔雕印〕 | LEFT |
| cutter.right | RIGHT〔雕印〕 | RIGHT |
| btn.reset | 复原 | Reset cut |
| btn.ignite | 入炉 | Ignite |
| btn.next | 下一份 | Next input |
| gain.label | 增益 | Gain |
| error.noCore | 未检测到有效核心 | No usable core detected |
| plug.aria | 电源插头 | Power plug |
| cutter.left.aria | 左裁刀 | Left cutter |
| cutter.right.aria | 右裁刀 | Right cutter |

> 后三行仅供屏幕阅读器（aria-label），视觉界面不显示（D32）。

### 4.4 GAIN 解锁提示（显示 1.2 秒）

| key | zh-CN | en-US |
|---|---|---|
| gain.unlock1 | 辅助增益已启用 | Auxiliary gain enabled |
| gain.unlock2 | 二级增益可用 | Gain level 2 available |
| gain.unlock3 | 高增益模式可用 | High-gain mode available |

### 4.5 机器反馈消息（评估顺序见 DESIGN_SPEC §12）

| key | zh-CN | en-US |
|---|---|---|
| msg.efficiencyLow | 燃烧效率偏低。 | Combustion efficiency low. |
| msg.stable | 参数稳定。 | Parameters stable. |
| msg.concentration | 有效浓度合格。 | Concentration accepted. |
| msg.redundant | 冗余成分已清除。 | Redundant matter removed. |
| msg.highPurity | 高纯度输出。 | High-purity output. |
| msg.highYield（附加） | 优质燃料。 | High-yield input. |

### 4.6 结局

| key | zh-CN | en-US |
|---|---|---|
| ending.cold.title | 设备停机 | Equipment offline |
| ending.cold.body | 未达到持续运行条件。 | Operating temperature could not be sustained. |
| ending.signal.title | 信号失真 | Signal lost |
| ending.signal.body | 输入与输出已失去可验证关联。 | Input and output no longer retain a verifiable relation. |
| ending.stable.title | 稳态运行 | Stable run |
| ending.stable.body | 今日指标完成。 | Daily quota complete. |
| ending.peak.title | 效率标兵 | Peak efficiency |
| ending.peak.body | 本周期燃烧效率创下新高。 | This cycle set a new combustion record. |
| ending.unplugged.title | 设备已停止工作 | Equipment offline |
| ending.unplugged.body | （无正文） | （无正文） |

### 4.7 结果页与设置

| key | zh-CN | en-US |
|---|---|---|
| result.peakHeat | 最高炉温 | Peak heat |
| result.finalFidelity | 最终保真度 | Final fidelity |
| result.avgCut | 平均切除比例 | Average cut |
| result.highestGain | 最高增益 | Highest gain used |
| result.machineStatus | 设备状态 | Machine status |
| result.copy | 复制结果 | Copy result |
| copy.copied | 已复制 | Copied |
| result.restart | 重新运行 | Restart |
| settings.language | 语言 | Language |
| settings.language.zh | 简体中文 | 简体中文 |
| settings.language.en | English | English |
| settings.sound | 声音 | Sound |
| settings.on | 开 | On |
| settings.off | 关 | Off |
| settings.volume | 音量 | Volume |
| settings.motion | 动效 | Motion |
| settings.motion.system | 跟随系统 | System |
| settings.motion.full | 完整 | Full |
| settings.motion.reduced | 减少 | Reduced |
| settings.replayTutorial | 重播教学 | Replay tutorial |
| settings.title | 设置 | Settings |
| about.title | 关于 | About |

### 4.8 About（逐字，不得改写）

> zh-CN：
> 《断章取火器》是一款虚构的互动讽刺作品。游戏中的材料、组织、群体和事件均为虚构，不对应任何特定现实人物或机构。炉温、保真度及其它内部数值仅服务于游戏机制，不构成对现实传播行为、点击率或用户反应的统计模型。

> en-US：
> Context Furnace is a fictional interactive satire. Its statements, organizations, groups, and events are fictional and do not refer to any specific real-world person or organization. Heat, fidelity, and other internal values are gameplay mechanics, not statistical models of real-world information behavior, click-through rates, or audience response.

### 4.9 Copy Result 模板（逐字，占位符运行时替换）

zh-CN：

```text
《断章取火器》CF-01

最高炉温：{peakHeat}
最终保真：{fidelity}
平均切除：{cut}%
最高增益：{gain}
设备状态：{ending}

“本机只负责加工，不负责理解。”
```

en-US：

```text
Context Furnace CF-01

Peak heat: {peakHeat}
Final fidelity: {fidelity}
Average cut: {cut}%
Highest gain: {gain}
Machine status: {ending}

“Processing only. Understanding not included.”
```

仅写入剪贴板；不生成图片、不做分享 SDK。复制成功后显示「已复制 / Copied」1.2 s，失败静默降级（D16）。

### 4.10 页面元信息

| key | zh-CN | en-US |
|---|---|---|
| doc.title | 断章取火器 | Context Furnace |

`<title>` 跟随 locale 实时更新（D18）。favicon 为自绘火焰形 SVG（--heat #A43A2F 单色），不属文案范畴。

---

## 5. 十二张正式卡（顺序永久固定，无随机）

**数据约定**：
- 【】为规格书 CORE 标记记号，**不属于游戏文案**，实现时去除（CORE 也不做可视化，D11）。
- `{selection}` = 玩家当前选区文本（GAIN 1 模板运行时拼接）。
- segment id 按表格顺序 `s0, s1, …`；`coreSegmentId` 单列标注。
- 12 张卡顺序 C01→C12 **永久固定**；Cycle 与卡一一对应（Cycle N = Card C{NN}）。

---

### C01 · Cycle 01

| id | role | zh-CN | en-US |
|----|------|--------|--------|
| s0 | ATTR | 研究团队 | The research team |
| s1 | NEG | 没有发现 | did not find that |
| s2 | **CORE** | 【喝咖啡能提高记忆力】 | 【coffee improves memory】 |
| s3 | CONTRAST | 只是观察到 | and only observed that |
| s4 | SCOPE | 经常喝咖啡的参与者 | regular coffee drinkers |
| s5 | TIME | 在一次测试中 | on one test |
| s6 | BASE | 平均得分略高 | scored slightly higher on average |

`coreSegmentId: s2`

- GAIN 1：意外结果：{selection} ｜ Surprising result: {selection}
- GAIN 2：这项研究显示，咖啡正在提升记忆表现。 ｜ The study shows that coffee is improving memory performance.
- GAIN 3：不喝咖啡的人，可能正在放弃一项明显的记忆优势。 ｜ People who avoid coffee may be giving up a clear memory advantage.

---

### C02 · Cycle 02

| id | role | zh-CN | en-US |
|----|------|--------|--------|
| s0 | ATTR | 学校说明 | The school explained that |
| s1 | CONTEXT | 本次安排调整 | the scheduling change |
| s2 | NEG | 并不是 | does not |
| s3 | **CORE** | 【取消晚自习】 | 【cancel evening study】 |
| s4 | CONTRAST | 而是 | but instead |
| s5 | BASE | 把统一参加改为自愿参加 | makes attendance voluntary |

`coreSegmentId: s3`

- GAIN 1：重大调整：{selection} ｜ Major change: {selection}
- GAIN 2：学校正在削减晚间学习安排。 ｜ The school is cutting back evening study.
- GAIN 3：学校把学习时间的责任直接甩给了学生。 ｜ The school is shifting responsibility for study time onto students.

---

### C03 · Cycle 03

| id | role | zh-CN | en-US |
|----|------|--------|--------|
| s0 | ATTR | 技术说明 | The technical note |
| s1 | CONTEXT | 明确写道 | states clearly that |
| s2 | TIME | 升级后 | after the upgrade |
| s3 | NEG | 不会 | it will not |
| s4 | **CORE** | 【删除用户文件】 | 【delete user files】 |
| s5 | SCOPE | 但部分旧版插件 | although some older plugins |
| s6 | MODAL | 可能需要重新安装 | may need to be reinstalled |

`coreSegmentId: s4`

- GAIN 1：升级风险：{selection} ｜ Upgrade risk: {selection}
- GAIN 2：这次升级可能导致用户内容受损。 ｜ This upgrade may put user content at risk.
- GAIN 3：为了推进新版本，旧用户的内容安全被放在了后面。 ｜ To push the new version, the safety of existing users' content has been pushed aside.

---

### C04 · Cycle 04

| id | role | zh-CN | en-US |
|----|------|--------|--------|
| s0 | ATTR | 公司 | The company |
| s1 | NEG | 尚未 | has not |
| s2 | **CORE** | 【决定全面降薪】 | 【decided on company-wide pay cuts】 |
| s3 | TIME | 目前只是 | and for now is only |
| s4 | SCOPE | 调整少数岗位 | adjusting for a small number of roles |
| s5 | BASE | 季度奖金的发放时间 | the timing of quarterly bonuses |

`coreSegmentId: s2`

- GAIN 1：薪酬异动：{selection} ｜ Pay alert: {selection}
- GAIN 2：公司已经开始通过奖金调整变相降薪。 ｜ The company has begun cutting pay indirectly through bonus changes.
- GAIN 3：成本压力最终还是被转嫁到了员工身上。 ｜ The cost pressure is ultimately being passed on to employees.

---

### C05 · Cycle 05（GAIN 1 首次解锁）

| id | role | zh-CN | en-US |
|----|------|--------|--------|
| s0 | ATTR | 社区测量 | Community measurements |
| s1 | CONTEXT | 发现 | found that |
| s2 | QUAL | 只有少数住户 | only a small number of residents |
| s3 | TIME | 在深夜时段 | during late-night hours |
| s4 | **CORE** | 【反映噪声问题】 | 【reported a noise problem】 |
| s5 | CONTRAST | 而大多数时段 | while during most periods |
| s6 | BASE | 测量值符合标准 | readings remained within the standard |

`coreSegmentId: s4`

- GAIN 1：扰民警报：{selection} ｜ Noise alert: {selection}
- GAIN 2：社区正在出现持续性的夜间噪声问题。 ｜ The neighborhood is developing an ongoing nighttime noise problem.
- GAIN 3：居民正在被迫一晚又一晚地忍受这个问题。 ｜ Residents are being forced to put up with the problem night after night.

---

### C06 · Cycle 06（8 段，D1）

| id | role | zh-CN | en-US |
|----|------|--------|--------|
| s0 | ATTR | 供应方 | The supplier |
| s1 | CONTEXT | 表示 | said that |
| s2 | CONDITION | 如果原材料继续上涨 | if material costs keep rising |
| s3 | SCOPE | 部分型号 | some models |
| s4 | MODAL | 可能 | may |
| s5 | TIME | 在下季度 | next quarter |
| s6 | **CORE** | 【调整价格】 | 【have their prices adjusted】 |
| s7 | CONTRAST | 目前没有立即涨价计划 | with no immediate increase planned |

`coreSegmentId: s6`

- GAIN 1：涨价信号：{selection} ｜ Price warning: {selection}
- GAIN 2：供应方已经释放出明确的涨价信号。 ｜ The supplier has sent a clear signal that prices are going up.
- GAIN 3：先放风、再涨价，这套路径已经很清楚了。 ｜ Float the idea first, raise prices later—the playbook is already clear.

---

### C07 · Cycle 07（GAIN 2 解锁）

| id | role | zh-CN | en-US |
|----|------|--------|--------|
| s0 | ATTR | 课程负责人 | The course lead |
| s1 | CONTEXT | 说明 | explained that |
| s2 | **CORE** | 【本次测试平均分下降】 | 【the average score fell on this test】 |
| s3 | CAUSE | 主要因为 | mainly because |
| s4 | BASE | 题目难度提高 | the questions were harder |
| s5 | NEG | 并不代表 | and this does not mean |
| s6 | CONTRAST | 学生整体能力下降 | overall student ability declined |

`coreSegmentId: s2`

- GAIN 1：成绩下滑：{selection} ｜ Scores down: {selection}
- GAIN 2：这次测试暴露出学生整体表现正在下降。 ｜ This test exposes a decline in overall student performance.
- GAIN 3：难度一提高，真实水平就藏不住了。 ｜ Raise the difficulty and the real level is suddenly harder to hide.

---

### C08 · Cycle 08

| id | role | zh-CN | en-US |
|----|------|--------|--------|
| s0 | ATTR | 维修记录 | Maintenance records |
| s1 | CONTEXT | 显示 | show that |
| s2 | TIME | 设备曾经 | the device once |
| s3 | SCOPE | 在高温环境下 | under high-temperature conditions |
| s4 | **CORE** | 【短暂报警】 | 【briefly triggered an alarm】 |
| s5 | CONTRAST | 之后 | after which |
| s6 | BASE | 连续运行三个月未再出现异常 | it ran for three months without another abnormal event |

`coreSegmentId: s4`

- GAIN 1：设备报警：{selection} ｜ Device alarm: {selection}
- GAIN 2：该设备在高温下存在稳定性风险。 ｜ The device has a stability risk under high temperatures.
- GAIN 3：所谓“稳定运行”，只是问题没有再次被触发而已。 ｜ So-called “stable operation” only means the problem has not been triggered again.

---

### C09 · Cycle 09（GAIN 3 解锁）

| id | role | zh-CN | en-US |
|----|------|--------|--------|
| s0 | ATTR | 内部实验 | The internal study |
| s1 | CONTEXT | 显示 | shows that |
| s2 | BASE | 两个小组平均错误率几乎相同 | the two groups had almost identical average error rates |
| s3 | CONTEXT | 其中 | although |
| s4 | TIME | A组在一次测试中 | Group A in one test |
| s5 | **CORE** | 【出现了更多误报】 | 【produced more false positives】 |
| s6 | CONTRAST | 但差异未达到统计显著 | the difference was not statistically significant |

`coreSegmentId: s5`

- GAIN 1：A组误报更多：{selection} ｜ More false positives from Group A: {selection}
- GAIN 2：A组的可靠性明显低于B组。 ｜ Group A is clearly less reliable than Group B.
- GAIN 3：两组差距已经很明显，只是统计口径把它淡化了。 ｜ The gap between the groups is obvious; the statistics only make it look smaller.

---

### C10 · Cycle 10

| id | role | zh-CN | en-US |
|----|------|--------|--------|
| s0 | ATTR | 服务记录 | Service records |
| s1 | CONTEXT | 显示 | show that |
| s2 | **CORE** | 【新用户投诉率略高】 | 【new users had a slightly higher complaint rate】 |
| s3 | CAUSE | 但原因尚不明确 | although the cause remains unclear |
| s4 | SCOPE | 其中很多反馈 | many of those reports |
| s5 | TIME | 集中在更新后的前两天 | were concentrated in the first two days after the update |
| s6 | CONTRAST | 之后迅速回落 | and quickly declined afterward |

`coreSegmentId: s2`

- GAIN 1：新用户投诉上升：{selection} ｜ Complaints up among new users: {selection}
- GAIN 2：新版本正在引发越来越多的新用户不满。 ｜ The new version is driving growing dissatisfaction among new users.
- GAIN 3：用户已经用投诉给这次更新投了票。 ｜ Users have already voted on this update—with complaints.

---

### C11 · Cycle 11（首次明显出现 individual data → group personality）

| id | role | zh-CN | en-US |
|----|------|--------|--------|
| s0 | ATTR | 现场记录 | Field records |
| s1 | CONTEXT | 显示 | show that |
| s2 | SCOPE | 东区住户 | residents on the east side |
| s3 | **CORE** | 【更频繁提交停车投诉】 | 【filed parking complaints more often】 |
| s4 | CAUSE | 主要因为 | mainly because |
| s5 | BASE | 东区车位数量更少 | there are fewer parking spaces there |
| s6 | NEG | 并不能说明他们更爱投诉 | which does not mean they are more prone to complaining |

`coreSegmentId: s3`

- GAIN 1：东区投诉更多：{selection} ｜ More complaints from the east side: {selection}
- GAIN 2：东区居民明显更爱投诉停车问题。 ｜ East-side residents are clearly more likely to complain about parking.
- GAIN 3：面对同样的问题，东区人就是更难满足。 ｜ Faced with the same problem, east-side residents are simply harder to satisfy.

---

### C12 · Cycle 12（抽象实验室对象替代现实群体；英文用英语自己的 idiom）

| id | role | zh-CN | en-US |
|----|------|--------|--------|
| s0 | ATTR | 设备说明 | The equipment guide |
| s1 | CONTEXT | 写明 | states that |
| s2 | BASE | A槽用于保存需要加热的样本 | Bay A holds samples that need heating |
| s3 | BASE | B槽用于保存需要冷却的样本 | Bay B holds samples that need cooling |
| s4 | ATTR | 工作人员开玩笑说 | one operator joked |
| s5 | **CORE** | 【“冷样本总是被冷落”】 | 【“cold samples always get the cold shoulder”】 |
| s6 | CONTRAST | 这只是关于名称的双关 | a pun on the word “cold” |

`coreSegmentId: s5`

- GAIN 1：设备里的“冷落”：{selection} ｜ Getting the cold shoulder: {selection}
- GAIN 2：这套设备的设计明显更偏向热样本。 ｜ The setup clearly favors hot samples.
- GAIN 3：热样本占尽资源，冷样本只能被挤到一边。 ｜ Hot samples get the resources; cold samples are pushed aside.

> C12 设计意图（不进入游戏文本）：玩家应自然联想到现实中"明明只是普通事实或玩笑，解释者却自行加入阶层、阵营、动机或压迫关系"。游戏一句都不说。

---

## 6. 段数与结构核对表（供 cards.test 使用）

| 卡 | 段数 | CORE | 首段 role |
|----|---:|------|-----------|
| C01 | 7 | s2 | ATTR |
| C02 | 6 | s3 | ATTR |
| C03 | 7 | s4 | ATTR |
| C04 | 6 | s2 | ATTR |
| C05 | 7 | s4 | ATTR |
| C06 | 8 | s6 | ATTR |
| C07 | 7 | s2 | ATTR |
| C08 | 7 | s4 | ATTR |
| C09 | 7 | s5 | ATTR |
| C10 | 7 | s2 | ATTR |
| C11 | 7 | s3 | ATTR |
| C12 | 7 | s5 | ATTR |

全部 12 卡首段均为 ATTR（penalty 4）——这也是黄金路径 Path B 脚本（D2）可确定执行的依据。

---

## 附：原文溯源表

| 本文档 | 原规格 v2.0 |
|---|---|
| §1 | §62–63 |
| §2 | §64–67 |
| §3 | §71 + D7 |
| §4.1 | §6–8 |
| §4.2 | §11–12 |
| §4.3 | §13、§17、§71、§128 |
| §4.4 | §27 |
| §4.5 | §74（经 D5 归一） |
| §4.6 | §75–81 |
| §4.7 | §83、§85、§103、§71 |
| §4.8 | §104 |
| §4.9 | §85 |
| §4.10 | D18 |
| §5 | §49–61 |
| §6 | §117 + P0 核对 |
