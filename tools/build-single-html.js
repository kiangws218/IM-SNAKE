#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourceDir = path.join(root, "prototype");
const sourceFile = path.join(sourceDir, "index.html");
const outputFile = path.join(root, "dist", "IM-SNAKE-mobile.html");
let html = fs.readFileSync(sourceFile, "utf8");

html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => {
  const file = path.resolve(sourceDir, src);
  if (!file.startsWith(sourceDir + path.sep) || !fs.existsSync(file)) throw new Error("Missing local script: " + src);
  const code = fs.readFileSync(file, "utf8").replace(/<\/script/gi, "<\\/script");
  return `<script>\n/* bundled: ${src} */\n${code}\n<\/script>`;
});

if (/<script src=/.test(html)) throw new Error("Bundle still contains external scripts");
fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, html, "utf8");
console.log(outputFile);
