/**
 * Map Intelligence — MapLibre GL map with well markers, field boundaries,
 * filter panel, and well detail side panel.
 */
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import * as turf from "@turf/turf";

maplibregl.setWorkerUrl(workerUrl);
import { useQuery } from "@tanstack/react-query";
import {
  Search, X, Filter, ChevronRight, Radio, MapPin,
  Drill, Activity, AlertTriangle, Clock, Layers,
} from "lucide-react";
import { mapService } from "@/services/mapService";
import { wellsService, basinsService } from "@/services/wellsService";
import { cn } from "@/utils";
import { useNavigate } from "react-router-dom";

// ─── Well status → color ─────────────────────────────────────
const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  Drilling:  { color: "#eab308", label: "Drilling" },
  Producing: { color: "#059669", label: "Producing" },
  Completed: { color: "#7c3aed", label: "Completed" },
  Testing:   { color: "#d97706", label: "Testing" },
  Suspended: { color: "#6b7280", label: "Suspended" },
  Abandoned: { color: "#374151", label: "Abandoned" },
  Planned:   { color: "#0891b2", label: "Planned" },
};

interface WellProperties {
  id: number;
  well_name: string;
  well_status: string;
  well_purpose: string;
  trajectory_type: string;
  total_depth?: number;
  current_depth?: number;
  field_name?: string;
  basin_name?: string;
  color: string;
}

// ─── Map Helpers ─────────────────────────────────────────────
function generateCirclePolygon(center: [number, number], radiusKm: number) {
  const options = { steps: 64, units: 'kilometers' as const };
  const circle = turf.circle(center, radiusKm, options);
  return circle.geometry.coordinates[0];
}

function generateFieldPolygons(fieldsGeoJSON: any, wellsGeoJSON: any) {
  if (!fieldsGeoJSON || !wellsGeoJSON) return fieldsGeoJSON;

  const polygons = fieldsGeoJSON.features.map((f: any) => {
    const center = f.geometry.coordinates;
    const fieldWells = wellsGeoJSON.features.filter((w: any) => w.properties.field_id === f.properties.id);
    
    let maxDistKm = 2; // minimum 2km radius
    fieldWells.forEach((w: any) => {
      const dist = turf.distance(center, w.geometry.coordinates, { units: 'kilometers' });
      if (dist > maxDistKm) maxDistKm = dist;
    });
    
    const radiusKm = maxDistKm * 1.2; // 20% buffer
    const coords = generateCirclePolygon(center, radiusKm);
    
    return {
      type: "Feature",
      properties: f.properties,
      geometry: { type: "Polygon", coordinates: [coords] }
    };
  });
  
  return { type: "FeatureCollection", features: polygons };
}

// ─── Well Side Panel ─────────────────────────────────────────

function WellSidePanel({
  wellId,
  onClose,
}: { wellId: number; onClose: () => void }) {
  const navigate = useNavigate();

  const { data: well, isLoading: wellLoading } = useQuery({
    queryKey: ["well-detail", wellId],
    queryFn: () => wellsService.getDetail(wellId),
    staleTime: 60_000,
  });

  const { data: events } = useQuery({
    queryKey: ["well-events-panel", wellId],
    queryFn: () => wellsService.getEvents(wellId, { limit: 5 }),
    staleTime: 60_000,
  });

  const { data: offsetWells } = useQuery({
    queryKey: ["offset-wells-panel", wellId],
    queryFn: () => wellsService.getOffsetWells(wellId, 50),
    staleTime: 60_000,
  });

  if (wellLoading) {
    return (
      <div className="h-full p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (!well) return null;

  const statusCfg = STATUS_CONFIG[well.well_status] || { color: "#9ca3af", label: well.well_status };
  const depthPct = well.current_depth && well.planned_depth
    ? Math.min(100, Math.round((well.current_depth / well.planned_depth) * 100))
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-start justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{well.well_name}</h3>
          <p className="text-xs text-gray-400 truncate">{well.field_name} · {well.basin_name}</p>
        </div>
        <button
          onClick={onClose}
          className="ml-2 p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex-shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Status badge */}
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: statusCfg.color }}
          >
            {statusCfg.label}
          </span>
          <span className="text-xs text-gray-500">{well.well_purpose}</span>
          <span className="text-xs text-gray-400">{well.trajectory_type}</span>
        </div>

        {/* Basic info grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Latitude", value: well.latitude?.toFixed(4) },
            { label: "Longitude", value: well.longitude?.toFixed(4) },
            { label: "Reservoir", value: well.reservoir_type },
            { label: "Hydrocarbon", value: well.hydrocarbon_type },
            { label: "Spud Date", value: well.spud_date || "—" },
            { label: "Completion", value: well.completion_date || "—" },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
              <p className="text-xs font-medium text-gray-800 mt-0.5">{value || "—"}</p>
            </div>
          ))}
        </div>

        {/* Depth progress */}
        {well.planned_depth && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Depth Progress</p>
              <p className="text-xs font-medium text-gray-700 tabular-nums">
                {well.current_depth?.toLocaleString()}m / {well.planned_depth?.toLocaleString()}m
              </p>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${depthPct ?? 100}%`,
                  backgroundColor: statusCfg.color,
                }}
              />
            </div>
            {depthPct !== null && (
              <p className="text-[10px] text-gray-400 mt-1">{depthPct}% of planned depth</p>
            )}
          </div>
        )}

        {/* Recent events */}
        {events && events.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <AlertTriangle size={12} className="text-amber-500" />
              Recent Drilling Events
            </p>
            <div className="space-y-1.5">
              {events.slice(0, 4).map((ev: {
                id: number;
                event_type: string;
                severity: string;
                start_depth?: number;
                npt_hours?: number;
              }) => (
                <div key={ev.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
                    style={{
                      backgroundColor: ev.severity === "Critical" || ev.severity === "High"
                        ? "#dc2626" : ev.severity === "Moderate" ? "#d97706" : "#059669",
                    }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{ev.event_type}</p>
                    <p className="text-[10px] text-gray-400">
                      {ev.start_depth ? `${ev.start_depth}m · ` : ""}
                      NPT: {ev.npt_hours?.toFixed(1) ?? "—"}h
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Offset wells */}
        {offsetWells && offsetWells.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <Radio size={12} className="text-blue-500" />
              Nearby Offset Wells
            </p>
            <div className="space-y-1.5">
              {offsetWells.slice(0, 4).map((ow: {
                id: number;
                well_name: string;
                distance_km: number;
                well_status: string;
                total_depth?: number;
              }) => (
                <div key={ow.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{ow.well_name}</p>
                    <p className="text-[10px] text-gray-400">{ow.distance_km} km · {ow.well_status}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                    {ow.total_depth ? `${ow.total_depth.toLocaleString()}m` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer — link to full detail */}
      <div className="p-3 border-t border-gray-200">
        <button
          onClick={() => navigate(`/wells/${wellId}`)}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          View Full Well Intelligence
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── Map Filters Panel ────────────────────────────────────────

function FiltersPanel({
  filters,
  basins,
  onFiltersChange,
}: {
  filters: { basin_id?: string; status: string[]; purpose: string[] };
  basins: Array<{ id: number; name: string }>;
  onFiltersChange: (f: { basin_id?: string; status: string[]; purpose: string[] }) => void;
}) {
  const toggleArrayItem = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-md p-3 w-56">
      <p className="text-xs font-semibold text-gray-700 mb-2.5 flex items-center gap-1.5">
        <Filter size={12} />
        Map Filters
      </p>
      <div className="space-y-2">
        {/* Basin */}
        <select
          value={filters.basin_id || ""}
          onChange={(e) => onFiltersChange({ ...filters, basin_id: e.target.value })}
          className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-gray-700 mb-4"
        >
          <option value="">All Basins</option>
          {basins?.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        {/* Status Checkboxes */}
        <div className="mb-4">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(STATUS_CONFIG).map((s) => {
              const isSelected = filters.status.includes(s);
              const color = STATUS_CONFIG[s].color;
              return (
              <button
                key={s}
                onClick={() => onFiltersChange({ ...filters, status: toggleArrayItem(filters.status, s) })}
                className={cn(
                  "px-2 py-1 text-[10px] font-medium rounded-full border transition-colors flex items-center gap-1.5",
                  isSelected
                    ? "bg-gray-50 border-gray-300 text-gray-700 shadow-sm"
                    : "bg-white border-gray-100 text-gray-400 hover:bg-gray-50"
                )}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color, opacity: isSelected ? 1 : 0.4 }} />
                {s}
              </button>
            )})}
          </div>
        </div>

        {/* Purpose Checkboxes */}
        <div className="mb-4">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Purpose</p>
          <div className="flex flex-wrap gap-1.5">
            {["Exploratory", "Appraisal", "Development", "Injection", "Observation"].map((p) => (
              <button
                key={p}
                onClick={() => onFiltersChange({ ...filters, purpose: toggleArrayItem(filters.purpose, p) })}
                className={cn(
                  "px-2 py-1 text-[10px] font-medium rounded-full border transition-colors",
                  filters.purpose.includes(p)
                    ? "bg-purple-50 border-purple-200 text-purple-700"
                    : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Clear */}
        {(filters.basin_id || filters.status.length > 0 || filters.purpose.length > 0) && (
          <button
            onClick={() => onFiltersChange({ basin_id: undefined, status: [], purpose: [] })}
            className="w-full text-xs text-red-600 hover:text-red-700 py-1 border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
          >
            Clear All Filters
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Proximity Filter Panel ───────────────────────────────────

function RadiusFilterPanel({
  selectedWell,
  radiusKm,
  onRadiusChange,
}: {
  selectedWell: number | null;
  radiusKm: number;
  onRadiusChange: (val: number) => void;
}) {
  if (!selectedWell) return null;
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-md p-3 w-56 animate-in slide-in-from-left-4 fade-in duration-200">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <MapPin size={12} className="text-blue-600" />
        Proximity Filter
      </p>
      <div className="flex items-center gap-2 mb-2">
        <input 
          type="range" 
          min="1" 
          max="30" 
          value={radiusKm} 
          onChange={(e) => onRadiusChange(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
          className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <input
          type="number"
          min="1"
          max="30"
          value={radiusKm}
          onChange={(e) => onRadiusChange(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
          className="w-14 px-1.5 py-1 text-xs border border-gray-200 rounded-lg text-center"
        />
      </div>
      <p className="text-[10px] text-gray-400 leading-tight">
        Showing wells within {radiusKm}km of selected well.
      </p>
    </div>
  );
}

// ─── Main Map Page ────────────────────────────────────────────

export function MapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [selectedWell, setSelectedWell] = useState<number | null>(null);
  const [radiusKm, setRadiusKm] = useState(15);
  const [filters, setFilters] = useState<{ basin_id?: string; status: string[]; purpose: string[] }>({
    status: ["Drilling", "Completed"],
    purpose: ["Exploratory", "Appraisal", "Development", "Injection", "Observation"],
  });
  const [search, setSearch] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const [is3D, setIs3D] = useState(false);

  const { data: basins } = useQuery({
    queryKey: ["basins"],
    queryFn: basinsService.list,
    staleTime: 300_000,
  });

  const { data: wellsGeoJSON } = useQuery({
    queryKey: ["wells-geojson", filters],
    queryFn: () => mapService.getWellsGeoJSON({
      basin_id: filters.basin_id ? parseInt(filters.basin_id) : undefined,
      status: filters.status.length > 0 ? filters.status : undefined,
      purpose: filters.purpose.length > 0 ? filters.purpose : undefined,
    }),
    staleTime: 30_000,
    enabled: mapReady,
  });

  const { data: fieldsGeoJSON } = useQuery({
    queryKey: ["fields-geojson", filters.basin_id],
    queryFn: () => mapService.getFieldsGeoJSON({
      basin_id: filters.basin_id ? parseInt(filters.basin_id) : undefined,
    }),
    staleTime: 300_000,
    enabled: mapReady,
  });

  // ── Initialize Map ──────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{ 
          id: "osm", 
          type: "raster", 
          source: "osm",
          paint: {
            "raster-opacity": 0.4,
            "raster-saturation": -0.5,
          }
        }],
      },
      center: [83.0, 23.0], // Centre of India
      zoom: 4.5,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-right");

    map.on("load", () => {
      // ── Well circles source ──
      map.addSource("wells", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // ── Field labels source ──
      map.addSource("fields", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      // Field boundary area
      map.addLayer({
        id: "fields-fill",
        type: "fill",
        source: "fields",
        paint: {
          "fill-color": "#eff6ff",
          "fill-opacity": 0.3,
        },
      });

      // Field boundary dashed outline
      map.addLayer({
        id: "fields-line",
        type: "line",
        source: "fields",
        paint: {
          "line-color": "#3b82f6",
          "line-width": 2,
          "line-dasharray": [4, 4],
        },
      });

      // ── Radius boundary source ──
      map.addSource("radius-boundary", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "radius-fill",
        type: "fill",
        source: "radius-boundary",
        paint: {
          "fill-color": "#ef4444",
          "fill-opacity": 0.05,
        },
      });

      map.addLayer({
        id: "radius-line",
        type: "line",
        source: "radius-boundary",
        paint: {
          "line-color": "#ef4444",
          "line-width": 1.5,
          "line-dasharray": [4, 4],
          "line-opacity": 0.7,
        },
      });

      // Well circle layer
      map.addLayer({
        id: "wells-circles",
        type: "circle",
        source: "wells",
        paint: {
          "circle-radius": 6,
          "circle-color": ["get", "color"],
          "circle-opacity": 0.85,
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff",
        },
      });

      // ── Wells 3D Extrusion source ──
      map.addSource("wells-3d", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "wells-3d-extrusion",
        type: "fill-extrusion",
        source: "wells-3d",
        layout: {
          "visibility": "none",
        },
        paint: {
          "fill-extrusion-color": ["get", "color"],
          "fill-extrusion-height": ["get", "height"],
          "fill-extrusion-base": ["get", "base_height"],
          "fill-extrusion-opacity": 0.9,
        },
      });

      // Well click handler for 3D
      map.on("click", "wells-3d-extrusion", (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        if (!e.features || !e.features[0]) return;
        const props = e.features[0].properties as WellProperties;
        setSelectedWell(props.id);
      });
      map.on("mouseenter", "wells-3d-extrusion", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "wells-3d-extrusion", () => {
        map.getCanvas().style.cursor = "";
      });

      // Well label layer (visible at zoom 8+)
      map.addLayer({
        id: "wells-labels",
        type: "symbol",
        source: "wells",
        minzoom: 8,
        layout: {
          "text-field": ["get", "well_name"],
          "text-size": 10,
          "text-offset": [0, 1.2],
          "text-anchor": "top",
          "text-optional": true,
        },
        paint: {
          "text-color": "#374151",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1,
        },
      });

      // Field symbol layer
      map.addLayer({
        id: "fields-labels",
        type: "symbol",
        source: "fields",
        minzoom: 5,
        layout: {
          "text-field": ["get", "name"],
          "text-size": 11,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-optional": true,
        },
        paint: {
          "text-color": "#1d4ed8",
          "text-halo-color": "#dbeafe",
          "text-halo-width": 2,
        },
      });

      // Well click handler
      map.on("click", "wells-circles", (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
        if (!e.features || !e.features[0]) return;
        const props = e.features[0].properties as WellProperties;
        setSelectedWell(props.id);
      });

      // Cursor change on hover
      map.on("mouseenter", "wells-circles", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "wells-circles", () => {
        map.getCanvas().style.cursor = "";
      });

      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Filter wells by radius ──────────────────────────────────
  const displayWellsGeoJSON = useMemo(() => {
    if (!wellsGeoJSON) return null;
    if (!selectedWell) return wellsGeoJSON;

    const centerWell = wellsGeoJSON.features.find((f: any) => f.properties.id === selectedWell);
    if (!centerWell) return wellsGeoJSON;

    const center = centerWell.geometry.coordinates;
    const filtered = wellsGeoJSON.features.filter((w: any) => {
      const dist = turf.distance(center, w.geometry.coordinates, { units: 'kilometers' });
      return dist <= radiusKm;
    });

    return { type: "FeatureCollection", features: filtered };
  }, [wellsGeoJSON, selectedWell, radiusKm]);

  // ── Compute 3D Extrusion GeoJSON ────────────────────────────
  const wells3DGeoJSON = useMemo(() => {
    if (!displayWellsGeoJSON) return null;
    const features: any[] = [];
    
    displayWellsGeoJSON.features.forEach((w: any) => {
      const p = w.properties;
      const coords = w.geometry.coordinates;
      const totalDepth = p.planned_depth || p.total_depth || 2000; 
      
      if (p.well_status === "Planned") {
        const outer = turf.circle(coords, 0.2, { units: 'kilometers', steps: 16 });
        const inner = turf.circle(coords, 0.16, { units: 'kilometers', steps: 16 });
        const ringOuter = outer.geometry.coordinates[0];
        const ringInner = inner.geometry.coordinates[0].reverse();
        
        features.push({
          type: "Feature",
          geometry: { type: "Polygon", coordinates: [ringOuter, ringInner] },
          properties: { ...p, base_height: 0, height: totalDepth, color: "rgba(168, 85, 247, 0.7)" }
        });
      } else {
        const circle = turf.circle(coords, 0.2, { units: 'kilometers', steps: 16 });
        const numLayers = p.well_status === "Drilling" ? 3 : p.well_status === "Completed" ? 4 : 2;
        
        const baseColor = p.well_status === "Drilling" ? [234, 179, 8] : 
                          p.well_status === "Completed" ? [37, 99, 235] : 
                          [107, 114, 128]; 
        
        const layerHeight = totalDepth / numLayers;
        
        for (let i = 0; i < numLayers; i++) {
          const shadeOffset = (i - (numLayers / 2)) * 15;
          const colorHex = `rgba(${Math.max(0, Math.min(255, baseColor[0] + shadeOffset))}, ${Math.max(0, Math.min(255, baseColor[1] + shadeOffset))}, ${Math.max(0, Math.min(255, baseColor[2] + shadeOffset))}, 0.95)`;
          
          features.push({
            type: "Feature",
            geometry: circle.geometry,
            properties: { 
              ...p, 
              base_height: i * layerHeight, 
              height: (i + 1) * layerHeight, 
              color: colorHex
            }
          });
        }
      }
    });
    
    return { type: "FeatureCollection", features };
  }, [displayWellsGeoJSON]);

  // ── Update wells GeoJSON ────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !displayWellsGeoJSON || !mapReady) return;
    const src = mapRef.current.getSource("wells") as maplibregl.GeoJSONSource;
    if (src) {
      src.setData(displayWellsGeoJSON);
    }
    
    const src3d = mapRef.current.getSource("wells-3d") as maplibregl.GeoJSONSource;
    if (src3d && wells3DGeoJSON) {
      src3d.setData(wells3DGeoJSON);
    }
  }, [displayWellsGeoJSON, wells3DGeoJSON, mapReady]);

  // ── Toggle 3D mode ──────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;
    if (is3D) {
      map.easeTo({ pitch: 65, bearing: -20, duration: 1000 });
      map.setLayoutProperty("wells-circles", "visibility", "none");
      map.setLayoutProperty("wells-3d-extrusion", "visibility", "visible");
    } else {
      map.easeTo({ pitch: 0, bearing: 0, duration: 1000 });
      map.setLayoutProperty("wells-circles", "visibility", "visible");
      map.setLayoutProperty("wells-3d-extrusion", "visibility", "none");
    }
  }, [is3D, mapReady]);

  // ── Update fields GeoJSON ───────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !fieldsGeoJSON || !wellsGeoJSON || !mapReady) return;
    const src = mapRef.current.getSource("fields") as maplibregl.GeoJSONSource;
    if (src) {
      src.setData(generateFieldPolygons(fieldsGeoJSON, wellsGeoJSON));
    }
  }, [fieldsGeoJSON, wellsGeoJSON, mapReady]);

  // ── Selected well beating shadow (HTML Marker) & Radius Line ──
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    
    const radiusSrc = mapRef.current.getSource("radius-boundary") as maplibregl.GeoJSONSource;

    if (selectedWell && wellsGeoJSON) {
      const well = wellsGeoJSON.features.find((f: any) => f.properties.id === selectedWell);
      if (well) {
        // Update Marker
        if (!markerRef.current) {
          const container = document.createElement("div");
          container.className = "w-6 h-6 flex items-center justify-center pointer-events-none";
          
          const el = document.createElement("div");
          el.className = "w-full h-full bg-red-500 rounded-full animate-ping opacity-60";
          el.style.animationDuration = "2s";
          
          container.appendChild(el);

          markerRef.current = new maplibregl.Marker({ element: container })
            .setLngLat(well.geometry.coordinates)
            .addTo(mapRef.current);
        } else {
          markerRef.current.setLngLat(well.geometry.coordinates);
        }
        
        // Update Radius Layer
        if (radiusSrc) {
          const coords = generateCirclePolygon(well.geometry.coordinates, radiusKm);
          radiusSrc.setData({
            type: "FeatureCollection",
            features: [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [coords] } }]
          });
        }
      } else {
        // Filtered out! Remove marker and radius.
        if (markerRef.current) {
          markerRef.current.remove();
          markerRef.current = null;
        }
        if (radiusSrc) {
          radiusSrc.setData({ type: "FeatureCollection", features: [] });
        }
      }
    } else {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      if (radiusSrc) {
        radiusSrc.setData({ type: "FeatureCollection", features: [] });
      }
    }
  }, [selectedWell, wellsGeoJSON, radiusKm, mapReady]);

  // ── Fly to searched well ────────────────────────────────────
  const handleSearch = useCallback(() => {
    if (!wellsGeoJSON || !mapRef.current) return;
    const match = wellsGeoJSON.features.find((f: { properties: WellProperties }) =>
      f.properties.well_name.toLowerCase().includes(search.toLowerCase()) ||
      f.properties.field_name?.toLowerCase().includes(search.toLowerCase())
    );
    if (match) {
      const [lon, lat] = match.geometry.coordinates;
      mapRef.current.flyTo({ center: [lon, lat], zoom: 10, duration: 1200 });
      setSelectedWell(match.properties.id);
    }
  }, [wellsGeoJSON, search]);

  const wellCount = displayWellsGeoJSON?.features?.length ?? 0;

  return (
    <div className="relative h-screen flex flex-col">
      {/* Top bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
        <div className="relative bg-white border border-gray-200 rounded-xl shadow-md flex items-center">
          <Search size={14} className="absolute left-3 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search wells, fields..."
            className="pl-9 pr-3 py-2.5 text-sm w-72 rounded-xl focus:outline-none text-gray-700"
          />
        </div>
        <button
          onClick={() => setIs3D(!is3D)}
          className={cn(
            "bg-white border border-gray-200 rounded-xl shadow-md px-3 py-2 text-sm font-semibold flex items-center gap-1.5 transition-colors focus:outline-none",
            is3D ? "text-blue-600 border-blue-300" : "text-gray-600 hover:bg-gray-50"
          )}
        >
          <Layers size={14} className={is3D ? "text-blue-600" : "text-gray-400"} /> 
          {is3D ? "2D Mode" : "3D Mode"}
        </button>
        <div className="bg-white border border-gray-200 rounded-xl shadow-md px-3 py-2 text-xs text-gray-600">
          <span className="font-semibold text-gray-900">{wellCount}</span> wells
        </div>
      </div>

      {/* Filter & Radius panels */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-3">
        <FiltersPanel
          filters={filters}
          basins={basins ?? []}
          onFiltersChange={setFilters}
        />
        <RadiusFilterPanel 
          selectedWell={selectedWell}
          radiusKm={radiusKm}
          onRadiusChange={setRadiusKm}
        />
      </div>

      {/* Map */}
      <div ref={mapContainer} className="flex-1 w-full" />

      {/* Well detail side panel */}
      {selectedWell && (
        <div className="absolute top-0 right-0 h-full w-80 bg-white border-l border-gray-200 shadow-xl z-10 overflow-hidden">
          <WellSidePanel
            wellId={selectedWell}
            onClose={() => setSelectedWell(null)}
          />
        </div>
      )}
    </div>
  );
}
