import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { getInstallRoot } from './root.mjs';

globalThis.openHiggsRunId ||= randomUUID();
export const runId = globalThis.openHiggsRunId;
globalThis.openHiggsTasks ||= new Map();
export const activeTasks = globalThis.openHiggsTasks;

export function historyDirectory() {
  return path.resolve(getInstallRoot(), 'data', 'database', 'generation-history');
}

export async function saveGeneration(record) {
  const dir = historyDirectory();
  await fs.mkdir(dir, { recursive: true });
  const target = path.join(dir, `${record.id}.json`), temp = `${target}.${randomUUID()}.tmp`;
  await fs.writeFile(temp, JSON.stringify(record, null, 2));
  // Windows readers/antivirus can briefly lock the destination during polling.
  for (let attempt = 0; ; attempt++) {
    try {
      await fs.rename(temp, target);
      break;
    } catch (error) {
      if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code) || attempt >= 8) throw error;
      await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)));
    }
  }
}

export async function listGenerations({ includeDeleted = false } = {}) {
  const dir = historyDirectory();
  await fs.mkdir(dir, { recursive: true });
  const entries = await fs.readdir(dir);
  const records = await Promise.all(entries.filter(n => n.endsWith('.json')).map(async n => {
    try {
      const record = JSON.parse(await fs.readFile(path.join(dir, n), 'utf8'));
      if (record.status === 'generating' && record.runId !== runId) {
        return { ...record, status: 'interrupted', error: 'OpenHiggs restarted before this job finished. Check Wan2GP before retrying.' };
      }
      return record;
    } catch {
      return null;
    }
  }));
  const validRecords = records.filter(Boolean);
  const known = new Set(validRecords.map(r => r.fileName));
  const outputs = path.resolve(getInstallRoot(), 'data', 'generations');
  await fs.mkdir(outputs, { recursive: true });
  try {
    const outFiles = await fs.readdir(outputs);
    for (const name of outFiles) {
      if (!/\.mp4$/i.test(name) || known.has(name)) continue;
      const stat = await fs.stat(path.join(outputs, name));
      validRecords.push({
        id: name,
        fileName: name,
        videoUrl: `/api/generations/${encodeURIComponent(name)}`,
        createdAt: stat.mtime.toISOString(),
        status: 'completed',
        prompt: '',
        model: 'MiniMax H3',
        references: []
      });
    }
  } catch {
    // Outputs folder may be empty
  }
  return validRecords.filter(r => includeDeleted || !r.deletedAt).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
