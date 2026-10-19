import React, { useEffect, useState, Component, type ReactNode } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
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

export interface RouteSegment {
  from: string;
  to: string;
  mode: TransportMode;
  isActive?: boolean;
  isDisrupted?: boolean;
  optionName?: string;
  carrier?: string;
  costInr?: number;
  durationHours?: number;
  onSelect?: () => void;
}

interface RouteMapProps {
  activeOrigin?: string;
  activeDestination?: string;
  segments?: RouteSegment[];
  height?: string;
  tileUrl?: string;
  tileAttribution?: string;
  subdomains?: string[];
}

export const DEFAULT_ESRI_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
export const DEFAULT_ESRI_ATTRIBUTION = 'Tiles &copy; Esri &mdash; see Esri\'s World Street Map attribution and usage terms';
export const DEFAULT_ESRI_SUBDOMAINS = ['a', 'b', 'c', 'd'];

export function resolveTileConfig() {
  const customUrl = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_MAP_TILE_URL : undefined;

  // Use custom URL only if explicitly provided and not pointing to the deprecated/broken CARTO endpoint
  if (
    customUrl &&
    typeof customUrl === 'string' &&
    customUrl.trim().length > 0 &&
    !customUrl.includes('cartocdn.com')
  ) {
    return {
      url: customUrl.trim(),
      attribution: (import.meta.env?.VITE_MAP_ATTRIBUTION as string) || DEFAULT_ESRI_ATTRIBUTION,
      subdomains: import.meta.env?.VITE_MAP_SUBDOMAINS
        ? String(import.meta.env.VITE_MAP_SUBDOMAINS).split(',')
        : DEFAULT_ESRI_SUBDOMAINS,
      providerName: 'Custom Basemap',
    };
  }

  // Primary Default: Public Esri World Street Map raster tiles (HTTPS, No API Key Required)
  return {
    url: DEFAULT_ESRI_TILE_URL,
    attribution: DEFAULT_ESRI_ATTRIBUTION,
    subdomains: DEFAULT_ESRI_SUBDOMAINS,
    providerName: 'Esri World Street Map',
  };
}

const MODE_OFFSET_FACTORS: Record<string, number> = {
  AIR: 0.85,
  EXPRESS_ROAD: 0.28,
  RAIL: -0.28,
  ROAD: -0.65,
};

function calculateArcPositions(
  from: [number, number],
  to: [number, number],
  offsetFactor: number = 0
): [number, number][] {
  if (Math.abs(offsetFactor) < 0.04) return [from, to];

  const [lat1, lon1] = from;
  const [lat2, lon2] = to;

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const dist = Math.sqrt(dLat * dLat + dLon * dLon);
  if (dist === 0) return [from, to];

  const normLat = -dLon / dist;
  const normLon = dLat / dist;
  const maxArc = Math.min(dist * 0.14, 1.2) * offsetFactor;

  const p1: [number, number] = [
    lat1 * 0.75 + lat2 * 0.25 + normLat * maxArc * 0.7,
    lon1 * 0.75 + lon2 * 0.25 + normLon * maxArc * 0.7,
  ];
  const pMid: [number, number] = [
    (lat1 + lat2) / 2 + normLat * maxArc,
    (lon1 + lon2) / 2 + normLon * maxArc,
  ];
  const p3: [number, number] = [
    lat1 * 0.25 + lat2 * 0.75 + normLat * maxArc * 0.7,
    lon1 * 0.25 + lon2 * 0.75 + normLon * maxArc * 0.7,
  ];

  return [from, p1, pMid, p3, to];
}

// Map error boundary to ensure map loading issues never crash the main application
class MapErrorBoundary extends Component<{ children: ReactNode; fallbackHeight?: string }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallbackHeight?: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    console.error('[RouteWise MapErrorBoundary caught]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col items-center justify-center text-center space-y-2 text-xs text-slate-400"
          style={{ height: this.props.fallbackHeight || '280px' }}
        >
          <span className="text-amber-400 font-bold text-sm">Map View Fallback</span>
          <p>Interactive tiles currently offline. Schematic hub coordinates and calculations remain active.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function InvalidateMapSize() {
  const map = useMap();
  useEffect(() => {
    // Immediate size recalculation
    map.invalidateSize();

    // Schedule delayed passes to handle CSS animations/tabs/layout settling
    const t1 = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {}
    }, 120);

    const t2 = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {}
    }, 350);

    // Dynamic resize observer
    let ro: ResizeObserver | null = null;
    const container = map.getContainer();
    if (container && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        try {
          map.invalidateSize();
        } catch {}
      });
      ro.observe(container);
    }

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (ro) ro.disconnect();
    };
  }, [map]);
  return null;
}

function FitBounds({
  origin,
  destination,
  segments,
}: {
  origin?: string;
  destination?: string;
  segments?: RouteSegment[];
}) {
  const map = useMap();
  useEffect(() => {
    const coords: [number, number][] = [];
    if (origin && CITY_COORDS[origin]) coords.push(CITY_COORDS[origin]);
    if (destination && CITY_COORDS[destination]) coords.push(CITY_COORDS[destination]);
    if (segments && segments.length > 0) {
      for (const seg of segments) {
        if (CITY_COORDS[seg.from]) coords.push(CITY_COORDS[seg.from]);
        if (CITY_COORDS[seg.to]) coords.push(CITY_COORDS[seg.to]);
      }
    }
    if (coords.length >= 2) {
      try {
        const bounds = L.latLngBounds(coords);
        if (bounds.isValid()) {
          map.invalidateSize();
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 6 });
        }
      } catch (err) {
        console.warn('[RouteMap FitBounds]', err);
      }
    }
  }, [origin, destination, segments, map]);
  return null;
}

export const RouteMap: React.FC<RouteMapProps> = ({
  activeOrigin,
  activeDestination,
  segments = [],
  height = '400px',
  tileUrl,
  tileAttribution,
  subdomains,
}) => {
  const resolvedConfig = resolveTileConfig();
  const activeTileUrl = tileUrl || resolvedConfig.url;
  const activeAttribution = tileAttribution || resolvedConfig.attribution;
  const activeSubdomains = subdomains || resolvedConfig.subdomains;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [tileErrors, setTileErrors] = useState<number>(0);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRetrying(true);
    setTileErrors(0);
    setIsLoading(true);
    setRetryCount((k) => k + 1);
    setTimeout(() => setIsRetrying(false), 600);
  };

  // Default corridors to show when no custom segment list passed
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

  const hasActiveCorridor = Boolean(
    activeOrigin &&
    activeDestination &&
    CITY_COORDS[activeOrigin] &&
    CITY_COORDS[activeDestination] &&
    activeOrigin !== activeDestination
  );

  const displaySegments: RouteSegment[] =
    segments.length > 0
      ? segments
      : hasActiveCorridor
      ? [{ from: activeOrigin!, to: activeDestination!, mode: 'EXPRESS_ROAD' as TransportMode, isActive: true }]
      : defaultSegments;

  const displayCities = hasActiveCorridor ? [activeOrigin!, activeDestination!] : Object.keys(CITY_COORDS);

  return (
    <MapErrorBoundary fallbackHeight={height}>
      <div className="space-y-1.5">
        <div className="rounded-2xl overflow-hidden border border-slate-700/60 shadow-xl relative" style={{ height, minHeight: height }}>
          <MapContainer
            center={[17.5, 79.5]}
            zoom={5}
            style={{ width: '100%', height: '100%', minHeight: height, background: '#0b1120' }}
            scrollWheelZoom={false}
            attributionControl={true}
          >
            <InvalidateMapSize />
            {/* CARTO Dark Matter raster tiles (HTTPS, key-free) or custom configured provider */}
            <TileLayer
              key={`tile-layer-${retryCount}-${activeTileUrl}`}
              url={activeTileUrl}
              subdomains={activeSubdomains}
              attribution={activeAttribution}
              maxZoom={19}
              eventHandlers={{
                tileerror: () => {
                  setIsLoading(false);
                  setTileErrors((count) => Math.min(count + 1, 10));
                },
                tileload: () => {
                  setIsLoading(false);
                  if (tileErrors > 0) setTileErrors(0);
                },
                load: () => {
                  setIsLoading(false);
                },
              }}
            />

            {/* Corridor Polylines (Schematic connection with mode-specific multi-track separation) */}
            {displaySegments.map((seg, i) => {
              const fromCoord = CITY_COORDS[seg.from];
              const toCoord = CITY_COORDS[seg.to];
              if (!fromCoord || !toCoord) return null;

              const sameCorridorSegments = displaySegments.filter(
                (s) => (s.from === seg.from && s.to === seg.to) || (s.from === seg.to && s.to === seg.from)
              );
              const hasMultipleModes = sameCorridorSegments.length > 1;

              let offset = 0;
              if (hasMultipleModes) {
                if (seg.isDisrupted) {
                  offset = 0.35;
                } else {
                  offset = MODE_OFFSET_FACTORS[seg.mode] || 0;
                }
              }

              const positions = calculateArcPositions(fromCoord, toCoord, offset);
              const color = seg.isDisrupted ? '#f43f5e' : MODE_COLORS[seg.mode];
              const isActive = (seg.from === activeOrigin && seg.to === activeDestination) || seg.isActive;

              return (
                <Polyline
                  key={`${seg.from}-${seg.to}-${seg.mode}-${seg.isDisrupted ? 'disrupted' : 'normal'}-${i}`}
                  positions={positions}
                  pathOptions={{
                    color,
                    weight: seg.isDisrupted ? 5 : isActive ? 4 : 2.5,
                    opacity: seg.isDisrupted ? 0.95 : isActive ? 0.95 : 0.4,
                    dashArray: seg.isDisrupted ? '6 6' : seg.mode === 'AIR' ? '8 6' : seg.mode === 'RAIL' ? undefined : '4 3',
                  }}
                  eventHandlers={{
                    click: () => {
                      if (seg.onSelect) seg.onSelect();
                    },
                  }}
                >
                  <Popup className="leaflet-dark-popup">
                    <div className="text-xs space-y-1.5 min-w-[160px]">
                      <div className="font-bold text-white flex items-center justify-between gap-2 border-b border-slate-700/60 pb-1">
                        <span>{seg.from} → {seg.to}</span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold"
                          style={{ color, backgroundColor: `${color}20` }}
                        >
                          {seg.mode.replace('_', ' ')}
                        </span>
                      </div>
                      {seg.optionName && (
                        <div className="text-slate-200 font-medium text-[11px] leading-tight">{seg.optionName}</div>
                      )}
                      {seg.carrier && (
                        <div className="text-slate-400 text-[10px]">{seg.carrier}</div>
                      )}
                      {(seg.costInr !== undefined || seg.durationHours !== undefined) && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
                          {seg.costInr !== undefined && (
                            <span className="text-emerald-400 font-bold">₹{seg.costInr.toLocaleString()}</span>
                          )}
                          {seg.durationHours !== undefined && (
                            <span className="text-cyan-300 font-bold">{seg.durationHours} hrs</span>
                          )}
                        </div>
                      )}
                      <div className="text-slate-400 text-[10px] italic">
                        {seg.isDisrupted
                          ? '⚠️ Disrupted corridor segment'
                          : isActive
                          ? '★ Recommended route option'
                          : 'Alternative evaluated option'}
                      </div>
                    </div>
                  </Popup>
                </Polyline>
              );
            })}

            {/* City Markers */}
            {displayCities.map((city) => {
              const isOrig = city === activeOrigin;
              const isDest = city === activeDestination;
              const isHighlighted = isOrig || isDest;

              return (
                <CircleMarker
                  key={city}
                  center={CITY_COORDS[city]}
                  radius={isHighlighted ? 9 : 5}
                  pathOptions={{
                    color: isOrig ? '#06b6d4' : isDest ? '#a78bfa' : '#94a3b8',
                    fillColor: isOrig ? '#0e7490' : isDest ? '#7c3aed' : '#1e293b',
                    fillOpacity: 1,
                    weight: isHighlighted ? 3 : 1.5,
                  }}
                >
                  <Popup className="leaflet-dark-popup">
                    <div style={{ background: '#0f172a', color: '#e2e8f0', padding: '6px 10px', borderRadius: '8px', fontSize: '12px', border: '1px solid #334155', minWidth: '130px' }}>
                      <div style={{ fontWeight: 'bold', color: isOrig ? '#06b6d4' : isDest ? '#a78bfa' : '#38bdf8' }}>
                        {city} {isOrig ? '(Origin)' : isDest ? '(Destination)' : ''}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '11px' }}>Logistics Terminal Hub</div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

            {(activeOrigin || activeDestination || displaySegments.length > 0) && (
              <FitBounds origin={activeOrigin} destination={activeDestination} segments={displaySegments} />
            )}
          </MapContainer>

          {/* Tile Loading Indicator */}
          {isLoading && tileErrors < 3 && (
            <div className="absolute top-3 left-14 z-[1000] bg-slate-900/90 border border-slate-700/80 text-slate-300 px-3 py-1.5 rounded-xl text-[11px] shadow-lg backdrop-blur-sm flex items-center gap-2 pointer-events-none transition-opacity">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Loading {resolvedConfig.providerName} tiles...</span>
            </div>
          )}

          {/* Tile Loading Error Notice with Interactive Retry Button */}
          {tileErrors >= 3 && (
            <div className="absolute top-3 right-3 z-[1000] bg-slate-900/95 border border-rose-500/60 text-slate-200 px-3 py-2 rounded-xl text-xs shadow-xl backdrop-blur-sm flex items-center gap-3">
              <div className="flex items-center gap-2 text-rose-400">
                <span>⚠️</span>
                <span className="font-semibold text-rose-300">Tile server unreachable</span>
              </div>
              <span className="text-slate-400 text-[11px] hidden sm:inline">
                (Vector corridors active)
              </span>
              <button
                type="button"
                onClick={handleRetry}
                disabled={isRetrying}
                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 active:bg-rose-500/50 text-rose-200 border border-rose-500/40 font-medium text-[11px] transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
              >
                {isRetrying ? '⟳ Retrying...' : '🔄 Retry'}
              </button>
            </div>
          )}
        </div>

        {/* Honest Route Geometry & Simulation Disclaimer */}
        <p className="text-[10px] text-slate-500 italic px-1">
          ⓘ Straight lines represent schematic corridor connections between logistics hubs, not road turn-by-turn navigation or live GPS traces.
        </p>
      </div>
    </MapErrorBoundary>
  );
};

// Mode legend helper
export const MapLegend: React.FC = () => (
  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 mt-2">
    {(Object.entries(MODE_COLORS) as [TransportMode, string][]).map(([mode, color]) => (
      <div key={mode} className="flex items-center gap-1.5">
        <div className="w-5 h-0.5 rounded" style={{ backgroundColor: color, opacity: 0.8 }} />
        <span>{mode.replace('_', ' ')}</span>
      </div>
    ))}
    <div className="flex items-center gap-1.5">
      <div className="w-5 h-1 rounded bg-rose-500 border border-dashed border-rose-300" />
      <span className="text-rose-400 font-semibold">Simulated Disruption</span>
    </div>
  </div>
);
