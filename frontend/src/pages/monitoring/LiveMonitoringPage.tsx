/**
 * Live Rig Monitoring Page
 * Real-time telemetry via WebSocket, drilling parameters dashboard,
 * formation tracker, risk predictions, and alert system.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity, AlertTriangle, PlayCircle, StopCircle,
  ChevronDown, ChevronRight, RotateCcw, Gauge, Layers,
  Thermometer, Droplets, TrendingUp, Zap, Shield,
  Clock, RefreshCw,
} from "lucide-react";
import { wellsService, basinsService } from "@/services/wellsService";
import api from "@/services/api";
import { cn } from "@/utils";

// ─── Types ────────────────────────────────────────────────────
interface TelemetryState {
  well_id: number;
  current_depth: number;
  total_depth: number;
  rop: number;
  wob: number;
  rpm: number;
  torque: number;
  mud_weight: number;
  ecd: number;
  flow_rate: number;
  standpipe_pressure: number;
  hookload: number;
  pit_volume: number;
  temp_in: number;
  temp_out: number;
  gas_units: number;
  current_formation: string;
  pore_pressure_gg: number;
  frac_gradient_gg: number;
  alerts: Array<{ type: string; message: string; parameter: string }>;
  timestamp?: string;
  is_running: boolean;
  mode: string;
}

interface RiskPrediction {
  risk_type: string;
  depth_start: number;
  depth_end: number;
  window: string;
  confidence: number;
  severity: string;
  formation: string;
  evidence: string;
  historical_frequency: number;
}

// ─── Gauge Needle component ───────────────────────────────────
function GaugeCard({
  label, value, unit, min, max, warningPct = 0.75, criticalPct = 0.9,
  icon: Icon, color,
}: {
  label: string; value: number; unit: string;
  min: number; max: number;
  warningPct?: number; criticalPct?: number;
  icon: React.ElementType; color: string;
}) {
  const pct = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const isWarning = pct >= warningPct;
  const isCritical = pct >= criticalPct;
  const barColor = isCritical ? "#dc2626" : isWarning ? "#d97706" : color;

  return (
    <div className={cn(
      "bg-white border rounded-xl p-3 flex flex-col gap-2",
      isCritical ? "border-red-300 shadow-sm shadow-red-100" :
      isWarning ? "border-amber-200" : "border-gray-200"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon size={13} style={{ color: barColor }} />
          <span className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</span>
        </div>
        {isCritical && <span className="text-[9px] text-red-600 font-semibold bg-red-50 px-1.5 py-0.5 rounded">CRITICAL</span>}
        {isWarning && !isCritical && <span className="text-[9px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">HIGH</span>}
      </div>
      <div className="flex items-end gap-1">
        <span className="text-xl font-semibold tabular-nums text-gray-900">{value.toFixed(1)}</span>
        <span className="text-xs text-gray-400 mb-0.5">{unit}</span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct * 100}%`, backgroundColor: barColor }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-gray-300">
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}

// ─── Depth strip visualizer ───────────────────────────────────
function DepthStrip({ current, total, formation, ppGG, fgGG, ecd }: {
  current: number; total: number; formation: string;
  ppGG: number; fgGG: number; ecd: number;
}) {
  const pct = total > 0 ? (current / total) * 100 : 0;
  const liftPct = total > 0 ? (ppGG / 1.8) * 100 : 50;
  const fracPct = total > 0 ? (fgGG / 1.8) * 100 : 90;
  const ecdPct = total > 0 ? (ecd / 1.8) * 100 : 70;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Layers size={14} className="text-purple-600" />
          Depth Progress
        </h3>
        <div className="text-right">
          <span className="text-xl font-bold text-gray-900 tabular-nums">{current.toFixed(0)}</span>
          <span className="text-sm text-gray-400"> / {total.toFixed(0)}m</span>
        </div>
      </div>

      {/* Main depth bar */}
      <div className="relative w-full h-6 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 rounded-full"
          style={{ width: `${pct}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-gray-700 mix-blend-multiply">
            {pct.toFixed(1)}% drilled
          </span>
        </div>
      </div>

      {/* Formation */}
      <div className="flex items-center gap-2 mt-2 p-2 bg-purple-50 rounded-lg">
        <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0" />
        <div>
          <p className="text-[10px] text-purple-400 uppercase tracking-wide">Current Formation</p>
          <p className="text-sm font-semibold text-purple-900">{formation}</p>
        </div>
      </div>

      {/* Pressure window */}
      <div className="mt-3">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">Pressure Window</p>
        <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          {/* Safe window */}
          <div
            className="absolute top-0 h-full bg-green-200"
            style={{ left: `${liftPct}%`, width: `${fracPct - liftPct}%` }}
          />
          {/* ECD indicator */}
          <div
            className="absolute top-0 w-0.5 h-full bg-blue-600 z-10 transition-all duration-500"
            style={{ left: `${Math.min(99, ecdPct)}%` }}
          />
          {/* Labels */}
        </div>
        <div className="flex justify-between text-[9px] text-gray-400 mt-1">
          <span>PP: {ppGG.toFixed(2)}sg</span>
          <span className="text-blue-600 font-medium">ECD: {ecd.toFixed(2)}sg</span>
          <span>FG: {fgGG.toFixed(2)}sg</span>
        </div>
      </div>
    </div>
  );
}

// ─── Alert banner ─────────────────────────────────────────────
function AlertBanner({ alerts }: { alerts: Array<{ type: string; message: string; parameter: string }> }) {
  if (!alerts.length) return null;
  return (
    <div className="space-y-1.5">
      {alerts.map((alert, i) => (
        <div
          key={i}
          className={cn(
            "flex items-start gap-2 px-3 py-2.5 rounded-xl border text-sm",
            alert.type === "critical"
              ? "bg-red-50 border-red-300 text-red-800"
              : "bg-amber-50 border-amber-200 text-amber-800"
          )}
        >
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-[11px] uppercase tracking-wide">{alert.type} · {alert.parameter}</span>
            <p className="text-xs mt-0.5">{alert.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Risk panel ───────────────────────────────────────────────
const SEVERITY_COLORS: Record<string, string> = {
  Critical: "#dc2626", High: "#ea580c", Moderate: "#d97706", Low: "#059669",
};

function RiskPanel({ risks }: { risks: RiskPrediction[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Shield size={14} className="text-red-500" />
        Risk Predictions Ahead
      </h3>
      {risks.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">No risks predicted</p>
      ) : (
        <div className="space-y-2.5">
          {risks.map((r, i) => (
            <div key={i} className="border border-gray-100 rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: SEVERITY_COLORS[r.severity] || "#9ca3af" }} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{r.risk_type}</p>
                    <p className="text-[10px] text-gray-400">{r.window} · {r.depth_start}–{r.depth_end}m</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-base font-bold tabular-nums" style={{ color: SEVERITY_COLORS[r.severity] || "#9ca3af" }}>
                    {r.confidence.toFixed(0)}%
                  </p>
                  <p className="text-[9px] text-gray-400">{r.severity}</p>
                </div>
              </div>
              {/* Confidence bar */}
              <div className="mt-2 w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${r.confidence}%`, backgroundColor: SEVERITY_COLORS[r.severity] || "#9ca3af" }}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5 italic">{r.evidence}</p>
              {r.historical_frequency > 0 && (
                <p className="text-[10px] text-gray-500 mt-0.5">
                  📋 {r.historical_frequency} historical occurrences in knowledge base
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export function LiveMonitoringPage() {
  const [selectedWellId, setSelectedWellId] = useState<number | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [telemetry, setTelemetry] = useState<TelemetryState | null>(null);
  const [history, setHistory] = useState<number[]>([]);   // depth history for mini chart
  const wsRef = useRef<WebSocket | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch wells for selector ──────────────────────────────
  const { data: wells } = useQuery({
    queryKey: ["wells-simple"],
    queryFn: () => wellsService.list({ limit: 50 }),
    staleTime: 300_000,
  });

  // ── Fetch risks (REST) ────────────────────────────────────
  const { data: risks, refetch: refetchRisks } = useQuery({
    queryKey: ["live-risks", selectedWellId],
    queryFn: () => selectedWellId
      ? api.get(`/api/live/risks/${selectedWellId}`).then((r) => r.data)
      : Promise.resolve([]),
    enabled: !!selectedWellId,
    staleTime: 10_000,
    refetchInterval: isStreaming ? 15_000 : false,
  });

  // ── Timer ─────────────────────────────────────────────────
  useEffect(() => {
    if (isStreaming) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isStreaming]);

  // ── Start streaming ───────────────────────────────────────
  const startStream = useCallback(async () => {
    if (!selectedWellId) return;

    // Initialize simulator via REST
    await api.post(`/api/live/sim/${selectedWellId}/start`, null, {
      params: { starting_depth: 0, mode: "Auto" },
    });

    // Connect WebSocket
    const wsUrl = `ws://localhost:8000/ws/telemetry/${selectedWellId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsStreaming(true);
      setHistory([]);
    };

    ws.onmessage = (event) => {
      try {
        const data: TelemetryState = JSON.parse(event.data);
        setTelemetry(data);
        setHistory((prev) => [...prev.slice(-60), data.current_depth]);
      } catch {
        /* noop */
      }
    };

    ws.onclose = () => {
      setIsStreaming(false);
    };

    ws.onerror = () => {
      setIsStreaming(false);
    };

    wsRef.current = ws;
  }, [selectedWellId]);

  // ── Stop streaming ────────────────────────────────────────
  const stopStream = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ command: "stop" }));
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  useEffect(() => () => stopStream(), []);

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const telD = telemetry;

  return (
    <div className="p-5 max-w-[1600px] space-y-4">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start flex-wrap gap-4 justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Activity size={20} className="text-green-600" />
            Live Rig Monitoring
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Real-time telemetry simulator with ML risk prediction</p>
        </div>

        {/* Well selector + controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedWellId ?? ""}
            onChange={(e) => {
              stopStream();
              setTelemetry(null);
              setSelectedWellId(e.target.value ? parseInt(e.target.value) : null);
            }}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 text-gray-700 min-w-52"
          >
            <option value="">Select a well to monitor…</option>
            {(wells ?? []).map((w: { id: number; well_name: string; well_status: string }) => (
              <option key={w.id} value={w.id}>{w.well_name} — {w.well_status}</option>
            ))}
          </select>

          {!isStreaming ? (
            <button
              onClick={startStream}
              disabled={!selectedWellId}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors",
                selectedWellId
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              <PlayCircle size={16} />
              Start Simulation
            </button>
          ) : (
            <button
              onClick={stopStream}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              <StopCircle size={16} />
              Stop
            </button>
          )}

          {isStreaming && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-700 font-medium">LIVE · {formatElapsed(elapsed)}</span>
            </div>
          )}
        </div>
      </div>

      {!selectedWellId && (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center">
          <Activity size={48} className="text-gray-200 mx-auto mb-4" />
          <h2 className="text-base font-semibold text-gray-700 mb-1">No Well Selected</h2>
          <p className="text-sm text-gray-400">Select a well above and click Start Simulation to begin live monitoring.</p>
        </div>
      )}

      {selectedWellId && (
        <>
          {/* ── Alerts ───────────────────────────────────────── */}
          {telD?.alerts && telD.alerts.length > 0 && (
            <AlertBanner alerts={telD.alerts} />
          )}

          {/* ── Main grid ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">

            {/* Left: depth + gauges */}
            <div className="space-y-4">

              {/* Depth strip */}
              <DepthStrip
                current={telD?.current_depth ?? 0}
                total={telD?.total_depth ?? 4000}
                formation={telD?.current_formation ?? "—"}
                ppGG={telD?.pore_pressure_gg ?? 1.00}
                fgGG={telD?.frac_gradient_gg ?? 1.55}
                ecd={telD?.ecd ?? 1.35}
              />

              {/* Gauge grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <GaugeCard label="ROP" value={telD?.rop ?? 0} unit="m/h" min={0} max={25}
                  warningPct={0.85} criticalPct={0.95} icon={TrendingUp} color="#2563eb" />
                <GaugeCard label="WOB" value={telD?.wob ?? 0} unit="T" min={0} max={35}
                  warningPct={0.80} criticalPct={0.92} icon={Activity} color="#059669" />
                <GaugeCard label="RPM" value={telD?.rpm ?? 0} unit="rpm" min={0} max={200}
                  warningPct={0.80} criticalPct={0.90} icon={RotateCcw} color="#7c3aed" />
                <GaugeCard label="Torque" value={telD?.torque ?? 0} unit="kNm" min={0} max={25}
                  warningPct={0.72} criticalPct={0.85} icon={Zap} color="#d97706" />
                <GaugeCard label="Mud Weight" value={telD?.mud_weight ?? 0} unit="sg" min={1.0} max={2.0}
                  warningPct={0.70} criticalPct={0.88} icon={Droplets} color="#0891b2" />
                <GaugeCard label="ECD" value={telD?.ecd ?? 0} unit="sg" min={1.0} max={2.0}
                  warningPct={0.75} criticalPct={0.90} icon={Gauge} color="#ea580c" />
                <GaugeCard label="SPP" value={telD?.standpipe_pressure ?? 0} unit="bar" min={0} max={400}
                  warningPct={0.80} criticalPct={0.92} icon={Activity} color="#4f46e5" />
                <GaugeCard label="Pit Vol." value={telD?.pit_volume ?? 0} unit="m³" min={200} max={350}
                  warningPct={0.30} criticalPct={0.15} icon={Droplets} color="#059669" />
                <GaugeCard label="Flow Rate" value={telD?.flow_rate ?? 0} unit="lpm" min={0} max={3000}
                  warningPct={0.85} criticalPct={0.95} icon={Activity} color="#2563eb" />
                <GaugeCard label="Hookload" value={telD?.hookload ?? 0} unit="T" min={0} max={250}
                  warningPct={0.80} criticalPct={0.92} icon={Activity} color="#374151" />
                <GaugeCard label="Temp Out" value={telD?.temp_out ?? 0} unit="°C" min={30} max={150}
                  warningPct={0.70} criticalPct={0.88} icon={Thermometer} color="#dc2626" />
                <GaugeCard label="Gas Units" value={telD?.gas_units ?? 0} unit="gu" min={0} max={200}
                  warningPct={0.40} criticalPct={0.65} icon={Activity} color="#b45309" />
              </div>

              {/* Mini depth chart */}
              {history.length > 2 && (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                    <Clock size={12} className="text-gray-400" />
                    Depth History (last {history.length} updates)
                  </p>
                  <svg width="100%" height="60" className="overflow-visible">
                    {(() => {
                      const w = 600;
                      const h = 50;
                      const maxD = Math.max(...history);
                      const minD = Math.min(...history);
                      const range = maxD - minD || 1;
                      const pts = history.map((d, i) => {
                        const x = (i / (history.length - 1)) * w;
                        const y = h - ((d - minD) / range) * h;
                        return `${x},${y}`;
                      }).join(" ");
                      return (
                        <>
                          <polyline points={pts} fill="none" stroke="#2563eb" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                          {history.length > 1 && (
                            <polyline
                              points={`0,${h} ${pts} ${600},${h}`}
                              fill="url(#depthGrad)" stroke="none" opacity={0.12}
                            />
                          )}
                          <defs>
                            <linearGradient id="depthGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#2563eb" />
                              <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <text x={0} y={h - 2} fontSize={8} fill="#9ca3af">{minD.toFixed(0)}m</text>
                          <text x={w - 5} y={h - 2} fontSize={8} fill="#9ca3af" textAnchor="end">{maxD.toFixed(0)}m</text>
                        </>
                      );
                    })()}
                  </svg>
                </div>
              )}
            </div>

            {/* Right: risk panel */}
            <div>
              <RiskPanel risks={risks ?? []} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
