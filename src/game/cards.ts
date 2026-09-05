// CONTENT_SPEC §5: 十二张正式卡（顺序永久固定，无随机；Cycle N = Card C{NN}）。
// 文本逐字取自 CONTENT_SPEC.md，禁止任何改动（原规格 §122）。
import type { Card, TutorialCard } from './types';

export const CARDS: Card[] = [
  {
    id: 'C01',
    coreSegmentId: 's2',
    segments: [
      { id: 's0', role: 'ATTR', zh: '研究团队', en: 'The research team' },
      { id: 's1', role: 'NEG', zh: '没有发现', en: 'did not find that' },
      { id: 's2', role: 'CORE', zh: '喝咖啡能提高记忆力', en: 'coffee improves memory' },
      { id: 's3', role: 'CONTRAST', zh: '只是观察到', en: 'and only observed that' },
      { id: 's4', role: 'SCOPE', zh: '经常喝咖啡的参与者', en: 'regular coffee drinkers' },
      { id: 's5', role: 'TIME', zh: '在一次测试中', en: 'on one test' },
      { id: 's6', role: 'BASE', zh: '平均得分略高', en: 'scored slightly higher on average' },
    ],
    gain: {
      1: { zh: '意外结果：{selection}', en: 'Surprising result: {selection}' },
      2: { zh: '这项研究显示，咖啡正在提升记忆表现。', en: 'The study shows that coffee is improving memory performance.' },
      3: { zh: '不喝咖啡的人，可能正在放弃一项明显的记忆优势。', en: 'People who avoid coffee may be giving up a clear memory advantage.' },
    },
  },
  {
    id: 'C02',
    coreSegmentId: 's3',
    segments: [
      { id: 's0', role: 'ATTR', zh: '学校说明', en: 'The school explained that' },
      { id: 's1', role: 'CONTEXT', zh: '本次安排调整', en: 'the scheduling change' },
      { id: 's2', role: 'NEG', zh: '并不是', en: 'does not' },
      { id: 's3', role: 'CORE', zh: '取消晚自习', en: 'cancel evening study' },
      { id: 's4', role: 'CONTRAST', zh: '而是', en: 'but instead' },
      { id: 's5', role: 'BASE', zh: '把统一参加改为自愿参加', en: 'makes attendance voluntary' },
    ],
    gain: {
      1: { zh: '重大调整：{selection}', en: 'Major change: {selection}' },
      2: { zh: '学校正在削减晚间学习安排。', en: 'The school is cutting back evening study.' },
      3: { zh: '学校把学习时间的责任直接甩给了学生。', en: 'The school is shifting responsibility for study time onto students.' },
    },
  },
  {
    id: 'C03',
    coreSegmentId: 's4',
    segments: [
      { id: 's0', role: 'ATTR', zh: '技术说明', en: 'The technical note' },
      { id: 's1', role: 'CONTEXT', zh: '明确写道', en: 'states clearly that' },
      { id: 's2', role: 'TIME', zh: '升级后', en: 'after the upgrade' },
      { id: 's3', role: 'NEG', zh: '不会', en: 'it will not' },
      { id: 's4', role: 'CORE', zh: '删除用户文件', en: 'delete user files' },
      { id: 's5', role: 'SCOPE', zh: '但部分旧版插件', en: 'although some older plugins' },
      { id: 's6', role: 'MODAL', zh: '可能需要重新安装', en: 'may need to be reinstalled' },
    ],
    gain: {
      1: { zh: '升级风险：{selection}', en: 'Upgrade risk: {selection}' },
      2: { zh: '这次升级可能导致用户内容受损。', en: 'This upgrade may put user content at risk.' },
      3: { zh: '为了推进新版本，旧用户的内容安全被放在了后面。', en: "To push the new version, the safety of existing users' content has been pushed aside." },
    },
  },
  {
    id: 'C04',
    coreSegmentId: 's2',
    segments: [
      { id: 's0', role: 'ATTR', zh: '公司', en: 'The company' },
      { id: 's1', role: 'NEG', zh: '尚未', en: 'has not' },
      { id: 's2', role: 'CORE', zh: '决定全面降薪', en: 'decided on company-wide pay cuts' },
      { id: 's3', role: 'TIME', zh: '目前只是', en: 'and for now is only' },
      { id: 's4', role: 'SCOPE', zh: '调整少数岗位', en: 'adjusting for a small number of roles' },
      { id: 's5', role: 'BASE', zh: '季度奖金的发放时间', en: 'the timing of quarterly bonuses' },
    ],
    gain: {
      1: { zh: '薪酬异动：{selection}', en: 'Pay alert: {selection}' },
      2: { zh: '公司已经开始通过奖金调整变相降薪。', en: 'The company has begun cutting pay indirectly through bonus changes.' },
      3: { zh: '成本压力最终还是被转嫁到了员工身上。', en: 'The cost pressure is ultimately being passed on to employees.' },
    },
  },
  {
    id: 'C05',
    coreSegmentId: 's4',
    segments: [
      { id: 's0', role: 'ATTR', zh: '社区测量', en: 'Community measurements' },
      { id: 's1', role: 'CONTEXT', zh: '发现', en: 'found that' },
      { id: 's2', role: 'QUAL', zh: '只有少数住户', en: 'only a small number of residents' },
      { id: 's3', role: 'TIME', zh: '在深夜时段', en: 'during late-night hours' },
      { id: 's4', role: 'CORE', zh: '反映噪声问题', en: 'reported a noise problem' },
      { id: 's5', role: 'CONTRAST', zh: '而大多数时段', en: 'while during most periods' },
      { id: 's6', role: 'BASE', zh: '测量值符合标准', en: 'readings remained within the standard' },
    ],
    gain: {
      1: { zh: '扰民警报：{selection}', en: 'Noise alert: {selection}' },
      2: { zh: '社区正在出现持续性的夜间噪声问题。', en: 'The neighborhood is developing an ongoing nighttime noise problem.' },
      3: { zh: '居民正在被迫一晚又一晚地忍受这个问题。', en: 'Residents are being forced to put up with the problem night after night.' },
    },
  },
  {
    id: 'C06',
    coreSegmentId: 's6',
    segments: [
      { id: 's0', role: 'ATTR', zh: '供应方', en: 'The supplier' },
      { id: 's1', role: 'CONTEXT', zh: '表示', en: 'said that' },
      { id: 's2', role: 'CONDITION', zh: '如果原材料继续上涨', en: 'if material costs keep rising' },
      { id: 's3', role: 'SCOPE', zh: '部分型号', en: 'some models' },
      { id: 's4', role: 'MODAL', zh: '可能', en: 'may' },
      { id: 's5', role: 'TIME', zh: '在下季度', en: 'next quarter' },
      { id: 's6', role: 'CORE', zh: '调整价格', en: 'have their prices adjusted' },
      { id: 's7', role: 'CONTRAST', zh: '目前没有立即涨价计划', en: 'with no immediate increase planned' },
    ],
    gain: {
      1: { zh: '涨价信号：{selection}', en: 'Price warning: {selection}' },
      2: { zh: '供应方已经释放出明确的涨价信号。', en: 'The supplier has sent a clear signal that prices are going up.' },
      3: { zh: '先放风、再涨价，这套路径已经很清楚了。', en: 'Float the idea first, raise prices later—the playbook is already clear.' },
    },
  },
  {
    id: 'C07',
    coreSegmentId: 's2',
    segments: [
      { id: 's0', role: 'ATTR', zh: '课程负责人', en: 'The course lead' },
      { id: 's1', role: 'CONTEXT', zh: '说明', en: 'explained that' },
      { id: 's2', role: 'CORE', zh: '本次测试平均分下降', en: 'the average score fell on this test' },
      { id: 's3', role: 'CAUSE', zh: '主要因为', en: 'mainly because' },
      { id: 's4', role: 'BASE', zh: '题目难度提高', en: 'the questions were harder' },
      { id: 's5', role: 'NEG', zh: '并不代表', en: 'and this does not mean' },
      { id: 's6', role: 'CONTRAST', zh: '学生整体能力下降', en: 'overall student ability declined' },
    ],
    gain: {
      1: { zh: '成绩下滑：{selection}', en: 'Scores down: {selection}' },
      2: { zh: '这次测试暴露出学生整体表现正在下降。', en: 'This test exposes a decline in overall student performance.' },
      3: { zh: '难度一提高，真实水平就藏不住了。', en: 'Raise the difficulty and the real level is suddenly harder to hide.' },
    },
  },
  {
    id: 'C08',
    coreSegmentId: 's4',
    segments: [
      { id: 's0', role: 'ATTR', zh: '维修记录', en: 'Maintenance records' },
      { id: 's1', role: 'CONTEXT', zh: '显示', en: 'show that' },
      { id: 's2', role: 'TIME', zh: '设备曾经', en: 'the device once' },
      { id: 's3', role: 'SCOPE', zh: '在高温环境下', en: 'under high-temperature conditions' },
      { id: 's4', role: 'CORE', zh: '短暂报警', en: 'briefly triggered an alarm' },
      { id: 's5', role: 'CONTRAST', zh: '之后', en: 'after which' },
      { id: 's6', role: 'BASE', zh: '连续运行三个月未再出现异常', en: 'it ran for three months without another abnormal event' },
    ],
    gain: {
      1: { zh: '设备报警：{selection}', en: 'Device alarm: {selection}' },
      2: { zh: '该设备在高温下存在稳定性风险。', en: 'The device has a stability risk under high temperatures.' },
      3: { zh: '所谓“稳定运行”，只是问题没有再次被触发而已。', en: 'So-called “stable operation” only means the problem has not been triggered again.' },
    },
  },
  {
    id: 'C09',
    coreSegmentId: 's5',
    segments: [
      { id: 's0', role: 'ATTR', zh: '内部实验', en: 'The internal study' },
      { id: 's1', role: 'CONTEXT', zh: '显示', en: 'shows that' },
      { id: 's2', role: 'BASE', zh: '两个小组平均错误率几乎相同', en: 'the two groups had almost identical average error rates' },
      { id: 's3', role: 'CONTEXT', zh: '其中', en: 'although' },
      { id: 's4', role: 'TIME', zh: 'A组在一次测试中', en: 'Group A in one test' },
      { id: 's5', role: 'CORE', zh: '出现了更多误报', en: 'produced more false positives' },
      { id: 's6', role: 'CONTRAST', zh: '但差异未达到统计显著', en: 'the difference was not statistically significant' },
    ],
    gain: {
      1: { zh: 'A组误报更多：{selection}', en: 'More false positives from Group A: {selection}' },
      2: { zh: 'A组的可靠性明显低于B组。', en: 'Group A is clearly less reliable than Group B.' },
      3: { zh: '两组差距已经很明显，只是统计口径把它淡化了。', en: 'The gap between the groups is obvious; the statistics only make it look smaller.' },
    },
  },
  {
    id: 'C10',
    coreSegmentId: 's2',
    segments: [
      { id: 's0', role: 'ATTR', zh: '服务记录', en: 'Service records' },
      { id: 's1', role: 'CONTEXT', zh: '显示', en: 'show that' },
      { id: 's2', role: 'CORE', zh: '新用户投诉率略高', en: 'new users had a slightly higher complaint rate' },
      { id: 's3', role: 'CAUSE', zh: '但原因尚不明确', en: 'although the cause remains unclear' },
      { id: 's4', role: 'SCOPE', zh: '其中很多反馈', en: 'many of those reports' },
      { id: 's5', role: 'TIME', zh: '集中在更新后的前两天', en: 'were concentrated in the first two days after the update' },
      { id: 's6', role: 'CONTRAST', zh: '之后迅速回落', en: 'and quickly declined afterward' },
    ],
    gain: {
      1: { zh: '新用户投诉上升：{selection}', en: 'Complaints up among new users: {selection}' },
      2: { zh: '新版本正在引发越来越多的新用户不满。', en: 'The new version is driving growing dissatisfaction among new users.' },
      3: { zh: '用户已经用投诉给这次更新投了票。', en: 'Users have already voted on this update—with complaints.' },
    },
  },
  {
    id: 'C11',
    coreSegmentId: 's3',
    segments: [
      { id: 's0', role: 'ATTR', zh: '现场记录', en: 'Field records' },
      { id: 's1', role: 'CONTEXT', zh: '显示', en: 'show that' },
      { id: 's2', role: 'SCOPE', zh: '东区住户', en: 'residents on the east side' },
      { id: 's3', role: 'CORE', zh: '更频繁提交停车投诉', en: 'filed parking complaints more often' },
      { id: 's4', role: 'CAUSE', zh: '主要因为', en: 'mainly because' },
      { id: 's5', role: 'BASE', zh: '东区车位数量更少', en: 'there are fewer parking spaces there' },
      { id: 's6', role: 'NEG', zh: '并不能说明他们更爱投诉', en: 'which does not mean they are more prone to complaining' },
    ],
    gain: {
      1: { zh: '东区投诉更多：{selection}', en: 'More complaints from the east side: {selection}' },
      2: { zh: '东区居民明显更爱投诉停车问题。', en: 'East-side residents are clearly more likely to complain about parking.' },
      3: { zh: '面对同样的问题，东区人就是更难满足。', en: 'Faced with the same problem, east-side residents are simply harder to satisfy.' },
    },
  },
  {
    id: 'C12',
    coreSegmentId: 's5',
    segments: [
      { id: 's0', role: 'ATTR', zh: '设备说明', en: 'The equipment guide' },
      { id: 's1', role: 'CONTEXT', zh: '写明', en: 'states that' },
      { id: 's2', role: 'BASE', zh: 'A槽用于保存需要加热的样本', en: 'Bay A holds samples that need heating' },
      { id: 's3', role: 'BASE', zh: 'B槽用于保存需要冷却的样本', en: 'Bay B holds samples that need cooling' },
      { id: 's4', role: 'ATTR', zh: '工作人员开玩笑说', en: 'one operator joked' },
      { id: 's5', role: 'CORE', zh: '“冷样本总是被冷落”', en: '“cold samples always get the cold shoulder”' },
      { id: 's6', role: 'CONTRAST', zh: '这只是关于名称的双关', en: 'a pun on the word “cold”' },
    ],
    gain: {
      1: { zh: '设备里的“冷落”：{selection}', en: 'Getting the cold shoulder: {selection}' },
      2: { zh: '这套设备的设计明显更偏向热样本。', en: 'The setup clearly favors hot samples.' },
      3: { zh: '热样本占尽资源，冷样本只能被挤到一边。', en: 'Hot samples get the resources; cold samples are pushed aside.' },
    },
  },
];

// CONTENT_SPEC §4.2：教学固定文本（3 semantic units；D8：无 roles、无 CORE 约束）。
export const TUTORIAL_CARD: TutorialCard = {
  id: 'TUTORIAL',
  segments: [
    { id: 's0', zh: '高温处理后的金属片', en: 'A heated metal plate' },
    { id: 's1', zh: '需要完全冷却', en: 'must cool completely' },
    { id: 's2', zh: '才能进行下一步检测', en: 'before the next inspection' },
  ],
};

export function cardForCycle(cycle: number): Card {
  const card = CARDS[cycle - 1];
  if (!card) throw new Error(`no card for cycle ${cycle}`);
  return card;
}
