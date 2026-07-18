import { GeoJSON } from 'react-leaflet';
import { useMemo } from 'react';

export default function TacticalMask({ boundaryData }) {
  const maskData = useMemo(() => {
    const worldOuter = [[180, -180], [180, 180], [-180, 180], [-180, -180], [180, -180]];
    const hole = boundaryData.geometry.type === 'Polygon' 
      ? boundaryData.geometry.coordinates 
      : boundaryData.geometry.coordinates[0];

    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [worldOuter.map(c => [c[1], c[0]]), ...hole]
      }
    };
  }, [boundaryData]);

  return (
    <>
      <GeoJSON data={maskData} style={{ fillColor: '#000', fillOpacity: 0.75, stroke: false, interactive: false }} />
      <GeoJSON data={boundaryData} style={{ color: '#06b6d4', weight: 2, fillOpacity: 0, dashArray: '10, 10', interactive: false }} />
    </>
  );
}