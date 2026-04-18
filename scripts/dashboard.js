#!/usr/bin/env node
/**
 * Soft Landing — Live Agent Dashboard
 * Run: node scripts/dashboard.js
 * Refreshes every 3 seconds. Ctrl+C to exit.
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const STATUS_FILE = path.join(ROOT, 'docs', 'agent-status.json')
const BUGS_FILE = path.join(ROOT, 'docs', 'bugs.json')
const REFRESH_MS = 3000

// ─── ANSI colours ────────────────────────────────────────────────────────────
const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  // foreground
  white:   '\x1b[97m',
  amber:   '\x1b[33m',
  green:   '\x1b[92m',
  red:     '\x1b[91m',
  blue:    '\x1b[94m',
  cyan:    '\x1b[96m',
  grey:    '\x1b[90m',
  // background
  bgDark:  '\x1b[48;5;235m',
}

const STATUS_COLOR = {
  working:  C.amber,
  done:     C.green,
  blocked:  C.red,
  idle:     C.grey,
  waiting:  C.blue,
}

const STATUS_ICON = {
  working:  '⟳',
  done:     '✓',
  blocked:  '✗',
  idle:     '○',
  waiting:  '…',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function run(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }).trim()
  } catch {
    return ''
  }
}

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) }
  catch { return null }
}

function pad(str, len) {
  const clean = str.replace(/\x1b\[[0-9;]*m/g, '')
  return str + ' '.repeat(Math.max(0, len - clean.length))
}

function timeAgo(isoString) {
  if (!isoString) return 'unknown'
  const diff = Date.now() - new Date(isoString).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)  return `${s}s ago`
  if (s < 3600) return `${Math.floor(s/60)}m ago`
  return `${Math.floor(s/3600)}h ago`
}

function hr(char = '─', len = 72) {
  return C.grey + char.repeat(len) + C.reset
}

// ─── Sections ─────────────────────────────────────────────────────────────────
function renderHeader(phase) {
  const now = new Date().toLocaleTimeString()
  console.log()
  console.log(
    C.bold + C.amber + '  ✦ SOFT LANDING' + C.reset +
    C.grey + '  Agent Dashboard' + C.reset +
    C.dim + `  ${now}` + C.reset
  )
  console.log(C.grey + `  ${phase || 'Unknown phase'}` + C.reset)
  console.log('  ' + hr())
}

function renderAgents(agents) {
  console.log(C.bold + C.white + '\n  AGENTS\n' + C.reset)

  const rows = [
    ['AGENT', 'STATUS', 'CURRENT TASK', 'UPDATED'],
    ...Object.entries(agents).map(([name, info]) => {
      const color = STATUS_COLOR[info.status] || C.grey
      const icon  = STATUS_ICON[info.status]  || '?'
      return [
        C.cyan + name + C.reset,
        color + icon + ' ' + info.status + C.reset,
        C.white + (info.task || '—') + C.reset,
        C.grey + timeAgo(info.lastUpdate) + C.reset,
      ]
    }),
  ]

  const colWidths = [10, 14, 44, 12]
  rows.forEach((row, i) => {
    const line = '  ' + row.map((cell, j) => pad(cell, colWidths[j])).join('  ')
    if (i === 0) console.log(C.dim + line + C.reset)
    else console.log(line)
  })
}

function renderGitLog() {
  const log = run('git log --oneline --no-merges -8 --pretty=format:"%h %s (%an, %ar)"')
  console.log(C.bold + C.white + '\n  RECENT COMMITS\n' + C.reset)
  if (!log) {
    console.log(C.grey + '  No commits yet' + C.reset)
    return
  }
  log.split('\n').forEach(line => {
    const [hash, ...rest] = line.split(' ')
    const msg = rest.join(' ')
    console.log(C.grey + '  ' + C.amber + hash + C.reset + C.grey + '  ' + C.reset + msg)
  })
}

function renderGitStatus() {
  const status = run('git status --short')
  const count  = status ? status.split('\n').filter(Boolean).length : 0
  console.log(C.bold + C.white + '\n  WORKING TREE\n' + C.reset)
  if (!status) {
    console.log(C.grey + '  Clean — nothing uncommitted' + C.reset)
    return
  }
  console.log(C.grey + `  ${count} file(s) with uncommitted changes:\n` + C.reset)
  status.split('\n').slice(0, 10).forEach(line => {
    const flag = line.slice(0, 2).trim()
    const file = line.slice(3)
    const color = flag === 'A' ? C.green : flag === 'M' ? C.amber : flag === '?' ? C.blue : C.red
    console.log('  ' + color + flag + C.reset + C.grey + '  ' + file + C.reset)
  })
  if (count > 10) console.log(C.grey + `  … and ${count - 10} more` + C.reset)
}

function renderBugs() {
  const data = readJSON(BUGS_FILE)
  const bugs = data?.bugs ?? []
  const open     = bugs.filter(b => b.status === 'open').length
  const inProg   = bugs.filter(b => b.status === 'in-progress').length
  const resolved = bugs.filter(b => b.status === 'resolved').length
  const critical = bugs.filter(b => b.severity === 'critical' && b.status !== 'resolved').length

  console.log(C.bold + C.white + '\n  BUGS\n' + C.reset)
  console.log(
    `  Total: ${C.white}${bugs.length}${C.reset}` +
    `  Open: ${open > 0 ? C.red : C.grey}${open}${C.reset}` +
    `  In progress: ${C.amber}${inProg}${C.reset}` +
    `  Resolved: ${C.green}${resolved}${C.reset}` +
    (critical > 0 ? `  ${C.red + C.bold}⚠ ${critical} CRITICAL${C.reset}` : '')
  )

  if (bugs.length > 0) {
    bugs.slice(0, 5).forEach(b => {
      const sc = STATUS_COLOR[b.status] || C.grey
      const sev = b.severity === 'critical' || b.severity === 'high' ? C.red : C.grey
      console.log(
        C.grey + `  ${b.id}` + C.reset +
        `  ${sev}[${b.severity}]${C.reset}` +
        `  ${b.description.slice(0, 50)}` +
        `  ${sc}${b.status}${C.reset}`
      )
    })
  } else {
    console.log(C.grey + '  No bugs logged yet' + C.reset)
  }
}

function renderFooter() {
  console.log('\n  ' + hr())
  console.log(C.grey + `  Refreshing every ${REFRESH_MS / 1000}s  ·  Ctrl+C to exit` + C.reset + '\n')
}

// ─── Main loop ────────────────────────────────────────────────────────────────
function render() {
  const statusData = readJSON(STATUS_FILE)
  process.stdout.write('\x1b[2J\x1b[H') // clear screen, move cursor home

  renderHeader(statusData?.phase)
  renderAgents(statusData?.agents ?? {})
  renderGitLog()
  renderGitStatus()
  renderBugs()
  renderFooter()
}

render()
setInterval(render, REFRESH_MS)
