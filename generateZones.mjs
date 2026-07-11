import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabaseUrl = 'https://lmkuwwihgzhwgooivblg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxta3V3d2loZ3pod2dvb2l2YmxnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMDc5NDcsImV4cCI6MjA5NDY4Mzk0N30.JXNAwz4BI0Mmk5bf8oJ7Cqi9LjsUfqToTkgETj_zbnI'
const supabase = createClient(supabaseUrl, supabaseKey)

const LAT_MIN = 27.3301647
const LAT_MAX = 27.7672862
const LNG_MIN = 83.2042469
const LNG_MAX = 83.6343973
const CELL_LAT = 0.0045
const CELL_LNG = 0.0055

function pointInPolygon(lat, lng, polygon) {
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
  const boundary = JSON.parse(readFileSync('./src/data/rupandehi_boundary.json', 'utf8'))
  const polygon = boundary.geometry.coordinates[0]

  const zones = []
  let row = 0

  for (let lat = LAT_MIN; lat < LAT_MAX; lat += CELL_LAT) {
    let col = 0
    for (let lng = LNG_MIN; lng < LNG_MAX; lng += CELL_LNG) {
      const centerLat = lat + CELL_LAT / 2
      const centerLng = lng + CELL_LNG / 2
      const inside = pointInPolygon(centerLat, centerLng, polygon)
      if (inside) {
        zones.push({
          lat_min: parseFloat(lat.toFixed(7)),
          lat_max: parseFloat((lat + CELL_LAT).toFixed(7)),
          lng_min: parseFloat(lng.toFixed(7)),
          lng_max: parseFloat((lng + CELL_LNG).toFixed(7)),
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

  console.log(`Generated ${zones.length} zones inside Rupandehi`)

  // Insert in batches of 500
  for (let i = 0; i < zones.length; i += 500) {
    const batch = zones.slice(i, i + 500)
    const { error } = await supabase.from('zones').insert(batch)
    if (error) {
      console.error('Error:', error.message)
      break
    }
    console.log(`Inserted ${i + batch.length} / ${zones.length}`)
  }

  console.log('All zones inserted!')
}

generateZones()