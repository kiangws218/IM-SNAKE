"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { normalize, paragraphs, report } = require("./import-arcweave.js");

const inputPath = process.argv[2] || path.join(__dirname, "..", "story", "source", "project_settings.json");
const graph = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const result = normalize(graph);

assert.strictEqual(result.start, graph.startingElement, "起点 UUID 应原样保留");
assert.strictEqual(result.stats.nodeCount, Object.keys(graph.elements || {}).length);
assert.strictEqual(result.stats.connectionCount, Object.keys(graph.connections || {}).length);
assert(result.nodes.every(node => node.uuid === node.id), "节点必须保留 UUID");
assert.deepStrictEqual(paragraphs("<p>第一句</p><p></p><p>第二句</p>"), { pages: ["第一句", "第二句"], emptyCount: 1, sourceParagraphCount: 3 });
assert(result.nodes.some(node => node.outletKind === "terminal"), "应识别 0 出口节点");
assert(result.nodes.some(node => node.outletKind === "linear"), "应识别 1 出口节点");
assert(result.nodes.some(node => node.outletKind === "branch"), "应识别多出口节点");
const first = result.nodes.find(node => node.id === graph.startingElement);
assert(first && first.title === "序章", "起点标题应清理 HTML");
assert(result.nodes.reduce((sum, node) => sum + node.pages.length, 0) > 0, "应导入正文页面");
assert.strictEqual(typeof report(result), "string");
console.log(`arcweave-tests: ${result.nodes.length} nodes, ${result.stats.ignoredEmptyParagraphs} empty paragraphs, all passed`);
