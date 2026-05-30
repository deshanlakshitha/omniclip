import { openDB, type DBSchema } from 'idb';
import { type Project } from '@omniclip/shared';

interface OmniDB extends DBSchema {
  projects: {
    key: string;
    value: Project;
  };
  meta: {
    key: string;
    value: string;
  };
}

const DB_NAME = 'omniclip';
const ACTIVE_KEY = 'activeProjectId';

const dbPromise = openDB<OmniDB>(DB_NAME, 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' });
    if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
  },
});

export async function saveProject(project: Project): Promise<void> {
  const db = await dbPromise;
  await db.put('projects', project);
  await db.put('meta', project.id, ACTIVE_KEY);
}

export async function loadActiveProject(): Promise<Project | null> {
  const db = await dbPromise;
  const activeId = await db.get('meta', ACTIVE_KEY);
  if (!activeId) return null;
  return (await db.get('projects', activeId)) ?? null;
}

export async function listProjects(): Promise<Project[]> {
  const db = await dbPromise;
  return db.getAll('projects');
}

/** Debounced auto-save helper. */
export function createAutoSaver(delayMs = 800) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (project: Project) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void saveProject(project), delayMs);
  };
}
