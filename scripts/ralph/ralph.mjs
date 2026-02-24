#!/usr/bin/env node
/**
 * Ralph - Autonomous AI agent loop
 * Cross-platform Node.js version (works in PowerShell, CMD, Git Bash)
 * Usage: node scripts/ralph/ralph.mjs [--tool claude|amp] [max_iterations]
 */

import { spawnSync } from 'child_process';
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  copyFileSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Parse arguments ──────────────────────────────────────────────────────────
let tool = 'claude';
let maxIterations = 10;

for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === '--tool' && process.argv[i + 1]) {
    tool = process.argv[++i];
  } else if (arg.startsWith('--tool=')) {
    tool = arg.split('=')[1];
  } else if (/^\d+$/.test(arg)) {
    maxIterations = parseInt(arg, 10);
  }
}

if (tool !== 'claude' && tool !== 'amp') {
  console.error(`Error: Invalid tool '${tool}'. Must be 'amp' or 'claude'.`);
  process.exit(1);
}

// ── File paths ────────────────────────────────────────────────────────────────
const PRD_FILE      = join(__dirname, 'prd.json');
const PROGRESS_FILE = join(__dirname, 'progress.txt');
const ARCHIVE_DIR   = join(__dirname, 'archive');
const LAST_BRANCH   = join(__dirname, '.last-branch');
const PROMPT_FILE   = tool === 'claude'
  ? join(__dirname, 'CLAUDE.md')
  : join(__dirname, 'prompt.md');

// ── Helpers ───────────────────────────────────────────────────────────────────
function readJSON(file) {
  try { return JSON.parse(readFileSync(file, 'utf8')); }
  catch { return null; }
}

function remainingStories(prd) {
  if (!prd?.userStories) return 1;
  return prd.userStories.filter(s => !s.passes).length;
}

function archivePreviousRun() {
  if (!existsSync(PRD_FILE) || !existsSync(LAST_BRANCH)) return;

  const prd = readJSON(PRD_FILE);
  const currentBranch = prd?.branchName ?? '';
  const lastBranch = readFileSync(LAST_BRANCH, 'utf8').trim();

  if (currentBranch && lastBranch && currentBranch !== lastBranch) {
    const date = new Date().toISOString().slice(0, 10);
    const folderName = lastBranch.replace(/^ralph\//, '');
    const archiveFolder = join(ARCHIVE_DIR, `${date}-${folderName}`);

    console.log(`Archiving previous run: ${lastBranch}`);
    mkdirSync(archiveFolder, { recursive: true });
    if (existsSync(PRD_FILE))      copyFileSync(PRD_FILE,      join(archiveFolder, 'prd.json'));
    if (existsSync(PROGRESS_FILE)) copyFileSync(PROGRESS_FILE, join(archiveFolder, 'progress.txt'));
    console.log(` Archived to: ${archiveFolder}`);

    // Reset progress for new run
    writeFileSync(PROGRESS_FILE,
      `# Ralph Progress Log\nStarted: ${new Date().toISOString()}\n---\n`
    );
  }
}

function initProgress() {
  if (!existsSync(PROGRESS_FILE)) {
    writeFileSync(PROGRESS_FILE,
      `# Ralph Progress Log\nStarted: ${new Date().toISOString()}\n---\n`
    );
  }
}

function trackBranch() {
  const prd = readJSON(PRD_FILE);
  const branch = prd?.branchName;
  if (branch) writeFileSync(LAST_BRANCH, branch);
}

function runTool() {
  if (!existsSync(PROMPT_FILE)) {
    console.error(`Error: Prompt file not found: ${PROMPT_FILE}`);
    process.exit(1);
  }

  const promptContent = readFileSync(PROMPT_FILE, 'utf8');

  if (tool === 'amp') {
    // Amp CLI
    const result = spawnSync('amp', ['--dangerously-allow-all'], {
      shell: true,
      input: promptContent,
      stdio: ['pipe', 'inherit', 'inherit'],
      encoding: 'utf8',
    });
    if (result.error) console.error('amp error:', result.error.message);
  } else {
    // Claude Code CLI - pipe prompt via stdin, inherit stdout/stderr so output
    // streams directly to the terminal in real time.
    const result = spawnSync('claude', ['--dangerously-skip-permissions', '--print'], {
      shell: true,
      input: promptContent,
      stdio: ['pipe', 'inherit', 'inherit'],
      encoding: 'utf8',
    });
    if (result.error) {
      console.error('claude error:', result.error.message);
      console.error('Make sure Claude Code CLI is installed: npm install -g @anthropic-ai/claude-code');
    }
  }
}

// ── Main loop ─────────────────────────────────────────────────────────────────
archivePreviousRun();
trackBranch();
initProgress();

console.log(`\nStarting Ralph — Tool: ${tool} — Max iterations: ${maxIterations}`);
console.log(`PRD: ${PRD_FILE}`);

const prd = readJSON(PRD_FILE);
if (!prd) {
  console.error(`Error: Could not read ${PRD_FILE}`);
  console.error('Make sure prd.json exists in scripts/ralph/');
  process.exit(1);
}

const totalStories = prd.userStories?.length ?? 0;
console.log(`Stories: ${totalStories} total, ${remainingStories(prd)} remaining\n`);

for (let i = 1; i <= maxIterations; i++) {
  console.log('');
  console.log('===============================================================');
  console.log(` Ralph Iteration ${i} of ${maxIterations} (${tool})`);
  console.log('===============================================================');

  runTool();

  // Check completion by reading prd.json (more reliable than parsing CLI output)
  const updatedPrd = readJSON(PRD_FILE);
  const remaining = remainingStories(updatedPrd);

  if (remaining === 0) {
    console.log('\n✅ Ralph completed all tasks!');
    console.log(`Completed at iteration ${i} of ${maxIterations}`);
    process.exit(0);
  }

  console.log(`\nIteration ${i} complete. Remaining stories: ${remaining}`);
  console.log('Continuing in 2 seconds...');

  // Small delay between iterations
  spawnSync('node', ['-e', 'setTimeout(()=>{},2000)'], { shell: true, stdio: 'inherit' });
}

console.log(`\nRalph reached max iterations (${maxIterations}) without completing all tasks.`);
console.log(`Check ${PROGRESS_FILE} for status.`);
process.exit(1);
