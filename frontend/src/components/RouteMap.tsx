import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { TransportMode } from '../types';

// Fix leaflet default marker icon issue with Vite
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Indian logistics hub coordinates
export const CITY_COORDS: Record<string, [number, number]> = {
  Vijayawada: [16.5062, 80.6480],
  Visakhapatnam: [17.6868, 83.2185],
  Hyderabad: [17.3850, 78.4867],
  Bengaluru: [12.9716, 77.5946],
  Chennai: [13.0827, 80.2707],
  Mumbai: [19.0760, 72.8777],
  Delhi: [28.6139, 77.2090],
  Pune: [18.5204, 73.8567],
  Kolkata: [22.5726, 88.3639],
  Chandigarh: [30.7333, 76.7794],
  Coimbatore: [11.0168, 76.9558],
};

const MODE_COLORS: Record<TransportMode, string> = {
  RAIL: '#10b981',
  ROAD: '#3b82f6',
  EXPRESS_ROAD: '#06b6d4',
  AIR: '#a78bfa',
};

interface RouteSegment {
  from: string;
  to: string;
  mode: TransportMode;
  isActive?: boolean;
  isDisrupted?: boolean;
}

interface RouteMapProps {
  activeOrigin?: string;
  activeDestination?: string;
  segments?: RouteSegment[];
  height?: string;
}

function FitBounds({ origin, destination }: { origin?: string; destination?: string }) {
  const map = useMap();
  useEffect(() => {
    if (origin && destination && CITY_COORDS[origin] && CITY_COORDS[destination]) {
      const bounds = L.latLngBounds([CITY_COORDS[origin], CITY_COORDS[destination]]);
      map.fitBounds(bounds, { padding: [60, 60] });
    }
  }, [origin, destination, map]);
  return null;
}

export const RouteMap: React.FC<RouteMapProps> = ({
  activeOrigin,
  activeDestination,
  segments = [],
  height = '320px',
}) => {
  // Default corridors to show even with no active route
  const defaultSegments: RouteSegment[] = [
    { from: 'Vijayawada', to: 'Visakhapatnam', mode: 'RAIL' },
    { from: 'Vijayawada', to: 'Visakhapatnam', mode: 'EXPRESS_ROAD' },
    { from: 'Hyderabad', to: 'Bengaluru', mode: 'AIR' },
    { from: 'Hyderabad', to: 'Bengaluru', mode: 'EXPRESS_ROAD' },
    { from: 'Chennai', to: 'Vijayawada', mode: 'RAIL' },
    { from: 'Mumbai', to: 'Pune', mode: 'EXPRESS_ROAD' },
    { from: 'Delhi', to: 'Chandigarh', mode: 'RAIL' },
    { from: 'Chennai', to: 'Coimbatore', mode: 'RAIL' },
  ];

  const displaySegments = segments.length > 0 ? segments : defaultSegments;
  const cities = Object.keys(CITY_COORDS);

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-700/60 shadow-xl" style={{ height }}>
      <MapContainer
        center={[15.5, 80.0]}
        zoom={5}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        {/* Corridor Polylines */}
        {displaySegments.map((seg, i) => {
          const from = CITY_COORDS[seg.from];
          const to = CITY_COORDS[seg.to];
          if (!from || !to) return null;
          const color = seg.isDisrupted ? '#f43f5e' : MODE_COLORS[seg.mode];
          const isActive = seg.from === activeOrigin && seg.to === activeDestination;
          return (
            <Polyline
              key={i}
              positions={[from, to]}
              pathOptions={{
                color,
                weight: isActive ? 5 : 2,
                opacity: isActive ? 1.0 : 0.4,
                dashArray: seg.mode === 'AIR' ? '8 6' : seg.mode === 'RAIL' ? undefined : '4 3',
              }}
            />
          );
        })}

        {/* City Markers */}
        {cities.map((city) => (
          <CircleMarker
            key={city}
            center={CITY_COORDS[city]}
            radius={city === activeOrigin || city === activeDestination ? 8 : 5}
            pathOptions={{
              color: city === activeOrigin ? '#06b6d4' : city === activeDestination ? '#a78bfa' : '#94a3b8',
              fillColor: city === activeOrigin ? '#0e7490' : city === activeDestination ? '#7c3aed' : '#1e293b',
              fillOpacity: 1,
              weight: 2,
            }}
          >
            <Popup className="leaflet-dark-popup">
              <div style={{ background: '#0f172a', color: '#e2e8f0', padding: '6px 10px', borderRadius: '8px', fontSize: '12px', border: '1px solid #334155', minWidth: '120px' }}>
                <div style={{ fontWeight: 'bold', color: '#06b6d4' }}>{city}</div>
                <div style={{ color: '#94a3b8', fontSize: '11px' }}>Logistics Hub</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {(activeOrigin || activeDestination) && (
          <FitBounds origin={activeOrigin} destination={activeDestination} />
        )}
      </MapContainer>
    </div>
  );
};

// Mode legend helper
export const MapLegend: React.FC = () => (
  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 mt-2">
    {(Object.entries(MODE_COLORS) as [TransportMode, string][]).map(([mode, color]) => (
      <div key={mode} className="flex items-center gap-1.5">
        <div className="w-6 h-0.5 rounded" style={{ backgroundColor: color, opacity: 0.8 }} />
        <span>{mode.replace('_', ' ')}</span>
      </div>
    ))}
    <div className="flex items-center gap-1.5">
      <div className="w-6 h-0.5 rounded bg-rose-500" />
      <span>DISRUPTED</span>
    </div>
  </div>
);
