#!/usr/bin/env node
/* build.mjs - bundles the ES modules and stylesheets into single-file outputs.
   dist/index.html    : complete standalone page (no external files except Google Fonts)
   dist/artifact.html : the same without doctype/head/body, for hosts that supply their own skeleton
   The source files stay the deployable site for GitHub Pages; this is only for single-file targets. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const read = f => readFileSync(join(root, f), 'utf8');

/* Modules are concatenated in dependency order; imports/exports are stripped. Names must not collide across files. */
const MODULES = ['data.js', 'compose.js', 'components.js', 'app.js'];
const stripModuleSyntax = src => src
  .replace(/^import\s[\s\S]*?from\s+'[^']+';\s*$/gm, '')
  .replace(/^export\s+(?=(const|let|function|class)\b)/gm, '');
const js = MODULES.map(f => `/* ---- ${f} ---- */\n${stripModuleSyntax(read(f))}`).join('\n');
const css = `${read('tokens.css')}\n${read('app.css')}`;

const html = read('index.html');
const headMatch = html.match(/<head>([\s\S]*?)<\/head>/);
const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/);
const head = headMatch[1]
  .replace(/\s*<link rel="stylesheet" href="\.\/tokens\.css">/, '')
  .replace(/\s*<link rel="stylesheet" href="\.\/app\.css">/, `\n  <style>\n${css}\n  </style>`);
const body = bodyMatch[1].replace(/<script type="module" src="\.\/app\.js"><\/script>/, `<script>\n(function () {\n'use strict';\n${js}\n})();\n</script>`);

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/index.html'), `<!doctype html>\n<html lang="en-GB">\n<head>${head}</head>\n<body>${body}</body>\n</html>\n`);
/* Artifact fragment: title + fonts + style first (the host scans the first 8KB for <title>), then the body content */
const titleAndLinks = head.replace(/<meta[^>]*>\s*/g, '').replace(/<link rel="icon"[^>]*>\s*/, '');
writeFileSync(join(root, 'dist/artifact.html'), `${titleAndLinks.trim()}\n${body}`);
console.log('built dist/index.html and dist/artifact.html');
