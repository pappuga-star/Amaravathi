import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const srcRoot = path.join(process.cwd(), 'src');

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return full.endsWith('.ts') || full.endsWith('.tsx') ? [full] : [];
  });
}

describe('System settings SSOT invariants', () => {
  it('has exactly one useSystemSettings hook', () => {
    const allSource = walk(srcRoot);
    const definingFiles = allSource.filter((file) => {
      if (file.endsWith('systemSettingsInvariant.test.ts')) return false;
      const content = fs.readFileSync(file, 'utf8');
      return content.includes('export function useSystemSettings()');
    });

    expect(definingFiles).toEqual([
      path.join(srcRoot, 'hooks', 'useSystemSettings.ts'),
    ]);
  });

  it('settings page no longer uses localStorage for system settings', () => {
    const settingsPath = path.join(srcRoot, 'pages', 'Settings.tsx');
    const content = fs.readFileSync(settingsPath, 'utf8');

    expect(content.includes('localStorage')).toBe(false);
    expect(content.includes('useSystemSettings')).toBe(true);
    expect(content.includes("endpoints.systemSettings")).toBe(false);
  });
});
