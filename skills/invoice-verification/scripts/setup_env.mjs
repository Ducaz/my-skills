// 环境一键初始化（发票查验技能）
// 用法: node setup_env.mjs [工作目录]
// 功能:
//   1. 在 node workspace 安装 playwright 并下载 chromium
//   2. 创建 python venv 并安装 flask / opencv-python / numpy / ddddocr（OCR 服务依赖）
// 幂等：重复运行安全，已安装的会跳过。
import { execSync, spawnSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import os from 'os';
import { createRequire } from 'module';

const HOME = os.homedir();
const NODE_WS = path.join(HOME, '.workbuddy/binaries/node/workspace');
const PY_BASE = path.join(HOME, '.workbuddy/binaries/python/versions');
const VENV = path.join(HOME, '.workbuddy/binaries/python/envs/invoice-ocr');

function run(cmd, opts = {}) {
  console.log('$', cmd);
  try {
    execSync(cmd, { stdio: 'inherit', ...opts });
    return true;
  } catch (e) {
    console.error('  失败:', e.message.split('\n')[0]);
    return false;
  }
}

function findNode() {
  // 优先受管 node
  const managed = path.join(HOME, '.workbuddy/binaries/node');
  if (existsSync(managed)) {
    try {
      const out = execSync(`ls "${managed}/versions"`, { encoding: 'utf-8' }).trim().split('\n').sort().reverse();
      if (out[0]) return path.join(managed, 'versions', out[0], process.platform === 'win32' ? 'node.exe' : 'node');
    } catch (e) {}
  }
  return 'node';
}
function findPython() {
  if (existsSync(PY_BASE)) {
    try {
      const out = execSync(`ls "${PY_BASE}"`, { encoding: 'utf-8' }).trim().split('\n').sort().reverse();
      if (out[0]) return path.join(PY_BASE, out[0], process.platform === 'win32' ? 'python.exe' : 'python3');
    } catch (e) {}
  }
  return process.platform === 'win32' ? 'python' : 'python3';
}

const node = findNode();
const python = findPython();
console.log('node   :', node);
console.log('python :', python);

// ---- 1. playwright + chromium ----
mkdirSync(NODE_WS, { recursive: true });
const pwDir = path.join(NODE_WS, 'node_modules/playwright');
if (existsSync(pwDir)) {
  console.log('\n[1/2] playwright 已安装，跳过');
} else {
  console.log('\n[1/2] 安装 playwright（可能需数分钟）...');
  run('npm install playwright --no-audit --no-fund', { cwd: NODE_WS });
}
// chromium 浏览器（LOCALAPPDATA/ms-playwright 已有则跳过）
console.log('确保 chromium 已下载...');
const cli = path.join(path.dirname(createRequire(path.join(NODE_WS, 'noop.js')).resolve('playwright/package.json')), 'cli.js');
if (!run(`"${node}" "${cli}" install chromium`, { timeout: 20 * 60 * 1000 })) process.exit(1);
// Module presence does not prove that the matching headless browser is installed.
const { chromium } = createRequire(path.join(NODE_WS, 'noop.js'))('playwright');
const browser = await chromium.launch({ headless: true });
await browser.close();

// ---- 2. python venv + OCR 依赖 ----
console.log('\n[2/2] Python OCR 环境...');
if (!existsSync(VENV)) {
  console.log('创建 venv:', VENV);
  run(`"${python}" -m venv "${VENV}"`);
}
const pip = path.join(VENV, process.platform === 'win32' ? 'Scripts/pip.exe' : 'bin/pip');
const pybin = path.join(VENV, process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
if (!run(`"${pybin}" -m pip install --upgrade pip`)) process.exit(1);
if (!run(`"${pybin}" -m pip install flask numpy opencv-python ddddocr`)) process.exit(1);

console.log('\n========== 环境就绪 ==========');
console.log('启动 OCR 服务:');
console.log(`  "${pybin}" scripts/ocr_server.py`);
console.log('运行查验:');
console.log(`  "${node}" scripts/check.mjs <工作目录>`);
