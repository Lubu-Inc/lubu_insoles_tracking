// ─── Insole Tracker — Alpine Components ─────────────────────────────────────

// ── Location Autocomplete Component ──────────────────────────────────────────
function locationAutocomplete() {
  return {
    showSuggestions: false,
    activeIndex: -1,
    editingLocation: null,
    editValue: '',

    get filteredLocations() {
      const input = (Alpine.store('app').form.location || '').toLowerCase();
      const allLocs = Utils.getKnownLocations(Alpine.store('app').insoles);
      if (!input) return allLocs;
      return allLocs.filter(loc => loc.toLowerCase().includes(input));
    },

    get canCreateNew() {
      const input = (Alpine.store('app').form.location || '').trim();
      if (!input) return false;
      const allLocs = Utils.getKnownLocations(Alpine.store('app').insoles);
      return !allLocs.some(loc => loc.toLowerCase() === input.toLowerCase());
    },

    onInput() {
      this.showSuggestions = true;
      this.activeIndex = -1;
    },

    hideSuggestions() {
      // Delay to allow click events to fire
      setTimeout(() => { this.showSuggestions = false; }, 200);
    },

    navigateSuggestion(dir) {
      const len = this.filteredLocations.length;
      if (len === 0) return;
      this.activeIndex = (this.activeIndex + dir + len) % len;
    },

    selectActive() {
      if (this.activeIndex >= 0 && this.activeIndex < this.filteredLocations.length) {
        this.selectLocation(this.filteredLocations[this.activeIndex]);
      } else {
        this.showSuggestions = false;
      }
    },

    selectLocation(loc) {
      Alpine.store('app').form.location = loc;
      this.showSuggestions = false;
      this.activeIndex = -1;
    },

    createNewLocation() {
      const input = Alpine.store('app').form.location.trim();
      if (!input) return;
      // Just use the input value - it will be saved when the insole is saved
      this.showSuggestions = false;
    },

    startEdit(loc, event) {
      event.stopPropagation();
      this.editingLocation = loc;
      this.editValue = loc;
    },

    saveEdit(oldLoc, event) {
      event.stopPropagation();
      const newLoc = this.editValue.trim();
      if (!newLoc || newLoc === oldLoc) {
        this.editingLocation = null;
        return;
      }

      // Determine if it's team member, client, or neither
      const teamMembers = Utils.getTeamMembers();
      const clients = Utils.getClients();

      if (teamMembers.includes(oldLoc)) {
        const idx = teamMembers.indexOf(oldLoc);
        teamMembers[idx] = newLoc;
        Utils.saveTeamMembers(teamMembers);
      } else if (clients.includes(oldLoc)) {
        const idx = clients.indexOf(oldLoc);
        clients[idx] = newLoc;
        Utils.saveClients(clients);
      }

      this.editingLocation = null;
      Alpine.store('app').toast('Location updated', 'success');
    },

    cancelEdit(event) {
      event.stopPropagation();
      this.editingLocation = null;
    },

    deleteLocation(loc, event) {
      event.stopPropagation();

      const teamMembers = Utils.getTeamMembers();
      const clients = Utils.getClients();

      if (teamMembers.includes(loc)) {
        Utils.saveTeamMembers(teamMembers.filter(m => m !== loc));
        Alpine.store('app').toast('Team member removed', 'success');
      } else if (clients.includes(loc)) {
        Utils.saveClients(clients.filter(c => c !== loc));
        Alpine.store('app').toast('Client removed', 'success');
      }
    },

    isTeamOrClient(loc) {
      return Utils.getTeamMembers().includes(loc) || Utils.getClients().includes(loc);
    },

    getLocationType(loc) {
      if (Utils.getTeamMembers().includes(loc)) return 'Team';
      if (Utils.getClients().includes(loc)) return 'Client';
      return '';
    },
  };
}
