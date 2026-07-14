import Dexie from 'dexie';

export const db = new Dexie('RunRajyaProductionDB');

db.version(1).stores({
  traces: '++id, session_id, recorded_at',
  captures: '++id, zone_id, user_id, captured_at',
  zones_grid: 'id, owner_id, revealed',
  // Stores session data like: { key: 'stats', value: { kcal: 0, distance: 0, goal: 5 } }
  active_session: 'key, value' 
});

export default db;