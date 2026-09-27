import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createWorkoutHistoryStore, thisWeekWorkouts } from '../src/workoutHistory.ts';

process.env.TZ = 'America/Chicago';

function storage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}
function entry(id = 'session-1', user_id = 'user-a', completed_at = '2026-09-23T15:00:00Z') {
  return { id, user_id, workout_id: 4, workout_name: 'Push A', duration_mins: 45, calories: 300, completed_at };
}
function remote() {
  const rows = new Map();
  return {
    rows,
    load: async userId => [...rows.values()].filter(row => row.user_id === userId),
    insert: async row => { if (!rows.has(row.id)) rows.set(row.id, row); },
  };
}
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

test('a completed workout is durable before any network call and survives a new page instance', () => {
  const disk = storage();
  const cloud = remote();
  const store = createWorkoutHistoryStore(() => disk, cloud);
  assert.equal(store.record(entry()).savedLocally, true);
  assert.equal(cloud.rows.size, 0);
  const reloaded = createWorkoutHistoryStore(() => disk, cloud);
  assert.deepEqual(reloaded.load('user-a'), [entry()]);
  assert.equal(thisWeekWorkouts(reloaded.load('user-a'), new Date('2026-09-27T12:00:00-05:00')).length, 1);
});

test('completion retries count once, but two sessions of the same workout count twice', async () => {
  const disk = storage();
  const cloud = remote();
  const store = createWorkoutHistoryStore(() => disk, cloud);
  store.record(entry());
  store.record(entry());
  await store.sync('user-a');
  store.record(entry());
  store.record(entry('session-2'));
  await store.sync('user-a');
  assert.equal(store.load('user-a').length, 2);
  assert.equal(cloud.rows.size, 2);
  const weekly = thisWeekWorkouts(store.load('user-a'), new Date('2026-09-24T12:00:00-05:00'));
  assert.equal(new Set(weekly.map(row => new Date(row.completed_at).toDateString())).size, 1);
});

test('legacy guest history is retained across migration, sign-out, and reload', () => {
  const disk = storage();
  const old = entry('old', 'guest');
  disk.setItem('soma_guest', JSON.stringify({ isGuest: true, history: [old] }));
  const store = createWorkoutHistoryStore(() => disk, remote());
  store.record(entry('new', 'guest'));
  disk.setItem('soma_guest', JSON.stringify({ isGuest: false, history: [old] }));
  const reloaded = createWorkoutHistoryStore(() => disk, remote());
  assert.equal(reloaded.load('guest').length, 2);
  assert.equal(reloaded.load('user-a').length, 0);
});

test('a database read failure never replaces cached history with an empty array', async () => {
  const disk = storage();
  const cloud = remote();
  const store = createWorkoutHistoryStore(() => disk, cloud);
  store.record(entry());
  await store.sync('user-a');
  const offline = createWorkoutHistoryStore(() => disk, { ...cloud, load: async () => { throw new Error('offline'); } });
  const result = await offline.sync('user-a');
  assert.equal(result.error.message, 'offline');
  assert.equal(result.history.length, 1);
});

test('a failed insert survives reload and retries with its original ID and completion date', async () => {
  const disk = storage();
  const cloud = remote();
  const failing = createWorkoutHistoryStore(() => disk, { ...cloud, insert: async () => { throw new Error('permission denied'); } });
  failing.record(entry());
  assert.equal((await failing.sync('user-a')).error.message, 'permission denied');
  const reloaded = createWorkoutHistoryStore(() => disk, cloud);
  assert.equal((await reloaded.sync('user-a')).error, null);
  assert.deepEqual([...cloud.rows.values()], [entry()]);
});

test('an upload whose acknowledgement was lost is not counted again after reload', async () => {
  const disk = storage();
  const cloud = remote();
  const interrupted = createWorkoutHistoryStore(() => disk, {
    ...cloud,
    insert: async row => { await cloud.insert(row); throw new Error('connection dropped'); },
  });
  interrupted.record(entry());
  await interrupted.sync('user-a');
  const reloaded = createWorkoutHistoryStore(() => disk, cloud);
  await reloaded.sync('user-a');
  assert.equal(reloaded.load('user-a').length, 1);
  assert.equal(cloud.rows.size, 1);
});

test('a workout completed during a slow history request is retained and synced', async () => {
  const disk = storage();
  const cloud = remote();
  const response = deferred();
  const store = createWorkoutHistoryStore(() => disk, { ...cloud, load: () => response.promise });
  const refresh = store.sync('user-a');
  store.record(entry());
  assert.equal(store.sync('user-a'), refresh);
  response.resolve([]);
  const result = await refresh;
  assert.equal(result.history.length, 1);
  assert.equal(cloud.rows.size, 1);
});

test('a second workout completed during an upload is also synced', async () => {
  const disk = storage();
  const cloud = remote();
  const uploading = deferred();
  const release = deferred();
  const store = createWorkoutHistoryStore(() => disk, {
    ...cloud,
    insert: async row => {
      if (row.id === 'session-1') { uploading.resolve(); await release.promise; }
      await cloud.insert(row);
    },
  });
  store.record(entry());
  const sync = store.sync('user-a');
  await uploading.promise;
  store.record(entry('session-2'));
  release.resolve();
  await sync;
  assert.equal(cloud.rows.size, 2);
});

test('cached and remote records are scoped to the active account', async () => {
  const disk = storage();
  const store = createWorkoutHistoryStore(() => disk, { ...remote(), load: async () => [entry('foreign', 'user-b')] });
  store.record(entry());
  store.record(entry('b', 'user-b'));
  await store.sync('user-a');
  assert.deepEqual(store.load('user-a').map(row => row.id), ['session-1']);
  assert.deepEqual(store.load('user-b').map(row => row.id), ['b']);
});

test('storage failure is reported and cloud saving still works', async () => {
  const disk = { getItem: () => null, setItem: () => { throw new Error('quota exceeded'); } };
  const cloud = remote();
  const store = createWorkoutHistoryStore(() => disk, cloud);
  assert.equal(store.record(entry()).savedLocally, false);
  assert.equal((await store.sync('user-a')).error, null);
  assert.equal(cloud.rows.size, 1);
});

test('storage failing after a pending upload was saved does not loop forever', async () => {
  const disk = storage();
  const cloud = remote();
  const store = createWorkoutHistoryStore(() => disk, cloud);
  store.record(entry());
  disk.setItem = () => { throw new Error('quota exceeded'); };
  assert.equal((await store.sync('user-a')).error, null);
  assert.equal(cloud.rows.size, 1);
});

test('week boundaries use local Monday midnight and retain all-time history', () => {
  const history = [
    entry('before', 'user-a', '2026-09-20T23:59:59-05:00'),
    entry('monday', 'user-a', '2026-09-21T00:00:00-05:00'),
    entry('sunday', 'user-a', '2026-09-27T23:59:59-05:00'),
    entry('next', 'user-a', '2026-09-28T00:00:00-05:00'),
  ];
  assert.deepEqual(thisWeekWorkouts(history, new Date('2026-09-27T12:00:00-05:00')).map(row => row.id), ['monday', 'sunday']);
  assert.deepEqual(thisWeekWorkouts(history, new Date('2026-09-28T00:00:00-05:00')).map(row => row.id), ['next']);
  assert.equal(history.length, 4);
});

test('the week includes Sunday evening across daylight saving changes', () => {
  const history = [entry('dst', 'user-a', '2026-11-01T23:59:59-06:00')];
  assert.equal(thisWeekWorkouts(history, new Date('2026-11-01T12:00:00-06:00')).length, 1);
});
