import Dexie from 'dexie';

export const db = new Dexie('RunRajyaV6');

db.version(1).stores({
  traces: '++id, session_id, recorded_at', 
  captures: '++id, zone_id, user_id, captured_at',
  zones_grid: 'id, owner_id, revealed',
  active_session: 'key, value' 
});

export default db;