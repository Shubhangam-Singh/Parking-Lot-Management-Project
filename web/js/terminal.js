/*
 * Presentation layer: terminal I/O, sound, the garage slot visualizer,
 * the receipt printer animation, HUD/stats and achievement toasts.
 * None of this touches the Park Easy engine logic in engine.js — it only
 * renders it.
 */

// ---------- Sound (WebAudio, no external assets) ----------

const Sound = {
  ctx: null,
  muted: localStorage.getItem('parkeasy_muted') === '1',

  _ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('parkeasy_muted', this.muted ? '1' : '0');
    return this.muted;
  },

  beep(freq = 440, dur = 0.08, type = 'square', vol = 0.05, delay = 0) {
    if (this.muted) return;
    this._ensure();
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  },
  key() {
    this.beep(180 + Math.random() * 60, 0.02, 'square', 0.02);
  },
  select() {
    this.beep(520, 0.05, 'square', 0.04);
  },
  success() {
    this.beep(660, 0.08, 'square', 0.05);
    this.beep(880, 0.1, 'square', 0.05, 0.09);
  },
  error() {
    this.beep(140, 0.22, 'sawtooth', 0.06);
  },
  cash() {
    [988, 1319, 1568, 1976].forEach((f, i) => this.beep(f, 0.09, 'square', 0.05, i * 0.06));
  },
  achievement() {
    [523, 659, 784, 1047].forEach((f, i) => this.beep(f, 0.14, 'triangle', 0.06, i * 0.1));
  },
  engineStart() {
    this.beep(90, 0.3, 'sawtooth', 0.05);
    this.beep(140, 0.25, 'sawtooth', 0.04, 0.1);
  },
};

// ---------- Terminal (scrollback + async prompt) ----------

class Terminal {
  constructor(scrollbackEl, inputEl, promptLabelEl) {
    this.scrollback = scrollbackEl;
    this.input = inputEl;
    this.promptLabel = promptLabelEl;
    this._resolve = null;

    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this._resolve) {
        const val = this.input.value;
        this.input.value = '';
        this.echo(val);
        const r = this._resolve;
        this._resolve = null;
        r(val);
      } else if (e.key.length === 1 || e.key === 'Backspace') {
        Sound.key();
      }
    });
  }

  println(text = '', cls = '') {
    const div = document.createElement('div');
    div.className = 'line' + (cls ? ' ' + cls : '');
    div.textContent = text;
    this.scrollback.appendChild(div);
    this._scroll();
    return div;
  }

  printBox(lines, cls = 'box') {
    lines.forEach((l) => this.println(l, cls));
  }

  echo(val) {
    this.println('> ' + val, 'echo');
  }

  clearOutput() {
    this.scrollback.innerHTML = '';
  }

  _scroll() {
    this.scrollback.scrollTop = this.scrollback.scrollHeight;
  }

  async ask(promptText) {
    this.promptLabel.textContent = promptText;
    this.input.disabled = false;
    this.input.focus();
    return new Promise((res) => {
      this._resolve = res;
    });
  }

  async askInt(promptText) {
    const v = await this.ask(promptText);
    const n = parseInt(v, 10);
    return Number.isNaN(n) ? NaN : n;
  }

  // Typewriter reveal for the boot banner — cosmetic only.
  async type(text, cls = '', speed = 12) {
    const div = document.createElement('div');
    div.className = 'line' + (cls ? ' ' + cls : '');
    this.scrollback.appendChild(div);
    for (const ch of text) {
      div.textContent += ch;
      this._scroll();
      await sleep(speed);
    }
  }
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

// ---------- Garage slot visualizer ----------

const Garage = {
  categories: [
    { key: '2e', label: '2-WHEEL · ELECTRIC', icon: '🛵⚡' },
    { key: '2p', label: '2-WHEEL · PETROL', icon: '🏍️⛽' },
    { key: '4e', label: '4-WHEEL · ELECTRIC', icon: '🚗⚡' },
    { key: '4p', label: '4-WHEEL · PETROL', icon: '🚙⛽' },
  ],

  mount(containerEl) {
    this.container = containerEl;
    this.container.innerHTML = '';
    this.cells = {};
    this.categories.forEach((cat) => {
      const col = document.createElement('div');
      col.className = 'garage-col';
      col.innerHTML = `<div class="garage-head">${cat.icon}<span>${cat.label}</span></div>
        <div class="garage-grid" data-cat="${cat.key}"></div>
        <div class="garage-count" data-count="${cat.key}">0 / 0</div>`;
      this.container.appendChild(col);
      this.cells[cat.key] = col.querySelector('.garage-grid');
    });
  },

  render(lot) {
    const map = {
      '2e': [lot.total_slots_2e, lot.available_slots_2e],
      '2p': [lot.total_slots_2p, lot.available_slots_2p],
      '4e': [lot.total_slots_4e, lot.available_slots_4e],
      '4p': [lot.total_slots_4p, lot.available_slots_4p],
    };
    Object.entries(map).forEach(([key, [total, available]]) => {
      const occupied = total - available;
      const grid = this.cells[key];
      if (grid.children.length !== total) {
        grid.innerHTML = '';
        for (let i = 0; i < total; i++) {
          const cell = document.createElement('div');
          cell.className = 'slot-cell';
          grid.appendChild(cell);
        }
      }
      [...grid.children].forEach((cell, i) => {
        const shouldFill = i < occupied;
        const wasFilled = cell.classList.contains('filled');
        if (shouldFill && !wasFilled) {
          cell.classList.add('filled', 'pop');
          setTimeout(() => cell.classList.remove('pop'), 450);
        } else if (!shouldFill && wasFilled) {
          cell.classList.remove('filled');
          cell.classList.add('vacate');
          setTimeout(() => cell.classList.remove('vacate'), 500);
        }
      });
      this.container.querySelector(`[data-count="${key}"]`).textContent = `${occupied} / ${total}`;
    });
  },

  vehicleGlyph(wheels) {
    return wheels === 1 ? '🏍️' : '🚗';
  },

  driveIn(catKey, wheels) {
    const col = this.cells[catKey].closest('.garage-col');
    const el = document.createElement('div');
    el.className = 'garage-vehicle drive-in';
    el.textContent = this.vehicleGlyph(wheels);
    col.appendChild(el);
    setTimeout(() => el.remove(), 900);
  },

  driveOut(catKey, wheels) {
    const col = this.cells[catKey].closest('.garage-col');
    const el = document.createElement('div');
    el.className = 'garage-vehicle drive-out';
    el.textContent = this.vehicleGlyph(wheels);
    col.appendChild(el);
    setTimeout(() => el.remove(), 900);
  },
};

// ---------- Receipt printer ----------

function printReceipt(dockEl, { plate, hours, minutes, vipType, bill }) {
  const paper = document.createElement('div');
  paper.className = 'receipt';
  paper.innerHTML = `
    <div class="receipt-title">*** PARK EASY ***</div>
    <div class="receipt-line">Plate: ${plate}</div>
    <div class="receipt-line">Duration: ${hours}h ${minutes}m</div>
    <div class="receipt-line">VIP Tier: ${vipType === 'no' ? '—' : vipType.toUpperCase()}</div>
    <div class="receipt-dashes">- - - - - - - - - - - - - -</div>
    <div class="receipt-total">TOTAL: Rs. ${bill}</div>
    <div class="receipt-line small">Thank you, drive safe!</div>
  `;
  dockEl.innerHTML = '';
  dockEl.appendChild(paper);
  requestAnimationFrame(() => paper.classList.add('printing'));
  Sound.cash();
}

// ---------- Achievements / stats HUD ----------

const BADGES = {
  first_park: { name: 'First Parked', icon: '🚗', desc: 'Parked your first vehicle' },
  first_retrieve: { name: 'Safe Return', icon: '🔑', desc: 'Retrieved your first vehicle' },
  vip_verified: { name: 'VIP Status', icon: '💎', desc: 'Verified a VIP membership' },
  admin_access: { name: 'Root Access', icon: '🛡️', desc: 'Logged into an admin panel' },
  ten_parked: { name: 'Regular', icon: '🏅', desc: 'Parked 10 vehicles lifetime' },
  full_house: { name: 'Full House', icon: '🅿️', desc: 'Filled every slot in a category' },
  database_wipe: { name: 'Clean Slate', icon: '🧹', desc: 'Erased the database' },
  night_owl: { name: 'Night Owl', icon: '🦉', desc: 'Used Park Easy after midnight' },
};

const Stats = {
  data: Store.loadStats(),

  save() {
    Store.saveStats(this.data);
  },

  addXp(amount) {
    this.data.xp += amount;
    this.save();
    this.renderHud();
  },

  level() {
    return Math.floor(this.data.xp / 100) + 1;
  },

  unlock(id) {
    if (this.data.badges.includes(id)) return;
    this.data.badges.push(id);
    this.data.xp += 25;
    this.save();
    this.renderHud();
    this.toast(id);
  },

  toast(id) {
    const badge = BADGES[id];
    const container = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<span class="toast-icon">${badge.icon}</span><div><div class="toast-title">Achievement Unlocked</div><div class="toast-name">${badge.name}</div></div>`;
    container.appendChild(el);
    Sound.achievement();
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 500);
    }, 3800);
  },

  renderHud() {
    document.getElementById('hudLevel').textContent = this.level();
    document.getElementById('hudRevenue').textContent = this.data.totalRevenue.toLocaleString('en-IN');
    document.getElementById('hudParked').textContent = this.data.totalParked;
    document.getElementById('hudBadges').textContent = `${this.data.badges.length}/${Object.keys(BADGES).length}`;
    const xpIntoLevel = this.data.xp % 100;
    document.getElementById('xpFill').style.width = xpIntoLevel + '%';
  },
};
