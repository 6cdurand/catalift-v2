#!/usr/bin/env node
/**
 * Exercise Library Audit Verifier — w6b
 *
 * Checks invariants INV-1 through INV-5 and exits non-zero on FAIL-level issues.
 * Run: npm run audit:exercises
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

// Read the exercises.ts source and extract the library data via regex.
// We can't import the TS module directly in plain Node ESM, so we parse
// the exported arrays from source.
const src = readFileSync(join(repoRoot, 'src/lib/exercises.ts'), 'utf-8');

// Extract all object entries from _rawExerciseLibrary, warmupExercises, and cardioExercises.
// We use a lightweight parser: find each `{ id: '...', ... }` block.
function extractExercises(source, arrayName) {
  const startMarker = `const ${arrayName}`;
  const startIdx = source.indexOf(startMarker);
  if (startIdx === -1) return [];
  // Find the opening bracket
  const bracketIdx = source.indexOf('[', startIdx);
  const endBracket = source.indexOf('];', bracketIdx);
  const block = source.slice(bracketIdx + 1, endBracket);

  const exercises = [];
  // Match each object with an id field
  const objRegex = /\{[^}]*\}/gs;
  let match;
  while ((match = objRegex.exec(block)) !== null) {
    const objText = match[0];
    const idMatch = objText.match(/id:\s*['"`]([^'"`]+)['"`]/);
    const nameMatch = objText.match(/name:\s*['"`]([^'"`]+)['"`]/);
    if (!idMatch) continue;

    const aliasesMatch = objText.match(/aliases:\s*\[([^\]]*)\]/);
    const alternativesMatch = objText.match(/alternatives:\s*\[([^\]]*)\]/);
    const unilateralMatch = objText.match(/unilateralVariantId:\s*['"`]([^'"`]+)['"`]/);

    const parseStringArray = (raw) => {
      if (!raw) return [];
      const items = [];
      const re = /['"`]([^'"`]+)['"`]/g;
      let m;
      while ((m = re.exec(raw)) !== null) items.push(m[1]);
      return items;
    };

    exercises.push({
      id: idMatch[1],
      name: nameMatch ? nameMatch[1] : '',
      aliases: parseStringArray(aliasesMatch?.[1]),
      alternatives: parseStringArray(alternativesMatch?.[1]),
      unilateralVariantId: unilateralMatch?.[1] || null,
    });
  }
  return exercises;
}

const rawLib = extractExercises(src, '_rawExerciseLibrary');
const warmupLib = extractExercises(src, 'warmupExercises');
const cardioLib = extractExercises(src, 'cardioExercises');

// Deduplicate: exerciseLibrary takes priority, then warmup, then cardio (mirrors allExercises)
const seen = new Set();
const all = [];
for (const ex of [...rawLib, ...warmupLib, ...cardioLib]) {
  if (!seen.has(ex.id)) {
    seen.add(ex.id);
    all.push(ex);
  }
}

const allIds = new Set(all.map(e => e.id));
let hasFail = false;
const warnings = [];

// INV-1: No duplicate ids within any single array (cross-array repeats are expected — allExercises dedups by priority)
function findDupesInArray(arr, label) {
  const counts = {};
  for (const ex of arr) counts[ex.id] = (counts[ex.id] || 0) + 1;
  return Object.entries(counts).filter(([, c]) => c > 1).map(([id, count]) => ({ id, count, label }));
}
const intraDupes = [
  ...findDupesInArray(rawLib, '_rawExerciseLibrary'),
  ...findDupesInArray(warmupLib, 'warmupExercises'),
  ...findDupesInArray(cardioLib, 'cardioExercises'),
];
// Cross-array repeats (expected, but reported as info)
const crossArrayIds = new Set();
const allArrayIds = new Map();
for (const ex of rawLib) allArrayIds.set(ex.id, (allArrayIds.get(ex.id) || []).concat('_rawExerciseLibrary'));
for (const ex of warmupLib) allArrayIds.set(ex.id, (allArrayIds.get(ex.id) || []).concat('warmupExercises'));
for (const ex of cardioLib) allArrayIds.set(ex.id, (allArrayIds.get(ex.id) || []).concat('cardioExercises'));
for (const [id, arrays] of allArrayIds) {
  if (arrays.length > 1) crossArrayIds.add(id);
}
if (intraDupes.length > 0) {
  console.error('❌ INV-1 FAIL: Duplicate ids within a single array:');
  for (const d of intraDupes) {
    console.error(`   ${d.id} appears ${d.count} times in ${d.label}`);
  }
  hasFail = true;
} else {
  console.log('✅ INV-1 PASS: No duplicate ids within any single array');
  if (crossArrayIds.size > 0) {
    console.log(`   ℹ️  ${crossArrayIds.size} ids appear in multiple arrays (expected — allExercises dedups by priority)`);
  }
}

// INV-2: Every alternatives[] / unilateralVariantId resolves to existing id
const dangling = [];
for (const ex of all) {
  for (const alt of ex.alternatives) {
    if (!allIds.has(alt)) dangling.push(`${ex.id} → alternatives: '${alt}' (not found)`);
  }
  if (ex.unilateralVariantId && !allIds.has(ex.unilateralVariantId)) {
    dangling.push(`${ex.id} → unilateralVariantId: '${ex.unilateralVariantId}' (not found)`);
  }
}
if (dangling.length > 0) {
  console.error('❌ INV-2 FAIL: Dangling alternatives/unilateralVariantId references:');
  for (const d of dangling) console.error(`   ${d}`);
  hasFail = true;
} else {
  console.log('✅ INV-2 PASS: All alternatives/unilateralVariantId resolve to existing ids');
}

// INV-3: No alias collides with another exercise's id or primary name
const aliasCollisions = [];
for (const ex of all) {
  for (const alias of ex.aliases) {
    const aliasLower = alias.toLowerCase();
    if (allIds.has(aliasLower) && aliasLower !== ex.id) {
      aliasCollisions.push(`${ex.id} alias '${alias}' collides with id '${aliasLower}'`);
    }
    for (const other of all) {
      if (other.id === ex.id) continue;
      if (other.name.toLowerCase() === aliasLower) {
        aliasCollisions.push(`${ex.id} alias '${alias}' collides with name of ${other.id} ('${other.name}')`);
      }
    }
  }
}
if (aliasCollisions.length > 0) {
  console.error('❌ INV-3 FAIL: Alias collisions:');
  for (const c of aliasCollisions) console.error(`   ${c}`);
  hasFail = true;
} else {
  console.log('✅ INV-3 PASS: No alias↔id/name collisions');
}

// INV-4: alternatives links are symmetric (WARN only)
for (const ex of all) {
  for (const alt of ex.alternatives) {
    const target = all.find(e => e.id === alt);
    if (target && !target.alternatives.includes(ex.id)) {
      warnings.push(`INV-4 WARN: ${ex.id} links ${alt} but ${alt} does not link back`);
    }
  }
}
if (warnings.length > 0) {
  console.warn(`⚠️  INV-4 WARN: ${warnings.length} asymmetric alternative link(s)`);
  for (const w of warnings) console.warn(`   ${w}`);
} else {
  console.log('✅ INV-4 PASS: All alternatives links are symmetric');
}

// INV-5: Count report
const withAliases = all.filter(e => e.aliases.length > 0).length;
const withAlternatives = all.filter(e => e.alternatives.length > 0).length;
const withUnilateral = all.filter(e => e.unilateralVariantId).length;
console.log('\n📊 INV-5 Summary:');
console.log(`   Total exercises: ${all.length}`);
console.log(`   With aliases: ${withAliases}`);
console.log(`   With alternatives: ${withAlternatives}`);
console.log(`   With unilateralVariantId: ${withUnilateral}`);
console.log(`   Cross-array repeats: ${crossArrayIds.size}`);

if (hasFail) {
  console.error('\n🔴 Audit FAILED — fix FAIL-level issues before merging.');
  process.exit(1);
} else {
  console.log('\n🟢 Audit PASSED — all FAIL-level invariants green.');
  process.exit(0);
}
