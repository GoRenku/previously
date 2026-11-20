// Where the show content lives. Content is kept in the private repo
// GoRenku/previously-content, cloned beside this one; nothing under this repo
// holds show content.
//
// Order: $PREVIOUSLY_CONTENT, else `previously-content` beside the main
// checkout of this repo. The main checkout is found through git, so Claude Code
// worktrees (which live inside the main checkout) resolve to the same folder.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function mainCheckout() {
  try {
    const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
      cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return dirname(common);
  } catch {
    return repoRoot;
  }
}

let cached;
export function contentRoot() {
  if (cached) return cached;
  const dir = process.env.PREVIOUSLY_CONTENT
    ? resolve(process.env.PREVIOUSLY_CONTENT)
    : join(mainCheckout(), '..', 'previously-content');
  if (!existsSync(join(dir, 'catalog.json'))) {
    throw new Error(
      `Show content not found at ${dir}.\n` +
      'Clone GoRenku/previously-content beside this repo, or set PREVIOUSLY_CONTENT to its path.',
    );
  }
  return (cached = dir);
}

export const showDir = (id) => join(contentRoot(), 'shows', id);
