#!/usr/bin/env node
/**
 * Soft Landing — Web Dashboard Server
 * Run: node scripts/dashboard-server.js
 * Open: http://localhost:3131
 */

const http    = require('http')
const fs      = require('fs')
const path    = require('path')
const { execSync } = require('child_process')

const PORT    = 3131
const ROOT    = path.resolve(__dirname, '..')

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) }
  catch { return null }
}

function git(cmd) {
  try { return execSync(`git -C "${ROOT}" ${cmd}`, { encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }).trim() }
  catch { return '' }
}

function getStatus() {
  const agentStatus = readJSON(path.join(ROOT, 'docs', 'agent-status.json'))
  const bugsData    = readJSON(path.join(ROOT, 'docs', 'bugs.json'))
  const bugs        = bugsData?.bugs ?? []

  const rawLog = git('log --oneline --no-merges -12 --pretty=format:{"hash":"%h","message":"%s","author":"%an","time":"%ar"}')
  const commits = rawLog
    ? rawLog.split('\n').map(line => { try { return JSON.parse(line) } catch { return null } }).filter(Boolean)
    : []

  const rawStatus = git('status --short')
  const changed = rawStatus
    ? rawStatus.split('\n').filter(Boolean).map(line => ({ flag: line.slice(0,2).trim(), file: line.slice(3) }))
    : []

  const branch = git('rev-parse --abbrev-ref HEAD') || 'master'
  const commitCount = git('rev-list --count HEAD 2>/dev/null') || '0'

  return {
    phase:      agentStatus?.phase ?? 'Initializing',
    agents:     agentStatus?.agents ?? {},
    commits,
    changed,
    branch,
    commitCount,
    bugs: {
      all:      bugs,
      open:     bugs.filter(b => b.status === 'open').length,
      inProg:   bugs.filter(b => b.status === 'in-progress').length,
      resolved: bugs.filter(b => b.status === 'resolved').length,
      critical: bugs.filter(b => b.severity === 'critical' && b.status !== 'resolved').length,
    },
    timestamp: new Date().toISOString(),
  }
}

const HTML = /* html */`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Soft Landing — Dashboard</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:        #FAF8F5;
      --surface:   #FFFFFF;
      --border:    #E8E3DC;
      --text:      #1A1A1A;
      --muted:     #6B6B6B;
      --accent:    #C4956A;
      --accent-lt: #F5EBE0;
      --green:     #5A9E6F;
      --green-lt:  #EAF5ED;
      --red:       #C0554A;
      --red-lt:    #FAEAE8;
      --amber:     #C4956A;
      --amber-lt:  #FBF3E8;
      --blue:      #4A7FA5;
      --blue-lt:   #E8F1F8;
      --grey:      #9E9E9E;
      --grey-lt:   #F5F5F5;
      --radius:    12px;
      --shadow:    0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.04);
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg);
      color: var(--text);
      font-size: 14px;
      line-height: 1.5;
      min-height: 100vh;
    }

    /* ── Header ── */
    header {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 18px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .logo { display: flex; align-items: center; gap: 10px; }
    .logo-mark {
      width: 32px; height: 32px; border-radius: 8px;
      background: var(--accent); display: grid; place-items: center;
      color: white; font-size: 16px;
    }
    .logo-text { font-weight: 600; font-size: 15px; }
    .logo-sub  { font-size: 12px; color: var(--muted); font-weight: 400; }
    .header-right { display: flex; align-items: center; gap: 16px; }
    .phase-tag {
      background: var(--accent-lt); color: var(--accent);
      padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500;
    }
    .pulse-wrap { display: flex; align-items: center; gap: 6px; color: var(--muted); font-size: 12px; }
    .pulse {
      width: 7px; height: 7px; border-radius: 50%; background: var(--green);
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse { 0%,100%{ opacity:1; transform:scale(1); } 50%{ opacity:.5; transform:scale(.8); } }

    /* ── Layout ── */
    main { padding: 28px 32px; display: grid; gap: 24px; max-width: 1400px; margin: 0 auto; }

    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    @media (max-width: 1000px) { .grid-2 { grid-template-columns: 1fr; } }
    @media (max-width: 700px)  { .grid-3 { grid-template-columns: 1fr 1fr; } }

    /* ── Card ── */
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      overflow: hidden;
    }
    .card-header {
      padding: 16px 20px 12px;
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
    }
    .card-title { font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); }
    .card-body  { padding: 20px; }

    /* ── Stat cards ── */
    .stat-card { padding: 20px; }
    .stat-value { font-size: 32px; font-weight: 700; line-height: 1; margin-bottom: 4px; }
    .stat-label { font-size: 12px; color: var(--muted); }

    /* ── Agent grid ── */
    .agents-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
    .agent-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 18px 20px;
      display: flex; flex-direction: column; gap: 10px;
      box-shadow: var(--shadow);
      transition: border-color .2s;
    }
    .agent-card.working { border-left: 3px solid var(--amber); }
    .agent-card.done    { border-left: 3px solid var(--green); }
    .agent-card.blocked { border-left: 3px solid var(--red); }
    .agent-card.idle    { border-left: 3px solid var(--grey); }
    .agent-card.waiting { border-left: 3px solid var(--blue); }

    .agent-head { display: flex; align-items: center; justify-content: space-between; }
    .agent-name { font-weight: 600; font-size: 15px; }
    .status-badge {
      font-size: 11px; font-weight: 500; padding: 3px 9px; border-radius: 20px;
      display: flex; align-items: center; gap: 4px;
    }
    .status-badge.working { background: var(--amber-lt); color: var(--amber); }
    .status-badge.done    { background: var(--green-lt);  color: var(--green); }
    .status-badge.blocked { background: var(--red-lt);    color: var(--red); }
    .status-badge.idle    { background: var(--grey-lt);   color: var(--grey); }
    .status-badge.waiting { background: var(--blue-lt);   color: var(--blue); }

    .spinning { display: inline-block; animation: spin 1.2s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .agent-task { font-size: 13px; color: var(--muted); }
    .agent-time { font-size: 11px; color: var(--grey); }

    /* ── Commit list ── */
    .commit-list { list-style: none; display: flex; flex-direction: column; gap: 0; }
    .commit-item {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 10px 0; border-bottom: 1px solid var(--bg);
    }
    .commit-item:last-child { border-bottom: none; }
    .commit-hash {
      font-family: 'SF Mono', 'Fira Code', monospace; font-size: 11px;
      color: var(--accent); background: var(--accent-lt);
      padding: 2px 6px; border-radius: 4px; flex-shrink: 0; margin-top: 2px;
    }
    .commit-body { flex: 1; }
    .commit-msg  { font-size: 13px; color: var(--text); }
    .commit-meta { font-size: 11px; color: var(--grey); margin-top: 2px; }

    /* ── File list ── */
    .file-list { list-style: none; display: flex; flex-direction: column; gap: 6px; }
    .file-item { display: flex; align-items: center; gap: 10px; font-size: 13px; }
    .file-flag {
      font-family: monospace; font-size: 11px; font-weight: 700;
      width: 22px; height: 20px; border-radius: 4px;
      display: grid; place-items: center; flex-shrink: 0;
    }
    .file-flag.A { background: var(--green-lt); color: var(--green); }
    .file-flag.M { background: var(--amber-lt); color: var(--amber); }
    .file-flag.D { background: var(--red-lt);   color: var(--red); }
    .file-flag.Q { background: var(--blue-lt);  color: var(--blue); }
    .file-name   { color: var(--muted); font-family: monospace; font-size: 12px; }

    /* ── Bug list ── */
    .bug-list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
    .bug-item {
      display: grid; grid-template-columns: auto auto 1fr auto;
      align-items: center; gap: 10px; font-size: 13px;
      padding: 10px 12px; border-radius: 8px; background: var(--bg);
    }
    .bug-id   { font-family: monospace; font-size: 11px; color: var(--muted); }
    .sev-badge { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 20px; }
    .sev-badge.critical { background: var(--red-lt);    color: var(--red); }
    .sev-badge.high     { background: #FFF0E8;           color: #C06030; }
    .sev-badge.medium   { background: var(--amber-lt);  color: var(--amber); }
    .sev-badge.low      { background: var(--grey-lt);   color: var(--grey); }
    .bug-desc { color: var(--text); }
    .bug-status { font-size: 11px; color: var(--grey); text-align: right; }

    .empty { color: var(--grey); font-size: 13px; text-align: center; padding: 24px 0; }

    /* ── Branch bar ── */
    .branch-bar {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 20px; background: var(--bg); border-top: 1px solid var(--border);
      font-size: 12px; color: var(--muted);
    }
    .branch-pill {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 20px; padding: 2px 10px; font-family: monospace;
      font-size: 11px; color: var(--text);
    }

    /* ── Updated indicator ── */
    .updated { font-size: 11px; color: var(--grey); }
    .flash { animation: flash .5s ease; }
    @keyframes flash { 0%{ background: var(--accent-lt); } 100%{ background: transparent; } }
  </style>
</head>
<body>

<header>
  <div class="logo">
    <div class="logo-mark">✦</div>
    <div>
      <div class="logo-text">Soft Landing</div>
      <div class="logo-sub">Agent Dashboard</div>
    </div>
  </div>
  <div class="header-right">
    <span class="phase-tag" id="phase">Loading…</span>
    <div class="pulse-wrap">
      <span class="pulse"></span>
      <span id="last-updated">—</span>
    </div>
  </div>
</header>

<main>

  <!-- Stat row -->
  <div class="grid-3" id="stat-row">
    <div class="card stat-card">
      <div class="stat-value" id="stat-commits" style="color:var(--accent)">—</div>
      <div class="stat-label">Total commits</div>
    </div>
    <div class="card stat-card">
      <div class="stat-value" id="stat-changed" style="color:var(--blue)">—</div>
      <div class="stat-label">Files changed</div>
    </div>
    <div class="card stat-card">
      <div class="stat-value" id="stat-bugs" style="color:var(--red)">—</div>
      <div class="stat-label">Open bugs</div>
    </div>
  </div>

  <!-- Agents -->
  <div class="card">
    <div class="card-header">
      <span class="card-title">Agents</span>
      <span class="updated" id="agents-updated"></span>
    </div>
    <div class="card-body">
      <div class="agents-grid" id="agents-grid">
        <div class="empty">Waiting for agent data…</div>
      </div>
    </div>
  </div>

  <!-- Commits + Working tree -->
  <div class="grid-2">
    <div class="card">
      <div class="card-header">
        <span class="card-title">Recent Commits</span>
        <span class="branch-pill" id="branch-name">—</span>
      </div>
      <div class="card-body">
        <ul class="commit-list" id="commit-list">
          <li class="empty">No commits yet</li>
        </ul>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Working Tree</span>
        <span class="updated" id="tree-count"></span>
      </div>
      <div class="card-body">
        <ul class="file-list" id="file-list">
          <li class="empty">Clean — nothing uncommitted</li>
        </ul>
      </div>
    </div>
  </div>

  <!-- Bugs -->
  <div class="card">
    <div class="card-header">
      <span class="card-title">Bug Tracker</span>
      <span class="updated" id="bug-summary"></span>
    </div>
    <div class="card-body">
      <ul class="bug-list" id="bug-list">
        <li class="empty">No bugs logged yet</li>
      </ul>
    </div>
  </div>

</main>

<script>
  const STATUS_ICON = { working: '↻', done: '✓', blocked: '✗', idle: '○', waiting: '…' }

  function timeAgo(iso) {
    if (!iso) return '—'
    const s = Math.floor((Date.now() - new Date(iso)) / 1000)
    if (s < 60)   return s + 's ago'
    if (s < 3600) return Math.floor(s/60) + 'm ago'
    return Math.floor(s/3600) + 'h ago'
  }

  function flag(f) {
    const map = { A:'A', M:'M', D:'D', '?':'?' }
    return map[f] || f
  }

  function render(d) {
    // Header
    document.getElementById('phase').textContent = d.phase
    document.getElementById('last-updated').textContent = 'Updated ' + timeAgo(d.timestamp)

    // Stats
    document.getElementById('stat-commits').textContent = d.commitCount
    document.getElementById('stat-changed').textContent = d.changed.length
    document.getElementById('stat-bugs').textContent = d.bugs.open

    // Branch
    document.getElementById('branch-name').textContent = '⎇  ' + d.branch

    // Agents
    const agentNames = ['docs','data','security','frontend','tester']
    const agentsGrid = document.getElementById('agents-grid')
    const agents = d.agents

    if (!agents || Object.keys(agents).length === 0) {
      agentsGrid.innerHTML = '<div class="empty">Waiting for agent data…</div>'
    } else {
      agentsGrid.innerHTML = agentNames.map(name => {
        const a = agents[name] || { status: 'idle', task: 'Not yet started', lastUpdate: null }
        const icon = a.status === 'working'
          ? '<span class="spinning">' + STATUS_ICON.working + '</span>'
          : (STATUS_ICON[a.status] || '?')
        return \`
          <div class="agent-card \${a.status}">
            <div class="agent-head">
              <span class="agent-name">\${name}</span>
              <span class="status-badge \${a.status}">\${icon} \${a.status}</span>
            </div>
            <div class="agent-task">\${a.task || '—'}</div>
            <div class="agent-time">\${timeAgo(a.lastUpdate)}</div>
          </div>
        \`
      }).join('')
    }

    // Commits
    const commitList = document.getElementById('commit-list')
    if (!d.commits.length) {
      commitList.innerHTML = '<li class="empty">No commits yet</li>'
    } else {
      commitList.innerHTML = d.commits.map(c => \`
        <li class="commit-item">
          <span class="commit-hash">\${c.hash}</span>
          <div class="commit-body">
            <div class="commit-msg">\${c.message}</div>
            <div class="commit-meta">\${c.author} · \${c.time}</div>
          </div>
        </li>
      \`).join('')
    }

    // Working tree
    const fileList = document.getElementById('file-list')
    document.getElementById('tree-count').textContent = d.changed.length ? d.changed.length + ' file(s)' : 'Clean'
    if (!d.changed.length) {
      fileList.innerHTML = '<li class="empty">Clean — nothing uncommitted</li>'
    } else {
      fileList.innerHTML = d.changed.slice(0, 20).map(f => \`
        <li class="file-item">
          <span class="file-flag \${f.flag}">\${f.flag}</span>
          <span class="file-name">\${f.file}</span>
        </li>
      \`).join('')
      if (d.changed.length > 20) fileList.innerHTML += \`<li class="file-item"><span class="file-name" style="color:var(--grey)">… and \${d.changed.length - 20} more</span></li>\`
    }

    // Bugs
    const bugList = document.getElementById('bug-list')
    const b = d.bugs
    document.getElementById('bug-summary').textContent =
      b.all.length ? \`\${b.open} open · \${b.inProg} in progress · \${b.resolved} resolved\` : ''
    if (!b.all.length) {
      bugList.innerHTML = '<li class="empty">No bugs logged yet</li>'
    } else {
      bugList.innerHTML = b.all.slice(0, 8).map(bug => \`
        <li class="bug-item">
          <span class="bug-id">\${bug.id}</span>
          <span class="sev-badge \${bug.severity}">\${bug.severity}</span>
          <span class="bug-desc">\${bug.description}</span>
          <span class="bug-status">\${bug.status}</span>
        </li>
      \`).join('')
    }
  }

  async function refresh() {
    try {
      const res  = await fetch('/api/status')
      const data = await res.json()
      render(data)
    } catch (e) {
      document.getElementById('last-updated').textContent = 'Connection error'
    }
  }

  refresh()
  setInterval(refresh, 3000)
</script>
</body>
</html>`

const server = http.createServer((req, res) => {
  if (req.url === '/api/status') {
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Access-Control-Allow-Origin', '*')
    try {
      res.end(JSON.stringify(getStatus()))
    } catch (e) {
      res.statusCode = 500
      res.end(JSON.stringify({ error: e.message }))
    }
    return
  }

  // Serve dashboard HTML for all other routes
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.end(HTML)
})

server.listen(PORT, () => {
  console.log(`\n  ✦ Soft Landing Dashboard`)
  console.log(`  → http://localhost:${PORT}\n`)
  console.log(`  Ctrl+C to stop\n`)
})
