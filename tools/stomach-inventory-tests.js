const assert = require("assert");
const { StomachInventory } = require("../prototype/stomach-inventory.js");

function test(name, fn) { fn(); console.log("ok - " + name); }

test("bean slot is permanent and starts empty", () => {
  const inv = new StomachInventory();
  assert.deepStrictEqual(inv.getSelected().id, "bean");
  assert.strictEqual(inv.getSelected().count, 0);
  assert.strictEqual(inv.getLengthContribution(), 0);
});

test("duplicate pickups stack instead of creating duplicate slots", () => {
  const inv = new StomachInventory();
  assert.strictEqual(inv.add("ketiCorpse").added, 1);
  assert.strictEqual(inv.add("ketiCorpse", 2).added, 0);
  assert.strictEqual(inv.getSlots().filter(s => s.id === "ketiCorpse").length, 1);
  assert.strictEqual(inv.getCount("ketiCorpse"), 1);
  assert.strictEqual(inv.getLengthContribution(), 2);
});

test("cycle wraps through stable slots, including empty bean slot", () => {
  const inv = new StomachInventory({ beans: 2 });
  inv.add("ketiCorpse");
  assert.strictEqual(inv.next().id, "ketiCorpse");
  assert.strictEqual(inv.next().id, "bean");
  assert.strictEqual(inv.previous().id, "ketiCorpse");
});

test("firing removes an emptied special slot and returns to beans", () => {
  const inv = new StomachInventory({ beans: 4 });
  inv.add("ketiCorpse");
  inv.next();
  const fired = inv.consumeSelected();
  assert.strictEqual(fired.fired, true);
  assert.strictEqual(fired.id, "ketiCorpse");
  assert.strictEqual(inv.getCount("ketiCorpse"), 0);
  assert.strictEqual(inv.getSelected().id, "bean");
  assert.strictEqual(inv.getSlots().some(slot => slot.id === "ketiCorpse"), false);
});

test("adapter aliases expose selected status and weight deltas", () => {
  const inv = new StomachInventory();
  assert.strictEqual(inv.add("ketiCorpse").addedWeight, 2);
  assert.strictEqual(inv.selected().id, "bean");
  assert.strictEqual(inv.status().lengthContribution, 2);
  assert.strictEqual(inv.status().weight, 3);
  inv.next();
  assert.strictEqual(inv.consumeSelected().removedWeight, 2);
});

test("empty selected item cannot fire", () => {
  const inv = new StomachInventory();
  const result = inv.useSelected();
  assert.strictEqual(result.fired, false);
  assert.strictEqual(result.reason, "empty");
});

test("snapshot and restore preserve counts, selection, and length", () => {
  const inv = new StomachInventory({ beans: 5 });
  inv.add("ketiCorpse", 1);
  inv.next();
  const restored = new StomachInventory({ state: inv.snapshot() });
  assert.deepStrictEqual(restored.snapshot(), inv.snapshot());
  assert.strictEqual(restored.getLengthContribution(), 2);
});

test("chapter one special items expose projectile and identity rules", () => {
  const inv = new StomachInventory();
  assert.strictEqual(inv.add("ironSword").item.damageMult, 2);
  assert.strictEqual(inv.add("ironSword").added, 1);
  assert.strictEqual(inv.getCount("ironSword"), 2);
  assert.strictEqual(inv.getWeight(), 4);
  assert.strictEqual(inv.getLengthContribution(), 2);
  assert.strictEqual(inv.add("ajieBones").item.damage, 2);
  assert.strictEqual(inv.add("lisiBones").item.actorId, "lisi");
  assert.strictEqual(inv.getLengthContribution(), 4);
  assert.strictEqual(inv.getWeight(), 6);
  const removed = inv.remove("ajieBones");
  assert.strictEqual(removed.removedWeight, 1);
  assert.strictEqual(inv.getCount("ajieBones"), 0);
  assert.strictEqual(inv.add("ajian").item.releaseActor, true);
  const potion = inv.add("healingPotion").item;
  assert.strictEqual(potion.weight, 1);
  assert.strictEqual(potion.healing, 1);
  assert.strictEqual(potion.consumableOnImpact, true);
});

console.log("stomach inventory tests: all green");
