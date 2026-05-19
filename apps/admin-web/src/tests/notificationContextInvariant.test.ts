import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const appRoot = process.cwd();
const srcRoot = path.join(appRoot, 'src');
const canonicalImport = "@/components/NotificationContext";

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return full.endsWith('.ts') || full.endsWith('.tsx') ? [full] : [];
  });
}

describe('NotificationContext invariants', () => {
  it('has exactly one NotificationContext definition file', () => {
    const allSource = walk(srcRoot);
    const definingFiles = allSource.filter((file) => {
      if (file.endsWith('notificationContextInvariant.test.ts')) return false;
      const content = fs.readFileSync(file, 'utf8');
      return (
        content.includes('createContext<NotificationContextType') &&
        content.includes('export function NotificationProvider') &&
        content.includes('export function useNotification')
      );
    });

    expect(definingFiles).toEqual([
      path.join(srcRoot, 'components', 'NotificationContext.tsx'),
    ]);
  });

  it('uses only the canonical NotificationContext import path', () => {
    const allSource = walk(srcRoot);
    const importingFiles = allSource.filter((file) =>
      fs.readFileSync(file, 'utf8').includes('NotificationContext'),
    );

    for (const file of importingFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const nonCanonicalImport =
        /from\s+['"](\.\/|\.\.\/|src\/components\/|@components\/|components\/).*NotificationContext['"]/.test(
          content,
        );
      expect(nonCanonicalImport, file).toBe(false);
    }

    const canonicalConsumers = allSource.filter((file) =>
      fs
        .readFileSync(file, 'utf8')
        .includes(`from '${canonicalImport}'`),
    );
    expect(canonicalConsumers.length).toBeGreaterThan(0);
  });

  it('mounts NotificationProvider exactly once in main.tsx with required hierarchy', () => {
    const mainPath = path.join(srcRoot, 'main.tsx');
    const content = fs.readFileSync(mainPath, 'utf8');

    const mountCount = (content.match(/<NotificationProvider>/g) || []).length;
    expect(mountCount).toBe(1);

    const hierarchyRegex =
      /<QueryClientProvider[\s\S]*<NotificationProvider>[\s\S]*<BrowserRouter>[\s\S]*<ErrorBoundary>[\s\S]*<App\s*\/>/;
    expect(hierarchyRegex.test(content)).toBe(true);
  });
});
