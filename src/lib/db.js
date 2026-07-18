import Dexie from 'dexie';

// Changing the name to V4 forces all browsers to reset their local storage 
// and avoid "stucking" due to old data conflicts.
export const db = new Dexie('RunRajyaV4');

db.version(1).stores({
  traces: '++id, session_id, recorded_at', 
  captures: '++id, zone_id, user_id, captured_at',
  zones_grid: 'id, owner_id, revealed',
  active_session: 'key, value' 
});

export default db;