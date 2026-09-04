(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.IMS_STOMACH = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // The bean slot is deliberately permanent: an empty bean supply is still a
  // meaningful selected weapon and keeps the hotkey behaviour predictable.
  var DEFAULT_ITEMS = {
    // Bean ammunition is already represented by the snake's ordinary body
    // length. Only special stomach contents add reserved length here.
    bean: { id: "bean", name: "豆子", shortName: "豆子", maxStack: Infinity, length: 0 },
    ketiCorpse: { id: "ketiCorpse", name: "可蒂的尸体", shortName: "可蒂尸体", maxStack: 1, length: 2, actorId: "keti", color: "#f5f5fa" },
    ironSword: { id: "ironSword", name: "生锈的铁剑", shortName: "铁剑", maxStack: 1, length: 1, damageMult: 2, dragMult: 2, color: "#aeb3bd" },
    ajie: { id: "ajie", name: "昏迷的阿杰", shortName: "阿杰", maxStack: 1, length: 1, actorId: "ajie", releaseActor: true, color: "#6d83b3" },
    lisi: { id: "lisi", name: "昏迷的丽丝", shortName: "丽丝", maxStack: 1, length: 1, actorId: "lisi", releaseActor: true, color: "#d68aa8" },
    ajieBones: { id: "ajieBones", name: "阿杰的骨头", shortName: "阿杰骨头", maxStack: 1, length: 1, damage: 2, actorId: "ajie", color: "#e8e2cf" },
    lisiBones: { id: "lisiBones", name: "丽丝的骨头", shortName: "丽丝骨头", maxStack: 1, length: 1, damage: 2, actorId: "lisi", color: "#e8e2cf" }
  };

  function copy(value) {
    if (!value || typeof value !== "object") return value;
    if (Array.isArray(value)) return value.map(copy);
    var result = {};
    Object.keys(value).forEach(function (key) { result[key] = copy(value[key]); });
    return result;
  }

  function clampInt(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
  }

  function StomachInventory(options) {
    options = options || {};
    this.items = Object.assign({}, DEFAULT_ITEMS, options.items || {});
    this.slots = [];
    this.selectedIndex = 0;
    this._ensureSlot("bean");
    this.slots[0].count = clampInt(options.beans, 0);
    if (options.state) this.restore(options.state);
  }

  StomachInventory.prototype._item = function (id) {
    return this.items[id] || { id: id, name: id, shortName: id, maxStack: 99, length: 1 };
  };

  StomachInventory.prototype._ensureSlot = function (id) {
    for (var i = 0; i < this.slots.length; i += 1) {
      if (this.slots[i].id === id) return this.slots[i];
    }
    var item = this._item(id);
    var slot = { id: id, count: 0 };
    this.slots.push(slot);
    return slot;
  };

  StomachInventory.prototype._normalizeSelection = function () {
    if (!this.slots.length) this._ensureSlot("bean");
    if (this.selectedIndex < 0 || this.selectedIndex >= this.slots.length) this.selectedIndex = 0;
  };

  StomachInventory.prototype.add = function (id, amount) {
    amount = clampInt(amount, 1);
    if (!amount) return { added: 0, addedWeight: 0, count: this.getCount(id), item: copy(this._item(id)) };
    var slot = this._ensureSlot(id);
    var item = this._item(id);
    var room = item.maxStack === Infinity ? amount : Math.max(0, item.maxStack - slot.count);
    var added = Math.min(amount, room);
    slot.count += added;
    return { added: added, addedWeight: added * (Number(item.length) || 0), count: slot.count, item: copy(item) };
  };

  StomachInventory.prototype.addBeans = function (amount) { return this.add("bean", amount); };

  StomachInventory.prototype.remove = function (id, amount) {
    amount = clampInt(amount, 1);
    for (var i = 0; i < this.slots.length; i += 1) {
      if (this.slots[i].id !== id) continue;
      var removed = Math.min(amount, this.slots[i].count), item = this._item(id);
      this.slots[i].count -= removed;
      return { removed: removed, removedWeight: removed * (Number(item.length) || 0), item: copy(item), remaining: this.slots[i].count };
    }
    return { removed: 0, removedWeight: 0, item: copy(this._item(id)), remaining: 0 };
  };

  StomachInventory.prototype.getCount = function (id) {
    for (var i = 0; i < this.slots.length; i += 1) if (this.slots[i].id === id) return this.slots[i].count;
    return 0;
  };

  StomachInventory.prototype.getSelected = function () {
    this._normalizeSelection();
    var slot = this.slots[this.selectedIndex];
    return { index: this.selectedIndex, id: slot.id, count: slot.count, item: copy(this._item(slot.id)), available: slot.count > 0 };
  };

  StomachInventory.prototype.select = function (index) {
    this._normalizeSelection();
    var n = Number(index);
    if (!Number.isInteger(n)) return this.getSelected();
    this.selectedIndex = ((n % this.slots.length) + this.slots.length) % this.slots.length;
    return this.getSelected();
  };

  // E/Q are represented as next/previous so key mapping stays outside this module.
  StomachInventory.prototype.cycle = function (direction) {
    this._normalizeSelection();
    var step = Number(direction) < 0 ? -1 : 1;
    return this.select(this.selectedIndex + step);
  };
  StomachInventory.prototype.next = function () { return this.cycle(1); };
  StomachInventory.prototype.previous = function () { return this.cycle(-1); };

  StomachInventory.prototype.useSelected = function () {
    var selected = this.getSelected();
    if (!selected.available) return { fired: false, reason: "empty", selected: selected };
    var slot = this.slots[selected.index];
    slot.count -= 1;
    var result = { fired: true, id: slot.id, item: copy(selected.item), remaining: slot.count, removedWeight: Number(selected.item.length) || 0 };
    // Keep the empty slot selected. Equipment choice is explicit: the game
    // never silently switches back to beans after the player fires an item.
    result.selected = this.getSelected();
    return result;
  };

  // Naming aliases keep the adapter readable at call sites (pickup/launch/HUD).
  StomachInventory.prototype.consumeSelected = function () { return this.useSelected(); };
  StomachInventory.prototype.selected = function () { return this.getSelected(); };
  StomachInventory.prototype.status = function () {
    return { selected: this.getSelected(), slots: this.getSlots(), lengthContribution: this.getLengthContribution() };
  };

  StomachInventory.prototype.getLengthContribution = function () {
    return this.slots.reduce(function (total, slot) {
      var item = this._item(slot.id);
      return total + slot.count * (Number(item.length) || 0);
    }.bind(this), 0);
  };

  StomachInventory.prototype.getSlots = function () {
    return this.slots.map(function (slot, index) {
      var item = this._item(slot.id);
      return { index: index, id: slot.id, count: slot.count, item: copy(item), selected: index === this.selectedIndex, available: slot.count > 0 };
    }.bind(this));
  };

  StomachInventory.prototype.snapshot = function () {
    return { version: 1, selectedIndex: this.selectedIndex, slots: this.slots.map(function (slot) { return { id: slot.id, count: slot.count }; }) };
  };

  StomachInventory.prototype.restore = function (state) {
    if (!state || !Array.isArray(state.slots)) return false;
    this.slots = [];
    state.slots.forEach(function (raw) {
      if (!raw || typeof raw.id !== "string") return;
      var slot = this._ensureSlot(raw.id);
      slot.count = clampInt(raw.count, 0);
      var max = this._item(raw.id).maxStack;
      if (max !== Infinity) slot.count = Math.min(slot.count, max);
    }, this);
    this._ensureSlot("bean");
    this.selectedIndex = clampInt(state.selectedIndex, 0);
    this._normalizeSelection();
    return true;
  };

  return { StomachInventory: StomachInventory, DEFAULT_ITEMS: copy(DEFAULT_ITEMS) };
});
