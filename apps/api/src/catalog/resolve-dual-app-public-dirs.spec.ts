import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  findMonorepoAppsDir,
  resolveDualAppPublicDirectories,
} from './resolve-dual-app-public-dirs';
import { resolveLocalCatalogImageDirectories } from './local-filesystem-media-storage';

describe('resolveDualAppPublicDirectories (api)', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'itmarket-api-dual-public-'));

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('resolves catalog dirs from apps/api cwd including standalone', () => {
    const apps = path.join(root, 'apps');
    mkdirSync(path.join(apps, 'api'), { recursive: true });
    mkdirSync(path.join(apps, 'backoffice'), { recursive: true });
    mkdirSync(path.join(apps, 'storefront'), { recursive: true });
    writeFileSync(path.join(apps, 'backoffice', 'package.json'), '{}');
    writeFileSync(path.join(apps, 'storefront', 'package.json'), '{}');

    const apiCwd = path.join(apps, 'api');
    expect(findMonorepoAppsDir(apiCwd)).toBe(apps);

    const dirs = resolveLocalCatalogImageDirectories(apiCwd);
    expect(dirs).toContain(
      path.join(apps, 'storefront', 'public', 'images', 'catalog'),
    );
    expect(dirs).toContain(
      path.join(apps, 'backoffice', 'public', 'images', 'catalog'),
    );
    expect(dirs).toContain(
      path.join(
        apps,
        'storefront',
        '.next',
        'standalone',
        'apps',
        'storefront',
        'public',
        'images',
        'catalog',
      ),
    );
    expect(dirs).toEqual(
      resolveDualAppPublicDirectories('images/catalog', apiCwd),
    );
  });
});
