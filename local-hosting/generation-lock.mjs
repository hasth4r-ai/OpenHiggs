import { activeTasks } from './generation-history.mjs';

globalThis.openHiggsRunningId ||= null;
globalThis.openHiggsQueue ||= [];

/**
 * Acquire generation lock or queue until available.
 * Resolves immediately if free, or resolves when it's this task's turn in line.
 * Self-healing: if the lock holder is no longer in activeTasks, automatically claims lock.
 * @param {string} id - Task UUID
 * @param {function} onQueued - Optional callback receiving ({ position, totalQueued })
 * @returns {Promise<void>}
 */
export async function acquireGeneration(id, onQueued = () => {}) {
  // Self-heal: If runningId is set but task is not in activeTasks, clear stale lock
  if (globalThis.openHiggsRunningId && !activeTasks.has(globalThis.openHiggsRunningId)) {
    globalThis.openHiggsRunningId = null;
    globalThis.openHiggsSubmission = null;
  }

  // If nothing is actively running, acquire immediately
  if (!globalThis.openHiggsRunningId) {
    globalThis.openHiggsRunningId = id;
    globalThis.openHiggsSubmission = id;
    return;
  }

  // If already the lock holder, proceed
  if (globalThis.openHiggsRunningId === id) {
    return;
  }

  // Already busy -> Enqueue and wait
  return new Promise((resolve) => {
    const queueEntry = {
      id,
      resolve: () => {
        globalThis.openHiggsRunningId = id;
        globalThis.openHiggsSubmission = id;
        resolve();
      },
      onQueued
    };
    globalThis.openHiggsQueue.push(queueEntry);
    onQueued({
      position: globalThis.openHiggsQueue.length,
      totalQueued: globalThis.openHiggsQueue.length
    });
  });
}

/**
 * Release generation lock and advance next task in queue.
 * @param {string} id - Task UUID
 */
export function releaseGeneration(id) {
  // Remove if in queue
  const qIdx = globalThis.openHiggsQueue.findIndex(e => e.id === id);
  if (qIdx !== -1) {
    globalThis.openHiggsQueue.splice(qIdx, 1);
    globalThis.openHiggsQueue.forEach((e, i) => e.onQueued?.({ position: i + 1, totalQueued: globalThis.openHiggsQueue.length }));
  }

  // If this task was holding the lock (or lock is stale), advance next in line
  if (globalThis.openHiggsRunningId === id || (globalThis.openHiggsRunningId && !activeTasks.has(globalThis.openHiggsRunningId))) {
    globalThis.openHiggsRunningId = null;
    globalThis.openHiggsSubmission = null;

    if (globalThis.openHiggsQueue.length > 0) {
      const next = globalThis.openHiggsQueue.shift();
      globalThis.openHiggsRunningId = next.id;
      globalThis.openHiggsSubmission = next.id;
      globalThis.openHiggsQueue.forEach((e, i) => e.onQueued?.({ position: i + 1, totalQueued: globalThis.openHiggsQueue.length }));
      next.resolve();
    }
  }
}

export function getQueueStatus(id) {
  if (globalThis.openHiggsRunningId === id) return { active: true, position: 0 };
  const idx = globalThis.openHiggsQueue.findIndex(e => e.id === id);
  if (idx !== -1) return { active: false, position: idx + 1, total: globalThis.openHiggsQueue.length };
  return { active: false, position: -1 };
}
