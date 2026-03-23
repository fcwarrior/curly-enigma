#!/usr/bin/env node
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('script.js', 'utf8');

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exitCode = 1;
  }
}

const requiredNavIds = [
  'prescription-nav-btn',
  'reports-nav-btn',
  'patients-nav-btn',
  'solutions-nav-btn',
  'settings-nav-btn',
  'evolution-nav-btn',
  'performance-nav-btn'
];

const requiredSectionIds = [
  'prescription-section',
  'reports-section',
  'patients-section',
  'solutions-section',
  'settings-section',
  'evolution-section',
  'performance-section'
];

requiredNavIds.forEach((id) => assert(html.includes(`id="${id}"`), `Missing nav id ${id}`));
requiredSectionIds.forEach((id) => assert(html.includes(`id="${id}"`), `Missing section id ${id}`));

assert(js.includes("window.location.hash = sectionId"), 'Hash routing assignment missing');
assert(js.includes("showSection(sectionId)"), 'showSection(sectionId) call missing');
assert(js.includes("document.querySelectorAll('.nav-btn[id$=\"-nav-btn\"]')") || js.includes("document.querySelectorAll('.nav-btn[id$=\"-nav-btn\"]').forEach"), 'Nav listener selector missing');

if (!process.exitCode) console.log('UI contract check: OK');
