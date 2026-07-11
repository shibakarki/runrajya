import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'your_supabase_url'
const supabaseKey = 'your_supabase_anon_key'
const supabase = createClient(supabaseUrl, supabaseKey)

// Rupandehi bounding box
const LAT_MIN = 27.3301647
const LAT_MAX = 27.7672862
const LNG_MIN = 83.2042469
const LNG_MAX = 83.6343973

// 500m in degrees (approximate)
const CELL_LAT = 0.0045
const CELL_LNG = 0.0055

// Load boundary and check if point is inside polygon
async function pointInPolygon(lat, lng, polygon) {
  let inside = false
  const x = lng, y = lat
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1]
    const xj = polygon[j][0], yj = polygon[j][1]
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

async function generateZones() {
  // Import boundary
  const boundary = await fetch('/src/data/rupandehi_boundary.json')
    .then(r => r.json())
  const polygon = boundary.geometry.coordinates[0]

  const zones = []
  let row = 0

  for (let lat = LAT_MIN; lat < LAT_MAX; lat += CELL_LAT) {
    let col = 0
    for (let lng = LNG_MIN; lng < LNG_MAX; lng += CELL_LNG) {
      // Check if center point is inside Rupandehi
      const centerLat = lat + CELL_LAT / 2
      const centerLng = lng + CELL_LNG / 2
      const inside = await pointInPolygon(centerLat, centerLng, polygon)

      if (inside) {
        zones.push({
          lat_min: lat,
          lat_max: lat + CELL_LAT,
          lng_min: lng,
          lng_max: lng + CELL_LNG,
          grid_row: row,
          grid_col: col,
          revealed: false,
          contested: false,
        })
      }
      col++
    }
    row++
  }

  console.log(`Generated ${zones.length} zones`)

  // Insert in batches of 500
  for (let i = 0; i < zones.length; i += 500) {
    const batch = zones.slice(i, i + 500)
    const { error } = await supabase.from('zones').insert(batch)
    if (error) console.error('Error inserting batch:', error)
    else console.log(`Inserted zones ${i} to ${i + batch.length}`)
  }

  console.log('Done!')
}

generateZones()