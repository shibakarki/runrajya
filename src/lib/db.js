import Dexie from 'dexie';

// Initialize the RunRajya Production Database
export const db = new Dexie('RunRajyaDB_v3');

// Schema Definition
db.version(1).stores({
  // ++id = auto-incrementing primary key
  traces: '++id, session_id, recorded_at', 
  captures: '++id, zone_id, user_id, captured_at',
  zones_grid: 'id, owner_id, revealed', // Cache for the 4,814 cells
  active_session: 'key, value' // Stores 'distance', 'points', 'grids', 'active' for hot-recovery
});

export default db;