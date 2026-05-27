/**
 * Supervisor Panel for Home Assistant
 * Replaces the Supervisor sidebar panel removed in HA 2026.5
 * @version 1.0.5
 * @author Pjarbit
 * @license MIT
 */

const SUPERVISOR_PANEL_VERSION = '1.0.5';

class SupervisorPanel extends HTMLElement {
  connectedCallback() {
    this.style.cssText = 'display:block;height:100%;overflow:auto;background:var(--primary-background-color,#111)';
    this._logPaused = false;
    this._rawLines = [];
    this._conn = null;

    this.render();

    // hassConnection is provided by the HA frontend — guard against it being unavailable
    if (typeof hassConnection === 'undefined') {
      this._showError('Home Assistant connection unavailable');
      return;
    }

    hassConnection.then(c => {
      this._conn = c.conn;
      this._load();
      // Refresh logs every 10 seconds unless paused
      this._logInterval = setInterval(() => {
        if (!this._logPaused) this._loadLogs();
      }, 10000);
    }).catch(err => {
      console.error('[SupervisorPanel] Failed to get hassConnection:', err);
      this._showError('Failed to connect to Home Assistant');
    });
  }

  disconnectedCallback() {
    if (this._logInterval) clearInterval(this._logInterval);
  }

  /** Send a WebSocket message to HA core */
  async _ws(msg) {
    if (!this._conn) throw new Error('WebSocket not connected');
    return this._conn.sendMessagePromise(msg);
  }

  /** Get the current Bearer token from the HA auth session */
  async _getToken() {
    const c = await hassConnection;
    return c.auth.data.access_token;
  }

  /** Fetch logs from the Supervisor REST API (requires Bearer auth) */
  async _apiLogs(endpoint) {
    const token = await this._getToken();
    const r = await fetch(`/api/hassio/${endpoint}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.text();
  }

  render() {
    this.innerHTML = `
      <style>
        .page { padding:16px; max-width:1200px; margin:0 auto; font-family:var(--paper-font-body1_-_font-family,Roboto,sans-serif); }
        h1 { color:var(--primary-text-color,#fff); font-size:1.4em; margin:0 0 4px; display:flex; align-items:center; gap:12px; }
        .updated { font-size:0.75em; color:var(--secondary-text-color,#aaa); }
        .toolbar { display:flex; gap:8px; margin:8px 0 16px; }
        .cards { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:16px; }
        @media(max-width:800px) { .cards { grid-template-columns:1fr; } }
        .card { background:var(--card-background-color,#1c1c1c); border-radius:12px; padding:16px; box-shadow: 12px 12px 24px rgba(0,0,0,0.5), -4px -4px 8px rgba(255,255,255,0.1), inset -4px -4px 8px rgba(0,0,0,0.2), inset 4px 4px 8px rgba(255,255,255,0.2); display:flex; flex-direction:column; }
        .card h2 { margin:0 0 12px; font-size:1.1em; color:var(--primary-text-color,#fff); }
        .card-body { flex:1; }
        .row { display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.85em; }
        .label { color:var(--secondary-text-color,#aaa); }
        .value { color:var(--primary-text-color,#fff); font-weight:500; }
        .value.warning { color:#ff9800; }
        .bar-wrap { background:rgba(255,255,255,0.1); border-radius:4px; height:6px; margin-top:4px; margin-bottom:10px; overflow:hidden; }
        .bar { height:100%; border-radius:4px; transition:width 0.4s; }
        .bar.low { background:#4caf50; }
        .bar.mid { background:#ff9800; }
        .bar.high { background:#f44336; }
        .actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.07); align-items:center; }
        .panel-version-tag { font-size:0.65em; color:var(--secondary-text-color,#888); margin-left:auto; letter-spacing:0.05em; }
        button {
          background:transparent;
          border:1px solid #00adb5;
          color:#00adb5;
          padding:6px 14px;
          border-radius:4px;
          cursor:pointer;
          font-size:0.8em;
          text-transform:uppercase;
          letter-spacing:0.05em;
          transition:all 0.2s;
        }
        button:hover { background:rgba(0,173,181,0.15); }
        button:disabled { opacity:0.4; cursor:default; }
        button.neutral { border-color:#cccccc; color:#cccccc; }
        button.neutral:hover { background:rgba(204,204,204,0.15); }
        button.teal {
          background:#00adb5;
          border-color:#00adb5;
          color:rgba(255,255,255,0.8);
          box-shadow: 6px 6px 12px rgba(0,0,0,0.5), -2px -2px 6px rgba(255,255,255,0.1), inset -2px -2px 4px rgba(0,0,0,0.2), inset 2px 2px 4px rgba(255,255,255,0.2);
        }
        button.teal:hover { background:#009aa1; box-shadow: 4px 4px 8px rgba(0,0,0,0.5), -1px -1px 4px rgba(255,255,255,0.1); }
        button.orange {
          background:#ff9800;
          border-color:#ff9800;
          color:rgba(255,255,255,0.8);
          box-shadow: 6px 6px 12px rgba(0,0,0,0.5), -2px -2px 6px rgba(255,255,255,0.1), inset -2px -2px 4px rgba(0,0,0,0.2), inset 2px 2px 4px rgba(255,255,255,0.2);
        }
        button.orange:hover { background:#e68900; box-shadow: 4px 4px 8px rgba(0,0,0,0.5), -1px -1px 4px rgba(255,255,255,0.1); }
        .update-badge { font-size:0.75em; background:#ff9800; color:#000; padding:2px 8px; border-radius:10px; margin-left:8px; }
        .log-card { background:var(--card-background-color,#1c1c1c); border-radius:12px; padding:16px; box-shadow: 12px 12px 24px rgba(0,0,0,0.5), -4px -4px 8px rgba(255,255,255,0.1), inset -4px -4px 8px rgba(0,0,0,0.2), inset 4px 4px 8px rgba(255,255,255,0.2); }
        .log-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px; }
        .log-header h2 { margin:0; font-size:1.1em; color:var(--primary-text-color,#fff); }
        .log-controls { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        select.log-select, input.log-search {
          background:var(--card-background-color,#1c1c1c);
          color:var(--primary-text-color,#fff);
          border:1px solid rgba(255,255,255,0.2);
          border-radius:4px;
          padding:4px 8px;
          font-size:0.85em;
        }
        input.log-search { width:180px; }
        pre {
          margin:0; font-size:0.75em; line-height:1.5; color:#ccc;
          background:#0a0a0a; border-radius:8px; padding:12px;
          overflow-x:auto; max-height:420px; overflow-y:auto;
          white-space:pre-wrap; word-break:break-all;
        }
        .log-line.error { color:#f44336; }
        .log-line.warning { color:#ff9800; }
        .log-line.info { color:#ccc; }
        .log-line.highlight { background:rgba(255,235,59,0.2); }
        .toast {
          position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
          background:#323232; color:#fff; padding:10px 20px; border-radius:6px;
          font-size:0.85em; z-index:9999; opacity:0; transition:opacity 0.3s;
          pointer-events:none;
        }
        .toast.show { opacity:1; }
        .spinner {
          display:inline-block; width:12px; height:12px;
          border:2px solid rgba(255,255,255,0.2); border-top-color:#fff;
          border-radius:50%; animation:spin 0.6s linear infinite; margin-right:6px;
        }
        @keyframes spin { to { transform:rotate(360deg); } }
      </style>
      <div class="page">
        <h1>Supervisor <span class="updated" id="last-updated"></span></h1>
        <div class="toolbar">
          <button id="btn-refresh" class="teal">↻ Refresh All</button>
        </div>
        <div class="cards">
          <div class="card">
            <h2>Core</h2>
            <div class="card-body" id="core-info"><span class="spinner"></span> Loading...</div>
            <div class="actions">
              <button id="btn-restart-core" class="teal">Restart Core</button>
            </div>
          </div>
          <div class="card">
            <h2>Supervisor</h2>
            <div class="card-body" id="supervisor-info"><span class="spinner"></span> Loading...</div>
            <div class="actions">
              <button id="btn-restart-supervisor" class="teal">Restart Supervisor</button>
            </div>
          </div>
          <div class="card">
            <h2>Host</h2>
            <div class="card-body" id="host-info"><span class="spinner"></span> Loading...</div>
            <div class="actions">
              <button id="btn-reboot-host" class="teal">Reboot Host</button>
              <button id="btn-shutdown-host" class="orange">Shutdown Host</button>
              <span class="panel-version-tag">PJA | v<span id="panel-version"></span></span>
            </div>
          </div>
        </div>
        <div class="log-card">
          <div class="log-header">
            <h2>Logs</h2>
            <div class="log-controls">
              <input class="log-search" id="log-search" placeholder="Filter logs..." maxlength="100" />
              <select class="log-select" id="log-source">
                <option value="core">Core</option>
                <option value="supervisor" selected>Supervisor</option>
                <option value="host">Host</option>
              </select>
              <button id="btn-pause" class="neutral">⏸ Pause</button>
              <button id="btn-bottom" class="neutral">↓ Bottom</button>
            </div>
          </div>
          <pre id="log-output"><span class="spinner"></span> Loading logs...</pre>
        </div>
      </div>
      <div class="toast" id="toast"></div>
    `;

    const vEl = this.querySelector('#panel-version');
    if (vEl) vEl.textContent = SUPERVISOR_PANEL_VERSION;
    this.querySelector('#btn-refresh').onclick = () => this._load();
    this.querySelector('#btn-restart-core').onclick = () => this._wsAction('homeassistant', 'restart', 'Restart Core', true);
    this.querySelector('#btn-restart-supervisor').onclick = () => this._wsAction('hassio', 'restart_supervisor', 'Restart Supervisor', true);
    this.querySelector('#btn-reboot-host').onclick = () => this._wsAction('hassio', 'host_reboot', 'Reboot Host', true);
    this.querySelector('#btn-shutdown-host').onclick = () => this._wsAction('hassio', 'host_shutdown', 'Shutdown Host', true);
    this.querySelector('#log-source').onchange = () => this._loadLogs();
    this.querySelector('#log-search').oninput = () => this._filterLogs();
    this.querySelector('#btn-bottom').onclick = () => {
      const pre = this.querySelector('#log-output');
      if (pre) pre.scrollTop = pre.scrollHeight;
    };
    this.querySelector('#btn-pause').onclick = (e) => {
      this._logPaused = !this._logPaused;
      e.target.textContent = this._logPaused ? '▶ Resume' : '⏸ Pause';
    };
  }

  /** Returns a color-coded progress bar HTML string based on percentage */
  _bar(pct) {
    const p = parseFloat(pct) || 0;
    const cls = p < 50 ? 'low' : p < 80 ? 'mid' : 'high';
    return `<div class="bar-wrap"><div class="bar ${cls}" style="width:${p}%"></div></div>`;
  }

  /** Returns a label/value row HTML string */
  _row(label, value, cssClass = '') {
    return `<div class="row"><span class="label">${label}</span><span class="value${cssClass ? ' ' + cssClass : ''}">${value}</span></div>`;
  }

  /** Returns version HTML with optional update badge */
  _versionHtml(entity) {
    if (!entity) return '—';
    const installed = entity.attributes.installed_version || '—';
    const latest = entity.attributes.latest_version;
    if (entity.state === 'on' && latest) {
      return `${installed} <span class="update-badge">↑ ${latest}</span>`;
    }
    return installed;
  }

  /**
   * Find a state entity by exact entity_id.
   * Accepts multiple IDs as fallbacks.
   */
  _findState(states, ...ids) {
    for (const id of ids) {
      const e = states.find(s => s.entity_id === id);
      if (e) return e;
    }
    return null;
  }

  /**
   * Find a System Monitor entity by keyword matching on entity_id and unit.
   * Uses entity_id substring matching rather than locale-dependent names,
   * so it works regardless of the user's HA language setting.
   */
  _findSysMonEntity(states, idKeywords, units) {
    // Match by keyword on entity_id — works with or without 'system_monitor' prefix
    return states.find(s => {
      if (!s.entity_id.startsWith('sensor.')) return false;
      const hasKeyword = idKeywords.some(k => s.entity_id.includes(k));
      if (!hasKeyword) return false;
      if (units && units.length) {
        return units.includes(s.attributes?.unit_of_measurement);
      }
      return true;
    }) || null;
  }

  async _load() {
    try {
      const states = await this._ws({ type: 'get_states' });

      // --- Core card ---
      const coreUpdate = this._findState(states, 'update.home_assistant_core_update');

      const cpuLoad = this._findSysMonEntity(states,
        ['load_1m', 'processor_load', 'load1'], null);

      const ramPct = this._findSysMonEntity(states,
        ['memory_usage', 'memory_use_percent', 'virtual_memory'], ['%']);

      const ramUse = this._findSysMonEntity(states,
        ['memory_use'], ['MiB', 'MB', 'GB', 'GiB']);

      const ramFree = this._findSysMonEntity(states,
        ['memory_free'], ['MiB', 'MB', 'GB', 'GiB']);

      this.querySelector('#core-info').innerHTML =
        this._row('Version', this._versionHtml(coreUpdate)) +
        this._row('CPU Load (1m)', (parseFloat(cpuLoad?.state) || 0).toFixed(2)) +
        this._row('RAM Usage', (parseFloat(ramPct?.state) || 0).toFixed(1) + '%') +
        this._bar(ramPct?.state) +
        this._row('RAM Used', ramUse?.state ? parseFloat(ramUse.state).toFixed(1) + ' ' + (ramUse.attributes?.unit_of_measurement || 'MB') : '—') +
        this._row('RAM Free', ramFree?.state ? parseFloat(ramFree.state).toFixed(1) + ' ' + (ramFree.attributes?.unit_of_measurement || 'MB') : '—');

      // --- Supervisor card ---
      const supUpdate = this._findState(states, 'update.home_assistant_supervisor_update');
      const updateAvailable = supUpdate?.state === 'on';

      this.querySelector('#supervisor-info').innerHTML =
        this._row('Version', this._versionHtml(supUpdate)) +
        this._row('Update Available', updateAvailable ? 'Yes' : 'No', updateAvailable ? 'warning' : '');

      // --- Host card ---
      const diskPct = this._findSysMonEntity(states,
        ['disk_usage', 'disk_use_percent'], ['%']);

      const diskFree = this._findSysMonEntity(states,
        ['disk_free'], ['GiB', 'GB']);

      const diskUse = this._findSysMonEntity(states,
        ['disk_use'], ['GiB', 'GB']);

      const lastBoot = this._findSysMonEntity(states,
        ['last_boot'], null);

      this.querySelector('#host-info').innerHTML =
        this._row('Last Boot', lastBoot?.state ? new Date(lastBoot.state).toLocaleString() : '—') +
        this._row('Disk Usage', (parseFloat(diskPct?.state) || 0).toFixed(1) + '%') +
        this._bar(diskPct?.state) +
        this._row('Disk Used', diskUse?.state ? parseFloat(diskUse.state).toFixed(1) + ' GB' : '—') +
        this._row('Disk Free', diskFree?.state ? parseFloat(diskFree.state).toFixed(1) + ' GB' : '—');

      this.querySelector('#last-updated').textContent = `Updated ${new Date().toLocaleTimeString()}`;

      // Only load logs after states succeed
      this._loadLogs();

    } catch (e) {
      console.error('[SupervisorPanel] _load error:', e);
      this._showError(e.message);
    }
  }

  async _loadLogs() {
    const srcEl = this.querySelector('#log-source');
    if (!srcEl) return;
    const src = srcEl.value;
    const endpoint = src === 'core' ? 'core/logs' : src === 'host' ? 'host/logs' : 'supervisor/logs';
    const pre = this.querySelector('#log-output');
    if (!pre) return;
    try {
      const text = await this._apiLogs(endpoint);
      // Strip ANSI escape codes and keep last 200 lines
      this._rawLines = text.trim().split('\n')
        .slice(-200)
        .map(l => l.replace(/\x1b\[[0-9;]*m/g, ''));
      this._filterLogs();
    } catch (e) {
      pre.textContent = `Failed to load logs: ${e.message}`;
    }
  }

  _filterLogs() {
    const pre = this.querySelector('#log-output');
    if (!pre) return;
    // Sanitize search input before use
    const raw = this.querySelector('#log-search')?.value || '';
    const search = raw.toLowerCase().trim().slice(0, 100);
    const filtered = search
      ? this._rawLines.filter(l => l.toLowerCase().includes(search))
      : this._rawLines;
    pre.innerHTML = filtered.map(l => {
      const cls = /error|critical/i.test(l) ? 'error'
                : /warning|warn/i.test(l) ? 'warning' : 'info';
      const hl = search && l.toLowerCase().includes(search) ? ' highlight' : '';
      return `<span class="log-line ${cls}${hl}">${this._esc(l)}</span>`;
    }).join('\n');
    if (!search) pre.scrollTop = pre.scrollHeight;
  }

  /** Escape HTML special characters to prevent XSS in log output */
  _esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /** Call a HA service via WebSocket with optional confirmation dialog */
  async _wsAction(domain, service, label, needsConfirm) {
    if (needsConfirm && !window.confirm(`${label}?\nThis will affect your Home Assistant instance.`)) return;
    this._toast(`${label}...`);
    try {
      await this._ws({ type: 'call_service', domain, service, service_data: {} });
      this._toast(`${label} initiated.`);
    } catch (e) {
      console.error(`[SupervisorPanel] _wsAction ${domain}.${service} failed:`, e);
      this._toast(`Error: ${e.message}`);
    }
  }

  /** Show an error message in all three stat cards */
  _showError(msg) {
    ['core-info', 'supervisor-info', 'host-info'].forEach(id => {
      const el = this.querySelector(`#${id}`);
      if (el) el.innerHTML = `<span style="color:#f44336">Error: ${msg}</span>`;
    });
  }

  /** Show a temporary toast notification */
  _toast(msg) {
    const t = this.querySelector('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
  }
}

customElements.define('supervisor-panel', SupervisorPanel);
