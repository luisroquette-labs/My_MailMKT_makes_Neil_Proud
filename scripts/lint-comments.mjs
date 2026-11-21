#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import ts from "typescript";

const paths = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const checked = /\.(?:ts|tsx|js|mjs|css|sql|html|ya?ml)$|(?:^|\/)\.gitignore$/;
const generated = /^dashboard\/next-env\.d\.ts$/;
let errors = 0;

function tsComments(path, source) {
  const syntax = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, path.endsWith(".tsx") ? ts.ScriptKind.TSX : /\.(?:js|mjs)$/.test(path) ? ts.ScriptKind.JS : ts.ScriptKind.TS);
  const offsets = new Set();
  function visit(node) {
    for (const range of [
      ...(ts.getLeadingCommentRanges(source, node.getFullStart()) ?? []),
      ...(ts.getTrailingCommentRanges(source, node.getEnd()) ?? []),
      ...(ts.isJsxExpression(node) ? ts.getTrailingCommentRanges(source, node.getStart() + 1) ?? [] : []),
    ]) offsets.add(range.pos);
    ts.forEachChild(node, visit);
  }
  visit(syntax);
  return [...offsets].sort((a, b) => a - b);
}

assert.equal(tsComments("sample.ts", '#!/usr/bin/env node\nconst url = "https://example.com/a//b";\nconst template = `https://${"example.com"}`;').length, 0);
assert.equal(tsComments("sample.tsx", "const element = <div>{/* forbidden */}</div>;").length, 1);
assert.equal(tsComments("sample.ts", "const x = 1; // forbidden").length, 1);

for (const path of paths) {
  if (!checked.test(path) || generated.test(path)) continue;
  const source = readFileSync(path, "utf8");
  const comments = [];
  if (/\.(?:ts|tsx|js|mjs)$/.test(path)) {
    comments.push(...tsComments(path, source));
  } else if (/\.css$/.test(path)) {
    for (const match of source.matchAll(/\/\*[\s\S]*?\*\//g)) comments.push(match.index);
  } else if (/\.sql$/.test(path)) {
    for (const match of source.matchAll(/^\s*--.*$/gm)) comments.push(match.index);
  } else if (/\.html$/.test(path)) {
    for (const match of source.matchAll(/<!--[\s\S]*?-->/g)) comments.push(match.index);
    for (const match of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
      const start = match.index + match[0].indexOf(match[1]);
      for (const offset of tsComments("inline.js", match[1])) comments.push(start + offset);
    }
    for (const match of source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
      const start = match.index + match[0].indexOf(match[1]);
      for (const comment of match[1].matchAll(/\/\*[\s\S]*?\*\//g)) comments.push(start + comment.index);
    }
  } else if (/\.ya?ml$/.test(path)) {
    for (const match of source.matchAll(/(?:^|\s)#\s.*$/gm)) comments.push(match.index);
  } else {
    for (const match of source.matchAll(/^\s*#.*$/gm)) comments.push(match.index);
  }
  const allowance = 0;
  if (comments.length > allowance) {
    for (const offset of comments.slice(allowance)) {
      const line = source.slice(0, offset).split("\n").length;
      console.error(`${path}:${line}: comment exceeds allowance ${allowance}`);
    }
    errors += comments.length - allowance;
  }
}

if (errors) process.exitCode = 1;
