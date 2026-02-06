// ─── Insole Tracker Utilities ───────────────────────────────────────────────

const Utils = {
  // ── ID Generation ──────────────────────────────────────────────────────────
  generateId() {
    return crypto.randomUUID
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
          const r = (Math.random() * 16) | 0;
          return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        });
  },

  // ── Serial Number ──────────────────────────────────────────────────────────
  generateSerial() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let serial = '';
    for (let i = 0; i < 4; i++) {
      serial += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return serial;
  },

  isValidSerial(serial) {
    return !serial || /^[A-Za-z0-9]{4}$/.test(serial);
  },

  // ── Date Formatting ────────────────────────────────────────────────────────
  formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  },

  formatDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },

  timeAgo(iso) {
    if (!iso) return 'never';
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diff = now - then;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    return Utils.formatDate(iso);
  },

  nowISO() {
    return new Date().toISOString();
  },

  // ── Badge / Status Colors ──────────────────────────────────────────────────
  // Default values (can be overridden by settings in localStorage)
  _defaultTeamMembers: ['Ahmed', 'Luca'],
  _defaultClients: ['Spire', 'HAUHSU'],
  _defaultSizes: [
    { code: 'B', range: '38-39' },
    { code: 'C', range: '40-41' },
    { code: 'D', range: '42-43' },
    { code: 'E', range: '44-45' },
  ],

  // Get current settings from localStorage or defaults
  getTeamMembers() {
    try {
      const stored = localStorage.getItem('insole_tracker_team_members');
      return stored ? JSON.parse(stored) : Utils._defaultTeamMembers;
    } catch (_) {
      return Utils._defaultTeamMembers;
    }
  },

  getClients() {
    try {
      const stored = localStorage.getItem('insole_tracker_clients');
      return stored ? JSON.parse(stored) : Utils._defaultClients;
    } catch (_) {
      return Utils._defaultClients;
    }
  },

  getSizes() {
    try {
      const stored = localStorage.getItem('insole_tracker_sizes');
      return stored ? JSON.parse(stored) : Utils._defaultSizes;
    } catch (_) {
      return Utils._defaultSizes;
    }
  },

  saveTeamMembers(members) {
    localStorage.setItem('insole_tracker_team_members', JSON.stringify(members));
  },

  saveClients(clients) {
    localStorage.setItem('insole_tracker_clients', JSON.stringify(clients));
  },

  saveSizes(sizes) {
    localStorage.setItem('insole_tracker_sizes', JSON.stringify(sizes));
  },

  STATUS_KEYWORDS: {
    lost: 'lost',
    damaged: 'damaged',
    returned: 'returned',
    stock: 'stock',
    available: 'available',
  },

  getLocationBadge(location) {
    if (!location) return { color: 'stone', label: 'Unassigned' };
    const lower = location.toLowerCase().trim();

    if (lower === 'lost') {
      return { color: 'red', label: location };
    }
    if (lower === 'damaged') {
      return { color: 'orange', label: location };
    }
    if (lower === 'returned' || lower === 'stock' || lower === 'available') {
      return { color: 'gray', label: location };
    }

    // Check team members
    for (const member of Utils.getTeamMembers()) {
      if (lower.includes(member.toLowerCase())) {
        return { color: 'blue', label: location };
      }
    }

    // Check known clients
    for (const client of Utils.getClients()) {
      if (lower.includes(client.toLowerCase())) {
        return { color: 'emerald', label: location };
      }
    }

    // Default — treat as client/external
    return { color: 'emerald', label: location };
  },

  badgeClasses(color) {
    const map = {
      red: 'bg-red-50 text-red-700 ring-red-600/20',
      orange: 'bg-orange-50 text-orange-700 ring-orange-600/20',
      gray: 'bg-gray-50 text-gray-600 ring-gray-500/20',
      blue: 'bg-blue-50 text-blue-700 ring-blue-600/20',
      emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
      stone: 'bg-stone-50 text-stone-500 ring-stone-400/20',
      amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    };
    return map[color] || map.stone;
  },

  typeBadge(type) {
    if (type === 'Advanced') {
      return {
        classes: 'bg-amber-50 text-amber-700 ring-amber-600/20',
        label: 'Advanced',
      };
    }
    return {
      classes: 'bg-stone-100 text-stone-600 ring-stone-400/20',
      label: 'Core',
    };
  },

  // ── Size Labels ────────────────────────────────────────────────────────────
  sizeLabel(size) {
    const sizes = Utils.getSizes();
    const sizeObj = sizes.find(s => s.code === size);
    return sizeObj ? `${sizeObj.code} (${sizeObj.range})` : size || '—';
  },

  // ── Debounce ───────────────────────────────────────────────────────────────
  debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  // ── Known locations for autocomplete ───────────────────────────────────────
  getKnownLocations(insoles) {
    const locs = new Set();
    Utils.getTeamMembers().forEach(m => locs.add(m));
    Utils.getClients().forEach(c => locs.add(c));
    locs.add('Stock');
    locs.add('Lost');
    locs.add('Damaged');
    locs.add('Returned');
    if (insoles) {
      insoles.forEach(i => {
        if (i.location && i.location.trim()) {
          locs.add(i.location.trim());
        }
      });
    }
    return [...locs].sort();
  },

  // ── Diff two insole objects for history logging ────────────────────────────
  diffInsole(oldObj, newObj) {
    const fields = ['serialNumber', 'type', 'size', 'location', 'notes'];
    const changes = [];
    for (const field of fields) {
      const oldVal = (oldObj[field] || '').toString();
      const newVal = (newObj[field] || '').toString();
      if (oldVal !== newVal) {
        changes.push({ field, oldValue: oldVal, newValue: newVal });
      }
    }
    return changes;
  },
};
