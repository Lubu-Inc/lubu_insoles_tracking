// ─── Insole Tracker — Alpine.js Store ────────────────────────────────────────

document.addEventListener('alpine:init', () => {
  Alpine.store('app', {
    // ── State ──────────────────────────────────────────────────────────────
    insoles: [],
    filtered: [],
    loading: true,
    syncing: false,
    saving: false,
    deleting: false,
    lastSynced: null,
    offline: false,
    apiConfigured: false,

    // Filters
    filters: {
      search: '',
      type: '',
      size: '',
      location: '',
    },

    // Sort
    sort: {
      field: 'dateAdded',
      dir: 'desc',
    },

    // Drawer (only for adding new insoles)
    drawerOpen: false,
    form: {
      serialNumber: '',
      type: 'Core',
      size: 'C',
      location: '',
      enclosure: 'New',
      pairStatus: 'Both',
      dateSent: '',
      notes: '',
    },

    // Inline editing
    editingCell: null, // { insoleId, field }
    editValue: '',

    // History modal
    historyOpen: false,
    historyInsole: null,
    history: [],
    historyLoading: false,

    // Delete confirmation
    deleteModalOpen: false,
    deleteTarget: null,

    // Settings modal
    settingsOpen: false,
    settings: {
      teamMembers: [],
      clients: [],
      investors: [],
      sizes: [],
    },

    // Toasts
    toasts: [],
    _toastId: 0,

    // ── Computed-like getters ───────────────────────────────────────────────

    get stats() {
      const all = this.filtered; // Use filtered insoles so stats reflect active filters
      const sizes = {};
      Utils.getSizes().forEach(s => {
        sizes[s.code] = all.filter(i => i.size === s.code).length;
      });

      return {
        core: all.filter(i => i.type === 'Core').length,
        advanced: all.filter(i => i.type === 'Advanced').length,
        withClients: all.filter(i => {
          const loc = (i.location || '').toLowerCase();
          if (!loc || loc === 'stock' || loc === 'available' || loc === 'returned' || loc === 'lost' || loc === 'damaged') return false;
          // Not a team member
          for (const m of Utils.getTeamMembers()) {
            if (loc.includes(m.toLowerCase())) return false;
          }
          return true;
        }).length,
        lostDamaged: all.filter(i => {
          const loc = (i.location || '').toLowerCase();
          return loc === 'lost' || loc === 'damaged';
        }).length,
        sizes,
      };
    },

    get uniqueLocations() {
      const locs = new Set();
      this.insoles.forEach(i => {
        if (i.location && i.location.trim()) {
          locs.add(i.location.trim());
        }
      });
      return [...locs].sort();
    },

    get hasActiveFilters() {
      return this.filters.search || this.filters.type || this.filters.size || this.filters.location;
    },

    // ── Init ────────────────────────────────────────────────────────────────

    async init() {
      this.apiConfigured = API.isConfigured();

      // Load from cache first for instant rendering
      this.loadFromCache();
      this.loading = this.insoles.length === 0;

      // Listen for online/offline
      window.addEventListener('online', () => {
        this.offline = false;
        this.sync();
      });
      window.addEventListener('offline', () => {
        this.offline = true;
      });
      this.offline = !navigator.onLine;

      // Sync from API
      if (this.apiConfigured && !this.offline) {
        await this.sync();
      }

      this.loading = false;
      this.applyFilters();
    },

    // ── Sync ────────────────────────────────────────────────────────────────

    async sync() {
      if (!this.apiConfigured || this.syncing) return;
      this.syncing = true;

      try {
        const result = await API.fetchInsoles();
        this.insoles = result.data || [];
        this.lastSynced = Utils.nowISO();
        this.saveToCache();
        this.applyFilters();
      } catch (err) {
        console.error('Sync failed:', err);
        this.toast('Failed to sync — using cached data', 'error');
      } finally {
        this.syncing = false;
      }
    },

    // ── Cache ───────────────────────────────────────────────────────────────

    saveToCache() {
      try {
        localStorage.setItem('insole_tracker_data', JSON.stringify(this.insoles));
        localStorage.setItem('insole_tracker_synced', this.lastSynced);
      } catch (_) {}
    },

    loadFromCache() {
      try {
        const data = localStorage.getItem('insole_tracker_data');
        const synced = localStorage.getItem('insole_tracker_synced');
        if (data) {
          this.insoles = JSON.parse(data);
          this.lastSynced = synced;
        }
      } catch (_) {}
    },

    // ── Filtering & Sorting ─────────────────────────────────────────────────

    applyFilters() {
      let result = [...this.insoles];

      // Search
      if (this.filters.search) {
        const q = this.filters.search.toLowerCase();
        result = result.filter(i =>
          (i.serialNumber || '').toLowerCase().includes(q) ||
          (i.type || '').toLowerCase().includes(q) ||
          (i.size || '').toLowerCase().includes(q) ||
          (i.location || '').toLowerCase().includes(q) ||
          (i.notes || '').toLowerCase().includes(q)
        );
      }

      // Type filter
      if (this.filters.type) {
        result = result.filter(i => i.type === this.filters.type);
      }

      // Size filter
      if (this.filters.size) {
        result = result.filter(i => i.size === this.filters.size);
      }

      // Location filter
      if (this.filters.location) {
        result = result.filter(i => i.location === this.filters.location);
      }

      // Sort
      result.sort((a, b) => {
        let aVal = a[this.sort.field] || '';
        let bVal = b[this.sort.field] || '';
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        if (aVal < bVal) return this.sort.dir === 'asc' ? -1 : 1;
        if (aVal > bVal) return this.sort.dir === 'asc' ? 1 : -1;
        return 0;
      });

      this.filtered = result;
    },

    sortBy(field) {
      if (this.sort.field === field) {
        this.sort.dir = this.sort.dir === 'asc' ? 'desc' : 'asc';
      } else {
        this.sort.field = field;
        this.sort.dir = 'asc';
      }
      this.applyFilters();
    },

    clearFilters() {
      this.filters.search = '';
      this.filters.type = '';
      this.filters.size = '';
      this.filters.location = '';
      this.applyFilters();
    },

    // ── Drawer ──────────────────────────────────────────────────────────────

    openDrawer() {
      // Only for adding new insoles
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format for date input
      this.form = {
        serialNumber: '',
        type: 'Core',
        size: 'C',
        location: 'Ahmed',
        enclosure: 'New',
        pairStatus: 'Both',
        dateAdded: today,
        dateSent: '',
        notes: '',
      };
      this.drawerOpen = true;
    },

    closeDrawer() {
      this.drawerOpen = false;
    },

    // ── Inline Editing ──────────────────────────────────────────────────────

    startEdit(insole, field, event) {
      event.stopPropagation();
      this.editingCell = { insoleId: insole.id, field };
      this.editValue = insole[field] || '';
    },

    cancelEdit() {
      this.editingCell = null;
      this.editValue = '';
    },

    async saveEdit(insole) {
      if (!this.editingCell) return;

      const field = this.editingCell.field;
      const oldValue = insole[field];
      let newValue = this.editValue.trim();

      // Uppercase serial numbers
      if (field === 'serialNumber') {
        newValue = newValue.toUpperCase();
      }

      if (oldValue === newValue) {
        this.cancelEdit();
        return;
      }

      this.saving = true;

      try {
        const data = { id: insole.id, [field]: newValue };

        if (this.apiConfigured) {
          await API.updateInsole(data);
        }

        // Update local state
        const idx = this.insoles.findIndex(i => i.id === insole.id);
        if (idx !== -1) {
          this.insoles[idx][field] = newValue;
          this.insoles[idx].lastModified = Utils.nowISO();
        }

        this.saveToCache();
        this.applyFilters();
        this.toast('Updated', 'success');
        this.cancelEdit();
      } catch (err) {
        console.error('Save failed:', err);
        this.toast('Failed to save — ' + err.message, 'error');
      } finally {
        this.saving = false;
      }
    },

    // ── Save (Add or Update) ────────────────────────────────────────────────

    async saveInsole() {
      // Only for adding new insoles
      // Validate serial
      if (this.form.serialNumber && !Utils.isValidSerial(this.form.serialNumber)) {
        this.toast('Serial number must be 4 alphanumeric characters', 'error');
        return;
      }

      this.saving = true;

      const data = {
        serialNumber: this.form.serialNumber.toUpperCase(),
        type: this.form.type,
        size: this.form.size,
        location: this.form.location,
        enclosure: this.form.enclosure,
        pairStatus: this.form.pairStatus,
        dateAdded: this.form.dateAdded ? new Date(this.form.dateAdded).toISOString() : Utils.nowISO(),
        dateSent: this.form.dateSent ? new Date(this.form.dateSent).toISOString() : '',
        notes: this.form.notes,
      };

      try {
        data.id = Utils.generateId();

        if (this.apiConfigured) {
          const result = await API.addInsole(data);
          if (result.data) data.id = result.data.id;
        }

        data.lastModified = Utils.nowISO();
        data._highlight = true;
        this.insoles.push(data);

        // Remove highlight after animation
        setTimeout(() => {
          const i = this.insoles.find(x => x.id === data.id);
          if (i) i._highlight = false;
        }, 2500);

        this.toast('Insole added', 'success');
        this.saveToCache();
        this.applyFilters();
        this.closeDrawer();
      } catch (err) {
        console.error('Save failed:', err);
        this.toast('Failed to save — ' + err.message, 'error');
      } finally {
        this.saving = false;
      }
    },

    // ── Delete ──────────────────────────────────────────────────────────────

    confirmDelete(insole) {
      this.deleteTarget = insole;
      this.deleteModalOpen = true;
    },

    closeDeleteModal() {
      this.deleteModalOpen = false;
      this.deleteTarget = null;
    },

    async deleteInsole() {
      if (!this.deleteTarget) return;
      this.deleting = true;

      try {
        if (this.apiConfigured) {
          await API.deleteInsole(this.deleteTarget.id);
        }

        this.insoles = this.insoles.filter(i => i.id !== this.deleteTarget.id);
        this.saveToCache();
        this.applyFilters();
        this.toast('Insole deleted', 'success');
        this.closeDeleteModal();
      } catch (err) {
        console.error('Delete failed:', err);
        this.toast('Failed to delete — ' + err.message, 'error');
      } finally {
        this.deleting = false;
      }
    },

    // ── History ─────────────────────────────────────────────────────────────

    async openHistory(insole) {
      this.historyInsole = insole;
      this.historyOpen = true;
      this.historyLoading = true;
      this.history = [];

      if (this.apiConfigured) {
        try {
          const result = await API.fetchHistory(insole.id);
          this.history = result.data || [];
        } catch (err) {
          console.error('Failed to load history:', err);
          this.toast('Failed to load history', 'error');
        }
      }

      this.historyLoading = false;
    },

    closeHistory() {
      this.historyOpen = false;
      this.historyInsole = null;
      this.history = [];
    },

    // ── Settings ────────────────────────────────────────────────────────────

    openSettings() {
      this.settings = {
        teamMembers: [...Utils.getTeamMembers()],
        clients: [...Utils.getClients()],
        investors: [...Utils.getInvestors()],
        sizes: JSON.parse(JSON.stringify(Utils.getSizes())),
      };
      this.settingsOpen = true;
    },

    closeSettings() {
      this.settingsOpen = false;
    },

    addTeamMember() {
      this.settings.teamMembers.push('');
    },

    removeTeamMember(idx) {
      this.settings.teamMembers.splice(idx, 1);
    },

    addClient() {
      this.settings.clients.push('');
    },

    removeClient(idx) {
      this.settings.clients.splice(idx, 1);
    },

    addInvestor() {
      this.settings.investors.push('');
    },

    removeInvestor(idx) {
      this.settings.investors.splice(idx, 1);
    },

    addSize() {
      this.settings.sizes.push({ code: '', range: '' });
    },

    removeSize(idx) {
      this.settings.sizes.splice(idx, 1);
    },

    saveSettings() {
      // Filter out empty entries
      const teamMembers = this.settings.teamMembers.filter(m => m.trim());
      const clients = this.settings.clients.filter(c => c.trim());
      const investors = this.settings.investors.filter(i => i.trim());
      const sizes = this.settings.sizes.filter(s => s.code.trim() && s.range.trim());

      if (teamMembers.length === 0) {
        this.toast('At least one team member is required', 'error');
        return;
      }
      if (sizes.length === 0) {
        this.toast('At least one size is required', 'error');
        return;
      }

      Utils.saveTeamMembers(teamMembers);
      Utils.saveClients(clients);
      Utils.saveInvestors(investors);
      Utils.saveSizes(sizes);

      this.toast('Settings saved', 'success');
      this.closeSettings();

      // Re-apply filters to reflect changes
      this.applyFilters();
    },

    // ── Toasts ──────────────────────────────────────────────────────────────

    toast(message, type = 'info') {
      const id = ++this._toastId;
      this.toasts.push({ id, message, type, leaving: false });

      // Auto-dismiss after 4 seconds
      setTimeout(() => {
        const t = this.toasts.find(x => x.id === id);
        if (t) t.leaving = true;
        // Remove after exit animation
        setTimeout(() => {
          this.toasts = this.toasts.filter(x => x.id !== id);
        }, 300);
      }, 4000);
    },
  });
});
