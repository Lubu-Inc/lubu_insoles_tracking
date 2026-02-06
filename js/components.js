// ─── Insole Tracker — Alpine Components ─────────────────────────────────────

// ── Location Autocomplete Component ──────────────────────────────────────────
function locationAutocomplete() {
  return {
    showSuggestions: false,
    activeIndex: -1,

    get filteredLocations() {
      const input = (Alpine.store('app').form.location || '').toLowerCase();
      if (!input) return Utils.getKnownLocations(Alpine.store('app').insoles);
      return Utils.getKnownLocations(Alpine.store('app').insoles)
        .filter(loc => loc.toLowerCase().includes(input));
    },

    onInput() {
      this.showSuggestions = true;
      this.activeIndex = -1;
    },

    hideSuggestions() {
      // Delay to allow click events to fire
      setTimeout(() => { this.showSuggestions = false; }, 150);
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
  };
}
