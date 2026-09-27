export interface WorkoutLog {
  id: string;
  user_id: string;
  workout_id: number;
  workout_name: string;
  duration_mins: number;
  calories: number;
  completed_at: string;
}

interface Snapshot {
  history: WorkoutLog[];
  pending: string[];
}

interface HistoryRemote {
  load: (userId: string) => Promise<WorkoutLog[]>;
  insert: (entry: WorkoutLog) => Promise<void>;
}

function mergeHistory(userId: string, ...groups: WorkoutLog[][]): WorkoutLog[] {
  const entries = new Map<string, WorkoutLog>();
  for (const group of groups) {
    for (const entry of group) {
      if (entry?.id && entry.user_id === userId && Number.isFinite(Date.parse(entry.completed_at))) {
        entries.set(entry.id, entry);
      }
    }
  }
  return [...entries.values()].sort((a, b) => Date.parse(b.completed_at) - Date.parse(a.completed_at));
}

/** Monday through Sunday in the user's local timezone. History is never reset. */
export function thisWeekWorkouts(history: WorkoutLog[], now = new Date()): WorkoutLog[] {
  const start = new Date(now);
  start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return history.filter(entry => {
    const time = Date.parse(entry.completed_at);
    return time >= start.getTime() && time < end.getTime();
  });
}

/** Save synchronously before navigation; retry pending account uploads on sync. */
export function createWorkoutHistoryStore(getStorage: () => Storage, remote: HistoryRemote) {
  const memory = new Map<string, Snapshot>();
  const syncing = new Map<string, Promise<{ history: WorkoutLog[]; error: Error | null }>>();
  const key = (userId: string) => `soma_workout_history_v1_${userId}`;

  function read(userId: string): Snapshot {
    const cached = memory.get(userId) ?? { history: [], pending: [] };
    try {
      const storage = getStorage();
      const saved = JSON.parse(storage.getItem(key(userId)) || "null");
      const legacy = userId === "guest" ? JSON.parse(storage.getItem("soma_guest") || "{}") : null;
      // Existing guest records keep their IDs, so migration cannot double-count.
      const history = mergeHistory(userId, cached.history,
        Array.isArray(legacy?.history) ? legacy.history : [],
        Array.isArray(saved?.history) ? saved.history : []);
      const pending = [...new Set([...cached.pending, ...(Array.isArray(saved?.pending) ? saved.pending : [])])]
        .filter(id => history.some(entry => entry.id === id));
      return { history, pending };
    } catch {
      return cached;
    }
  }

  function write(userId: string, snapshot: Snapshot): boolean {
    memory.set(userId, snapshot);
    try {
      getStorage().setItem(key(userId), JSON.stringify(snapshot));
      return true;
    } catch {
      return false;
    }
  }

  function record(entry: WorkoutLog) {
    const snapshot = read(entry.user_id);
    const exists = snapshot.history.some(item => item.id === entry.id);
    snapshot.history = mergeHistory(entry.user_id, snapshot.history, exists ? [] : [entry]);
    if (!exists && entry.user_id !== "guest") snapshot.pending.push(entry.id);
    return { history: snapshot.history, savedLocally: write(entry.user_id, snapshot) };
  }

  async function syncNow(userId: string) {
    try {
      if (userId !== "guest") {
        const remoteHistory = await remote.load(userId);
        const latest = read(userId);
        latest.history = mergeHistory(userId, latest.history, remoteHistory);
        write(userId, latest);
      }
      const attempted = new Set<string>();
      // Re-read after each request: a workout may finish while a sync is running.
      while (userId !== "guest") {
        const snapshot = read(userId);
        const entry = snapshot.history.find(item => snapshot.pending.includes(item.id) && !attempted.has(item.id));
        if (!entry) break;
        await remote.insert(entry);
        attempted.add(entry.id);
        const latest = read(userId);
        latest.pending = latest.pending.filter(id => id !== entry.id);
        write(userId, latest);
      }
      return { history: read(userId).history, error: null };
    } catch (error) {
      // A failed request is not an empty account. Retain history and pending IDs.
      return { history: read(userId).history, error: error instanceof Error ? error : new Error(String(error)) };
    }
  }

  function sync(userId: string) {
    const existing = syncing.get(userId);
    if (existing) return existing;
    const promise = syncNow(userId).finally(() => syncing.delete(userId));
    syncing.set(userId, promise);
    return promise;
  }

  return { record, sync, load: (userId: string) => read(userId).history };
}
