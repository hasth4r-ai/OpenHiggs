import fsSync from 'node:fs';
import path from 'node:path';

export function getInstallRoot() {
  if (process.env.OPENHIGGS_ROOT && fsSync.existsSync(process.env.OPENHIGGS_ROOT)) {
    return process.env.OPENHIGGS_ROOT;
  }
  const cwd = process.cwd();
  if (fsSync.existsSync(path.join(cwd, 'data'))) return cwd;
  if (fsSync.existsSync(path.join(cwd, '..', 'data'))) return path.resolve(cwd, '..');
  if (fsSync.existsSync('C:\\openhiggs\\data')) return 'C:\\openhiggs';
  return path.resolve(cwd, '..');
}
