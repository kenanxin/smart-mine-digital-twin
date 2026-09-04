import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, readFile, readdir } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXPECTED = {
  rowCount: 20000,
  columnCount: 11,
  sha256: '86D4C2FB192721B2745F00076AEB00CF351C654ED936DDB098BFA6217E30AC6A',
};

const REQUIRED_FILES = [
  'competition_submission/00-教师审查快速指南.md',
  'competition_submission/01-总体技术方案报告.docx',
  'competition_submission/02-平台系统设计与智能预警模型研究报告.docx',
  'competition_submission/03-核心算法代码/roof_risk_model.py',
  'competition_submission/04-运行说明/运行环境说明.md',
  'competition_submission/05-演示视频录制说明.md',
  'competition_submission/05-现场演示脚本.md',
  'data/teacher_roof_monitoring.csv',
  'data/roof-risk-dataset.json',
  'docs/api/roof-risk-api-v1.md',
  'supabase/migrations/202609030001_rbac_foundation.sql',
];

const SCANNED_EXTENSIONS = new Set(['.md', '.txt', '.env', '.yaml', '.yml']);
const SKIPPED_DIRS = new Set(['.git', 'node_modules', '.venv-data', '.superpowers']);

export async function inspectCsv(path) {
  const hash = createHash('sha256');
  await new Promise((resolve, reject) => {
    const stream = createReadStream(path);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', resolve);
  });

  const input = createReadStream(path, { encoding: 'utf8' });
  const lines = createInterface({ input, crlfDelay: Infinity });
  let lineCount = 0;
  let columnCount = 0;
  for await (const line of lines) {
    if (lineCount === 0) columnCount = line.replace(/^\uFEFF/, '').split(',').length;
    lineCount += 1;
  }
  return { rowCount: Math.max(0, lineCount - 1), columnCount, sha256: hash.digest('hex').toUpperCase() };
}

export function scanTextForSecrets(text) {
  const findings = [];
  const patterns = [
    { name: 'Supabase Service Role Key', regex: /SUPABASE_SERVICE_ROLE_KEY\s*[=:]\s*(?!your-service-role-key\b)["']?eyJ[A-Za-z0-9._-]{20,}/gi },
    { name: 'Vercel token', regex: /(?:VERCEL_TOKEN|vercel[_ -]?token)\s*[=:]\s*["']?(?!your-)[A-Za-z0-9_-]{20,}/gi },
    { name: 'GitHub token', regex: /\b(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}/g },
    { name: 'Plaintext password', regex: /\b(?:password|密码)\s*[=:：]\s*["']?(?!your-|<|现场|私密)[A-Za-z0-9!@#$%^&*()_+\-=]{10,}/gi },
  ];
  for (const pattern of patterns) {
    if (pattern.regex.test(text)) findings.push(pattern.name);
  }
  return findings;
}

async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIPPED_DIRS.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (SCANNED_EXTENSIONS.has(extname(entry.name).toLowerCase()) || entry.name === '.env') files.push(path);
  }
  return files;
}

async function checkOnline(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    return { ok: response.ok, detail: `HTTP ${response.status}` };
  } catch (error) {
    return { ok: false, detail: error.name === 'AbortError' ? '15 秒超时' : error.message };
  } finally {
    clearTimeout(timer);
  }
}

export async function runPreflight({ online = true } = {}) {
  const failures = [];
  const warnings = [];

  for (const item of REQUIRED_FILES) {
    try { await access(join(ROOT, item)); }
    catch { failures.push(`缺少必需文件：${item}`); }
  }

  const csv = await inspectCsv(join(ROOT, 'data/teacher_roof_monitoring.csv'));
  for (const key of Object.keys(EXPECTED)) {
    if (csv[key] !== EXPECTED[key]) failures.push(`真实 CSV ${key} 不符：${csv[key]}，期望 ${EXPECTED[key]}`);
  }

  const dataset = JSON.parse(await readFile(join(ROOT, 'data/roof-risk-dataset.json'), 'utf8'));
  if (dataset.records?.length !== EXPECTED.rowCount) failures.push(`运行数据记录数不符：${dataset.records?.length}`);
  if (dataset.model?.name !== 'xgboost') failures.push(`模型名称不符：${dataset.model?.name}`);

  for (const file of await walk(ROOT)) {
    const text = await readFile(file, 'utf8');
    const findings = scanTextForSecrets(text);
    if (findings.length) failures.push(`疑似敏感信息：${relative(ROOT, file)} (${findings.join('、')})`);
  }

  if (online) {
    for (const [label, url] of [
      ['Vercel 登录页', 'https://smart-mine-v2-balanced.vercel.app/login'],
      ['Render 健康检查', 'https://smart-mine-v2-balanced.onrender.com/healthz'],
    ]) {
      const result = await checkOnline(url);
      if (!result.ok) warnings.push(`${label}暂不可达：${result.detail}`);
    }
  }

  return { ok: failures.length === 0, failures, warnings, csv };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const online = !process.argv.includes('--offline');
  const result = await runPreflight({ online });
  console.log(`真实数据：${result.csv.rowCount} 行，${result.csv.columnCount} 列，SHA-256 ${result.csv.sha256}`);
  for (const warning of result.warnings) console.warn(`警告：${warning}`);
  for (const failure of result.failures) console.error(`失败：${failure}`);
  console.log(result.ok ? '预检通过。' : `预检失败，共 ${result.failures.length} 项。`);
  process.exitCode = result.ok ? 0 : 1;
}
