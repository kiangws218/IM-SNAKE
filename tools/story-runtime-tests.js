"use strict";

const assert = require("assert");

global.localStorage = (() => {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    clear() { values.clear(); }
  };
})();

require("../prototype/story-events.js");
require("../prototype/story-state.js");
require("../prototype/story-runtime.js");
require("../prototype/story-dialogue.js");
require("../prototype/story-maps.js");
require("../prototype/story-data.js");

const { EventBus, TYPES } = global.IMS_STORY_EVENTS;
const { StoryStateStore, mergeDefaults } = global.IMS_STORY_STATE;
const { StoryRuntime } = global.IMS_STORY_RUNTIME;
const { splitPages } = global.IMS_STORY_DIALOGUE;

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function testEventSubscriptions() {
  const bus = new EventBus();
  let calls = 0;
  const handler = () => { calls += 1; };
  const unsubscribe = bus.on("test", handler);
  bus.emit("test");
  assert.strictEqual(calls, 1, "订阅后应收到事件");
  unsubscribe();
  bus.emit("test");
  assert.strictEqual(calls, 1, "取消订阅后不应再收到事件");

  let onceCalls = 0;
  bus.once("once", () => { onceCalls += 1; });
  bus.emit("once");
  bus.emit("once");
  assert.strictEqual(onceCalls, 1, "once 订阅只能触发一次");
}

function testStateDefaultsAndPersistence() {
  const merged = mergeDefaults({ flags: { tutorialGateBroken: true }, player: { name: "小明" } });
  assert.strictEqual(merged.flags.tutorialGateBroken, true);
  assert.strictEqual(merged.flags.tutorialExitUnlocked, false, "缺失的嵌套默认值应保留");
  assert.strictEqual(merged.player.name, "小明");
  assert.strictEqual(merged.player.bodyLength, 4, "缺失的玩家默认值应保留");

  const store = new StoryStateStore();
  store.update(state => { state.player.name = "测试玩家"; state.flags.memoryBlurSeen = true; }, "test");
  assert.strictEqual(store.save("runtime-test"), true);
  const loaded = new StoryStateStore();
  assert.strictEqual(loaded.load("runtime-test"), true);
  assert.strictEqual(loaded.get("player.name"), "测试玩家");
  assert.strictEqual(loaded.get("flags.memoryBlurSeen"), true);
}

function testDialoguePageSplitting() {
  assert.deepStrictEqual(
    splitPages("第一句\n\n第二句\r\n\r\n第三句\n仍在第三页"),
    ["第一句", "第二句", "第三句\n仍在第三页"],
    "空行应分页，普通换行应保留在同一页"
  );
  assert.deepStrictEqual(splitPages(["第一页", "", " 第二页 "]), ["第一页", "第二页"]);
}

function testStoryDataReferences() {
  const story=global.IMS_STORY_DATA.PROLOGUE,nodes=story.nodes;
  assert(nodes[story.start], "剧情起点必须存在");
  const requireNode=(target,source)=>assert(!target||nodes[target], `${source} 指向不存在的节点 ${target}`);
  for(const [id,node] of Object.entries(nodes)) {
    assert.strictEqual(node.id,id,`节点键和 id 不一致: ${id}`);
    requireNode(node.next,id+".next");
    if(node.wait)requireNode(node.wait.target,id+".wait.target");
    if(node.dialogue) {
      assert(splitPages(node.dialogue.pages||node.dialogue.text).length>0,`对话节点没有页面: ${id}`);
      for(const choice of node.dialogue.choices||[])requireNode(choice.next,id+".choice."+choice.id);
    }
  }
}

async function testRuntimeFlow() {
  const bus = new EventBus();
  const state = new StoryStateStore();
  const entered = [];
  bus.on(TYPES.NODE_ENTERED, event => entered.push(event.payload.nodeId));
  const runtime = new StoryRuntime({ bus, state, graph: {
    start: { id: "start", onEnter: { name: "mark", args: { value: "entered" } }, choices: [
      { id: "go", set: { "flags.tutorialGateBroken": true }, next: "waiting" }
    ] },
    waiting: { id: "waiting", wait: { events: [TYPES.MAP_EXIT_ENTERED], target: "done" } },
    done: { id: "done" }
  }, adapters: {
    mark(args, store) { store.update(s => { s.testMarker = args.value; }, "adapter"); }
  } });

  runtime.start("start");
  assert.deepStrictEqual(entered, ["start"]);
  assert.strictEqual(state.get("testMarker"), "entered");
  runtime.choose("go");
  assert.strictEqual(state.get("flags.tutorialGateBroken"), true);
  assert.strictEqual(state.get("currentNode"), "waiting");
  bus.emit(TYPES.MAP_EXIT_ENTERED, { exitId: "north" });
  assert.strictEqual(state.get("currentNode"), "done", "满足条件的事件应推进剧情节点");
  assert.strictEqual(state.get("lastEvent.type"), TYPES.MAP_EXIT_ENTERED);
  assert.throws(() => runtime.choose("missing"), /No choices available/);
}

async function testPredicateAndTimerCleanup() {
  const bus = new EventBus();
  const state = new StoryStateStore();
  const runtime = new StoryRuntime({ bus, state, graph: {
    wait: { id: "wait", wait: {
      events: [TYPES.ACTOR_INTERACTED],
      predicate: event => event.payload.actorId === "keti",
      target: "done"
    } },
    done: { id: "done" },
    timer: { id: "timer" }
  } });
  runtime.start("wait");
  bus.emit(TYPES.ACTOR_INTERACTED, { actorId: "merchant" });
  assert.strictEqual(state.get("currentNode"), "wait", "不满足条件的事件不应推进剧情");
  bus.emit(TYPES.ACTOR_INTERACTED, { actorId: "keti" });
  assert.strictEqual(state.get("currentNode"), "done");

  let expired = false;
  runtime.startTimer("short", 0.02, () => { expired = true; });
  runtime.stopTimer("short");
  await wait(45);
  assert.strictEqual(expired, false, "停止定时器后回调不应执行");

  runtime.startTimer("cleanup", 0.02, () => { expired = true; });
  runtime.stop();
  await wait(45);
  assert.strictEqual(expired, false, "stop 应清理所有定时器");
}

async function testStopDetachesWait() {
  const bus = new EventBus();
  const state = new StoryStateStore();
  const runtime = new StoryRuntime({ bus, state, graph: {
    wait: { id: "wait", wait: { events: [TYPES.MAP_LOADED], target: "done" } },
    done: { id: "done" }
  } });
  runtime.start("wait");
  runtime.stop();
  bus.emit(TYPES.MAP_LOADED, { mapId: "after-stop" });
  assert.strictEqual(state.get("currentNode"), "wait", "stop 后不应响应剧情事件");
  assert.strictEqual(runtime.waiting, null);
}

(async () => {
  testEventSubscriptions();
  testStateDefaultsAndPersistence();
  testDialoguePageSplitting();
  testStoryDataReferences();
  await testRuntimeFlow();
  await testPredicateAndTimerCleanup();
  await testStopDetachesWait();
  console.log("story-runtime-tests: all passed");
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
