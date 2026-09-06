#!/usr/bin/env node
// 一次性 CI 修复编排：推送修复 → 触发 update-baselines → 等待 Linux 基线提交 → 重跑 CI → 确认绿灯。
// 网络间歇窗口内自动重试；任一步失败按间隔重试，直到全链路完成。
import { execFileSync, spawnSync } from 'node:child_process';

const REPO = 'Rethymus/context-furnace';
const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function sh(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { encoding: 'utf8', ...opts });
}

async function retryUntil(label, fn, check, maxMin = 40) {
  const deadline = Date.now() + maxMin * 60_000;
  let attempt = 0;
  while (Date.now() < deadline) {
    attempt++;
    try {
      const out = fn();
      if (check(out)) {
        log(`${label}: OK (attempt ${attempt})`);
        return out;
      }
      log(`${label}: attempt ${attempt} not ready`);
    } catch (e) {
      log(`${label}: attempt ${attempt} error: ${String(e.stdout || e.message).slice(0, 120)}`);
    }
    await sleep(45_000);
  }
  throw new Error(`${label}: deadline exceeded`);
}

// 1) 推送本地修复提交
await retryUntil(
  'git push',
  () => sh('git', ['push', '-q', 'origin', 'main']),
  (o) => o.status === 0,
);
await retryUntil(
  'fetch reflects',
  () => sh('git', ['fetch', '-q', 'origin']),
  () => sh('git', ['rev-parse', 'origin/main']).stdout.trim() === sh('git', ['rev-parse', 'main']).stdout.trim(),
);

// 2) 触发 Linux 基线 workflow（workflow_dispatch）
await retryUntil(
  'dispatch update-baselines',
  () => sh('gh', ['workflow', 'run', 'update-baselines.yml', '--ref', 'main']),
  (o) => o.status === 0,
);
await sleep(30_000);

// 3) 等待该 workflow 完成
let runId = null;
await retryUntil(
  'locate workflow run',
  () => sh('gh', ['api', `repos/${REPO}/actions/workflows/update-baselines.yml/runs?per_page=1`]),
  (o) => {
    if (o.status !== 0) return false;
    const run = JSON.parse(o.stdout).workflow_runs[0];
    if (run && Date.now() - Date.parse(run.created_at) < 20 * 60_000) {
      runId = run.id;
      return true;
    }
    return false;
  },
);
await retryUntil(
  'workflow completes',
  () => sh('gh', ['api', `repos/${REPO}/actions/runs/${runId}`]),
  (o) => {
    if (o.status !== 0) return false;
    const run = JSON.parse(o.stdout);
    if (run.status === 'completed') {
      if (run.conclusion !== 'success') throw new Error('update-baselines concluded: ' + run.conclusion);
      return true;
    }
    return false;
  },
  60,
);

// 4) 拉回基线提交
await retryUntil(
  'pull linux baselines',
  () => sh('git', ['pull', '-q', '--rebase', 'origin', 'main']),
  (o) => o.status === 0,
);

// 5) 重跑失败的 CI
await retryUntil(
  'rerun CI',
  () => sh('gh', ['run', 'rerun', '34002646199', '--failed']),
  (o) => o.status === 0,
);
await retryUntil(
  'CI completes',
  () => sh('gh', ['api', `repos/${REPO}/actions/runs/34002646199`]),
  (o) => {
    if (o.status !== 0) return false;
    const run = JSON.parse(o.stdout);
    if (run.status === 'completed') {
      log('CI conclusion: ' + run.conclusion);
      return run.conclusion === 'success';
    }
    return false;
  },
  60,
);

log('ALL DONE: CI green.');
