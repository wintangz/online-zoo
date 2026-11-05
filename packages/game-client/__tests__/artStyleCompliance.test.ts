import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ANIMAL_SPECIES_TO_ASSET_ID,
  ASSET_MANIFEST,
  ZOO_PALETTE
} from '@online-zoo/game-assets';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = path.resolve(__dirname, '../src');
const PALETTE_MODULE_PATH = path.resolve(SRC_ROOT, 'materials/paletteMaterials.ts');

function listSourceFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Strips single-line and multi-line comments before scanning for color literals.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

export function findDisallowedColorLiterals(source: string): string[] {
  const codeOnly = stripComments(source);
  const patterns: RegExp[] = [
    /#[0-9a-fA-F]{3,8}\b/g,
    /\brgba?\s*\([^)]*\)/gi,
    /\bhsla?\s*\([^)]*\)/gi,
    /\b0x[0-9a-fA-F]{6,8}\b/g
  ];
  const matches: string[] = [];
  for (const regex of patterns) {
    const found = codeOnly.match(regex);
    if (found) {
      matches.push(...found);
    }
  }
  return matches;
}

export function findAssetIdReferences(source: string): string[] {
  const codeOnly = stripComments(source);
  const ids: string[] = [];
  const regex = /getAssetUrl\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match: RegExpExecArray | null = regex.exec(codeOnly);
  while (match) {
    if (match[1]) {
      ids.push(match[1]);
    }
    match = regex.exec(codeOnly);
  }
  return ids;
}

describe('art-style-unification — Automated Scene/Entity Palette & Manifest Compliance', () => {
  it('detects #hex, rgb(), hsl(), and 0xhex color literals and missing manifest references when present', () => {
    expect(findDisallowedColorLiterals('color="#ff8800"')).toEqual(['#ff8800']);
    expect(findDisallowedColorLiterals('color: "rgb(255, 100, 0)"')).toEqual([
      'rgb(255, 100, 0)'
    ]);
    expect(findDisallowedColorLiterals('color: "hsl(120, 50%, 50%)"')).toEqual([
      'hsl(120, 50%, 50%)'
    ]);
    expect(findDisallowedColorLiterals('const c = 0xff00aa;')).toEqual(['0xff00aa']);
    expect(findAssetIdReferences("useGLTF(getAssetUrl('missing-model-id'))")).toEqual([
      'missing-model-id'
    ]);
  });

  it('verifies zero color literals (#..., rgb(...), hsl(...), 0x...) exist in any scene or entity file outside paletteMaterials.ts (FR-005, FR-007, SC-001)', () => {
    const allFiles = listSourceFiles(SRC_ROOT);
    const nonPaletteFiles = allFiles.filter(
      (f) => path.resolve(f) !== PALETTE_MODULE_PATH
    );
    expect(nonPaletteFiles.length).toBeGreaterThan(0);

    const violations: Array<{ file: string; literals: string[] }> = [];
    for (const filePath of nonPaletteFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      const literals = findDisallowedColorLiterals(content);
      if (literals.length > 0) {
        violations.push({
          file: path.relative(SRC_ROOT, filePath),
          literals
        });
      }
    }

    expect(violations).toEqual([]);
  });

  it('verifies every getAssetUrl(...) reference in game-client resolves to a registered entry in ASSET_MANIFEST (FR-002, FR-007, SC-002)', () => {
    const allFiles = listSourceFiles(SRC_ROOT);
    const referencedIds: string[] = [];
    const missingRefs: Array<{ file: string; assetId: string }> = [];

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      const ids = findAssetIdReferences(content);
      for (const id of ids) {
        referencedIds.push(id);
        if (!(id in ASSET_MANIFEST)) {
          missingRefs.push({
            file: path.relative(SRC_ROOT, filePath),
            assetId: id
          });
        }
      }
    }

    expect(referencedIds.length).toBeGreaterThan(0);
    expect(missingRefs).toEqual([]);

    // Also verify all animal species map to valid ASSET_MANIFEST entries
    for (const animalAssetId of Object.values(ANIMAL_SPECIES_TO_ASSET_ID)) {
      expect(animalAssetId in ASSET_MANIFEST).toBe(true);
    }
    expect(Object.keys(ZOO_PALETTE)).toHaveLength(20);
  });

  it('verifies ZooAnimalsLayer renders animal GLBs from ASSET_MANIFEST instead of primitive sphere/capsule stacks (FR-004)', () => {
    const animalsLayerPath = path.resolve(SRC_ROOT, 'entities/ZooAnimalsLayer.tsx');
    const source = stripComments(fs.readFileSync(animalsLayerPath, 'utf8'));

    expect(source).toContain('getAnimalAssetId');
    expect(source).toContain('useGLTF');
    expect(source).not.toContain('<sphereGeometry');
    expect(source).not.toContain('<capsuleGeometry');
    expect(source).not.toContain('<cylinderGeometry');
  });
});

