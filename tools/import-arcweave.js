"use strict";

const fs = require("fs");
const path = require("path");

function stripHtml(value) {
  return String(value == null ? "" : value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function paragraphs(value) {
  const html = String(value == null ? "" : value);
  const matches = [...html.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi)];
  if (!matches.length) {
    const text = stripHtml(html);
    return { pages: text ? [text] : [], emptyCount: text ? 0 : (html ? 1 : 0), sourceParagraphCount: html ? 1 : 0 };
  }
  let emptyCount = 0;
  const pages = [];
  for (const match of matches) {
    const text = stripHtml(match[1]);
    if (!text) { emptyCount += 1; continue; }
    pages.push(text);
  }
  return { pages, emptyCount, sourceParagraphCount: matches.length };
}

function normalize(graph) {
  const elements = graph.elements || {};
  const connections = graph.connections || {};
  const outgoing = new Map();
  const warnings = [];
  const nodes = Object.entries(elements).map(([id, element]) => {
    const content = paragraphs(element.content);
    const title = stripHtml(element.title);
    const outputs = (element.outputs || []).map(connectionId => {
      const connection = connections[connectionId];
      if (!connection) {
        warnings.push({ code: "missing-connection", elementId: id, connectionId });
        return { id: connectionId, targetId: null, label: "", labelPages: [], missing: true };
      }
      const label = paragraphs(connection.label);
      return {
        id: connectionId,
        targetId: connection.targetid || null,
        label: label.pages.join("\n"),
        labelPages: label.pages,
        sourceId: connection.sourceid || id,
        sourceMismatch: connection.sourceid && connection.sourceid !== id ? true : undefined
      };
    });
    outgoing.set(id, outputs);
    const kind = outputs.length === 0 ? "terminal" : outputs.length === 1 ? "linear" : "branch";
    return {
      id,
      uuid: id,
      title,
      pages: content.pages,
      sourceParagraphCount: content.sourceParagraphCount,
      ignoredEmptyParagraphs: content.emptyCount,
      outputs,
      outletCount: outputs.length,
      outletKind: kind,
      components: element.components || []
    };
  });
  const nodeIds = new Set(nodes.map(node => node.id));
  for (const node of nodes) {
    for (const output of node.outputs) {
      if (output.targetId && !nodeIds.has(output.targetId)) {
        warnings.push({ code: "missing-target", connectionId: output.id, targetId: output.targetId, sourceId: node.id });
      }
      if (output.sourceMismatch) warnings.push({ code: "source-mismatch", connectionId: output.id, sourceId: output.sourceId, elementId: node.id });
    }
  }
  const reachable = new Set();
  const queue = graph.startingElement && nodeIds.has(graph.startingElement) ? [graph.startingElement] : [];
  while (queue.length) {
    const id = queue.shift();
    if (reachable.has(id)) continue;
    reachable.add(id);
    for (const output of outgoing.get(id) || []) if (output.targetId && !reachable.has(output.targetId)) queue.push(output.targetId);
  }
  for (const node of nodes) if (!reachable.has(node.id)) warnings.push({ code: "unreachable", elementId: node.id, title: node.title });
  const emptyParagraphs = nodes.reduce((sum, node) => sum + node.ignoredEmptyParagraphs, 0);
  const branchCounts = { zero: 0, one: 0, many: 0 };
  for (const node of nodes) branchCounts[node.outletCount === 0 ? "zero" : node.outletCount === 1 ? "one" : "many"] += 1;
  return {
    schemaVersion: 1,
    source: { format: "arcweave-project-settings", name: graph.name || "", startingElement: graph.startingElement || null },
    start: graph.startingElement || null,
    nodes,
    connections: Object.entries(connections).map(([id, connection]) => {
      const label = paragraphs(connection.label);
      return {
        id,
        uuid: id,
        sourceId: connection.sourceid || null,
        targetId: connection.targetid || null,
        label: label.pages.join("\n"),
        labelPages: label.pages
      };
    }),
    stats: { nodeCount: nodes.length, connectionCount: Object.keys(connections).length, reachableCount: reachable.size, ignoredEmptyParagraphs: emptyParagraphs, outletCounts: branchCounts },
    warnings
  };
}

function report(normalized) {
  const lines = ["# Arcweave 导入待确认报告", "", `- 节点：${normalized.stats.nodeCount}`, `- 连接：${normalized.stats.connectionCount}`, `- 可达节点：${normalized.stats.reachableCount}`, `- 忽略的空段落：${normalized.stats.ignoredEmptyParagraphs}`, `- 出口分布：0出口 ${normalized.stats.outletCounts.zero}，1出口 ${normalized.stats.outletCounts.one}，多出口 ${normalized.stats.outletCounts.many}`, "", "## 待确认项", ""];
  if (!normalized.warnings.length) lines.push("无结构性警告。仍需由作者确认每个分支的游戏内触发条件。", "");
  else normalized.warnings.forEach((warning, index) => lines.push(`${index + 1}. **${warning.code}**：${JSON.stringify(warning)}`));
  lines.push("", "## 自动转换约定", "", "- 每个非空 `<p>` 生成一个独立 pages 项；空 `<p>` 忽略但计数。", "- 无标签连接保留为空标签，由运行时/作者决定自动继续。", "- 多出口只保留连接数据，不猜测选项条件。", "- 本报告和规范化 JSON 不会覆盖正式 story-data.js。", "");
  return lines.join("\n");
}

function main() {
  const input = process.argv[2];
  if (!input) { console.error("Usage: node tools/import-arcweave.js <project_settings.json> [output-dir]"); process.exit(2); }
  const outputDir = path.resolve(process.argv[3] || path.join(__dirname, "..", "story", "generated"));
  const graph = JSON.parse(fs.readFileSync(path.resolve(input), "utf8"));
  const normalized = normalize(graph);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "arcweave.normalized.json"), JSON.stringify(normalized, null, 2) + "\n", "utf8");
  fs.writeFileSync(path.join(outputDir, "arcweave.review.md"), report(normalized), "utf8");
  console.log(`arcweave-import: ${normalized.stats.nodeCount} nodes, ${normalized.stats.connectionCount} connections, ${normalized.stats.ignoredEmptyParagraphs} empty paragraphs ignored`);
  console.log(`arcweave-import: wrote ${outputDir}`);
}

if (require.main === module) main();
module.exports = { normalize, paragraphs, stripHtml, report };
