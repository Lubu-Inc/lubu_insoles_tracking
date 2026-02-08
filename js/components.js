// ─── Insole Tracker — Alpine Components ─────────────────────────────────────

// ── Location Autocomplete Component ──────────────────────────────────────────
function locationAutocomplete() {
  return {
    showSuggestions: false,
    activeIndex: -1,
    showAll: false, // Flag to show all locations on focus

    get filteredLocations() {
      const input = (Alpine.store('app').form.location || '').toLowerCase();
      const allLocations = Utils.getKnownLocations(Alpine.store('app').insoles);

      // Show all locations if showAll flag is true (on focus) or input is empty
      if (this.showAll || !input) return allLocations;

      // Otherwise filter by input
      return allLocations.filter(loc => loc.toLowerCase().includes(input));
    },

    onFocus() {
      this.showAll = true;
      this.showSuggestions = true;
      this.activeIndex = -1;
    },

    onInput() {
      this.showAll = false; // Disable show all when user starts typing
      this.showSuggestions = true;
      this.activeIndex = -1;
    },

    hideSuggestions() {
      // Delay to allow click events to fire
      setTimeout(() => {
        this.showSuggestions = false;
        this.showAll = false;
      }, 150);
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
