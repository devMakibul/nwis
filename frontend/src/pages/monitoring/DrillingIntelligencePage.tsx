import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity, AlertTriangle, PlayCircle, StopCircle,
  RotateCcw, Gauge, Layers, Thermometer, Droplets,
  TrendingUp, Zap, X, Database, Radio, Drill,
  AlertCircle, Info, Shield, Columns2, AlignJustify,
  SlidersHorizontal, ChevronDown, Check,
} from "lucide-react";
import { wellsService, liveService } from "@/services/wellsService";
import { useSimulationStore, RiskPrediction } from "@/store/simulationStore";
import { cn } from "@/utils";
import { EventDetailModal } from "@/components/shared/EventDetailModal";

// ─── Constants & Helpers ──────────────────────────────────────
const SEVERITY_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  Critical: { bg: "bg-red-50",    border: "border-red-400",    text: "text-red-800",    dot: "#dc2626" },
  High:     { bg: "bg-orange-50", border: "border-orange-400", text: "text-orange-800", dot: "#ea580c" },
  Moderate: { bg: "bg-amber-50",  border: "border-amber-400",  text: "text-amber-800",  dot: "#d97706" },
  Low:      { bg: "bg-green-50",  border: "border-green-300",  text: "text-green-800",  dot: "#059669" },
};

const FORMATION_COLORS = [
  "#fde68a", "#fed7aa", "#d9f99d", "#bfdbfe",
  "#e9d5ff", "#fecdd3", "#cffafe", "#ddd6fe",
  "#ffedd5", "#fef08a", "#bbf7d0", "#a7f3d0",
  "#bae6fd", "#c7d2fe", "#fbcfe8", "#fecaca",
  "#fef3c7", "#ecfccb", "#ccfbf1", "#e0e7ff",
];

function getFormationColor(name: string) {
  if (!name) return "#ffffff";
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return FORMATION_COLORS[Math.abs(hash) % FORMATION_COLORS.length];
}

function getFormationAtDepth(formations: any[], depth: number) {
  if (!formations || !formations.length) return null;
  const sorted = [...formations].sort((a, b) => Math.round(a.top_depth || 0) - Math.round(b.top_depth || 0));
  
  for (let i = sorted.length - 1; i >= 0; i--) {
    const f = sorted[i];
    if (depth >= Math.round(f.top_depth || 0)) {
      return f;
    }
  }
  return null;
}

function getRowDepth(rowDepths: number[], depth: number) {
  let closest = rowDepths[0];
  let minDiff = Infinity;
  for (const rd of rowDepths) {
    const diff = Math.abs(depth - rd);
    if (diff < minDiff) {
      minDiff = diff;
      closest = rd;
    }
  }
  return closest;
}

// ─── Components ───────────────────────────────────────────────

function GaugeCard({ label, value, unit, min, max, warningPct = 0.75, criticalPct = 0.9, icon: Icon, color }: {
  label: string; value: number; unit: string; min: number; max: number;
  warningPct?: number; criticalPct?: number; icon: React.ElementType; color: string;
}) {
  const pct = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const isCritical = pct >= criticalPct;
  const isWarning = pct >= warningPct && !isCritical;
  const barColor = isCritical ? "#dc2626" : isWarning ? "#d97706" : color;
  return (
    <div className={cn("bg-white border rounded-xl p-3 flex flex-col gap-2 w-28 flex-shrink-0", isCritical ? "border-red-300" : isWarning ? "border-amber-200" : "border-gray-200")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 min-w-0">
          <Icon size={11} style={{ color: barColor }} className="flex-shrink-0" />
          <span className="text-[10px] text-gray-500 uppercase tracking-wide truncate">{label}</span>
        </div>
        {isCritical && <span className="text-[8px] text-red-600 font-bold bg-red-50 px-1 rounded flex-shrink-0">CRIT</span>}
      </div>
      <div className="flex items-end gap-1">
        <span className="text-base font-bold tabular-nums text-gray-900">{value.toFixed(1)}</span>
        <span className="text-[10px] text-gray-400 mb-0.5">{unit}</span>
      </div>
      <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct * 100}%`, backgroundColor: barColor }} />
      </div>
    </div>
  );
}

function EventChip({ event, onClick }: { event: any, onClick: () => void }) {
  const sev = SEVERITY_COLORS[event.severity] || SEVERITY_COLORS.Low;
  return (
    <button onClick={onClick} className={cn("w-max max-w-full px-2 py-1 rounded-full border text-left hover:shadow-sm transition-all cursor-pointer bg-white/95", sev.border)}>
      <div className="flex items-center gap-1.5">
        <p className={cn("text-[9px] font-semibold truncate", sev.text)}>{event.event_type}</p>
        {event.well_name && <p className="text-[8px] text-gray-400 truncate ml-1">{event.well_name}</p>}
      </div>
    </button>
  );
}

function RiskSidebarItem({ risk, onClick }: { risk: RiskPrediction; onClick: () => void }) {
  const sev = SEVERITY_COLORS[risk.severity] || SEVERITY_COLORS.Low;
  const barColor = sev.bg.replace('bg-', 'bg-').replace('50', '400');
  
  return (
    <div className="relative overflow-hidden p-3.5 border-b border-gray-100 hover:bg-slate-50 transition-colors group cursor-pointer" onClick={onClick}>
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", barColor)} style={{ backgroundColor: sev.dot }} />
      <div className="flex justify-between items-start mb-2 pl-2">
        <div>
          <h4 className="text-xs font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
            <AlertTriangle size={12} style={{ color: sev.dot }} />
            {risk.risk_type}
          </h4>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5">{risk.depth_start}m • {risk.formation}</p>
        </div>
        <div className="flex flex-col items-end">
          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm border", sev.bg, sev.border, sev.text)}>
            {risk.confidence.toFixed(0)}%
          </span>
          <span className="text-[9px] text-slate-400 font-semibold mt-1 uppercase tracking-wider">{risk.severity}</span>
        </div>
      </div>
      <div className="pl-2">
        <div className="h-1 w-full bg-slate-100 rounded-full mb-2 overflow-hidden shadow-inner">
          <div className="h-full rounded-full transition-all duration-700 ease-in-out" style={{ width: `${risk.confidence}%`, backgroundColor: sev.dot }} />
        </div>
        <p className="text-[9px] text-slate-600 leading-relaxed bg-slate-100/50 p-1.5 rounded-md border border-slate-200/50">
          {risk.evidence}
        </p>
      </div>
    </div>
  );
}

function EventSidebarItem({ event, onClick }: { event: any; onClick: () => void }) {
  const sev = SEVERITY_COLORS[event.severity] || SEVERITY_COLORS.Moderate;
  const mit = event.mitigations?.[0]?.description || "No recommendations available.";
  
  return (
    <div className="relative overflow-hidden p-3.5 border-b border-gray-100 hover:bg-red-50/50 transition-colors group cursor-pointer" onClick={onClick}>
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: sev.dot }} />
      <div className="flex justify-between items-start mb-2 pl-2">
        <div>
          <h4 className="text-xs font-bold text-red-900 tracking-tight flex items-center gap-1.5">
            <AlertCircle size={12} style={{ color: sev.dot }} />
            {event.event_type}
          </h4>
          <p className="text-[10px] text-red-600/70 font-medium mt-0.5">Active since {event.start_depth}m</p>
        </div>
        <span className="text-[9px] font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded border border-red-200">
          INCIDENT
        </span>
      </div>
      <div className="pl-2">
        <div className="text-[9px] text-slate-700 leading-relaxed bg-white p-2 rounded-md border border-red-100 shadow-sm mt-1 whitespace-pre-line">
          <span className="font-bold text-red-800 block mb-1">AI Recommendation:</span>
          {mit}
        </div>
      </div>
    </div>
  );
}


function RiskPopup({ risk, wellId, onClose }: { risk: RiskPrediction; wellId: number; onClose: () => void }) {
  const [aiContent, setAiContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const gen = async () => {
      setLoading(true);
      try {
        const api = (await import("@/services/api")).default;
        const res = await api.post("/api/ml/risk-advice", { well_id: wellId, risk_type: risk.risk_type, depth: risk.depth_start, severity: risk.severity, evidence: risk.evidence, confidence: risk.confidence });
        setAiContent(res.data?.advice || res.data?.content || "No AI analysis available.");
      } catch {
        setAiContent(`Prescriptive Measures for ${risk.risk_type}:\n\n• Monitor ECD closely — keep below fracture gradient by ≥0.05 sg margin\n• Reduce ROP to allow formation stabilisation\n• Increase mud weight incrementally (0.01–0.02 sg steps)\n• Prepare LCM pill (20–40 ppb) as contingency\n• Run flow check every 30m in this interval\n\nSuggested Parameters:\n• WOB: Reduce by 20%\n• RPM: Maintain stable at 100–110\n• Flow Rate: Do not reduce below 1600 lpm`);
      }
      setLoading(false);
    };
    gen();
  }, [wellId, risk]);

  const sev = SEVERITY_COLORS[risk.severity] || SEVERITY_COLORS.Low;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[500px] max-h-[80vh] overflow-y-auto border border-gray-200" onClick={e => e.stopPropagation()}>
        <div className={cn("flex items-center justify-between p-4 border-b", sev.bg)}>
          <div>
            <div className="flex items-center gap-2"><AlertTriangle size={14} style={{ color: sev.dot }} /><h3 className={cn("text-sm font-bold", sev.text)}>{risk.risk_type}</h3><span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-semibold", sev.bg, sev.border, sev.text)}>{risk.severity}</span></div>
            <p className="text-xs text-gray-500 mt-0.5">{risk.depth_start}m – {risk.depth_end}m · {risk.confidence.toFixed(0)}% confidence{risk.formation && ` · ${risk.formation}`}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/50 text-gray-500"><X size={14} /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className={cn("p-3 rounded-xl border text-xs", sev.bg, sev.border)}>
            <p className="font-semibold text-gray-700 mb-1">Evidence</p>
            <p className={sev.text}>{risk.evidence}</p>
          </div>
          {risk.historical_frequency > 0 && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Database size={11} />{risk.historical_frequency} historical occurrences</p>}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5"><Shield size={12} className="text-blue-600" />AI Prescriptive Analysis</p>
            {loading ? (
              <div className="space-y-2">{[80, 60, 70, 50].map((w, i) => <div key={i} className="h-3 bg-gray-100 rounded animate-pulse" style={{ width: `${w}%` }} />)}</div>
            ) : (
              <div className="text-xs text-gray-700 leading-relaxed bg-blue-50 border border-blue-100 p-3 rounded-xl whitespace-pre-wrap">{aiContent}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function WellPicker({ wells, selected, onChange }: { wells: any[]; selected: Set<number>; onChange: (next: Set<number>) => void; }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) { if (next.size === 1) return; next.delete(id); } else { next.add(id); }
    onChange(next);
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-700 bg-white hover:bg-gray-50 transition-colors">
        <span className="truncate max-w-28">{selected.size === wells.length ? `All ${wells.length} wells` : `${selected.size}/${wells.length} wells`}</span>
        <ChevronDown size={11} className={cn("flex-shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="p-1.5 max-h-52 overflow-y-auto">
            {wells.map((w: any) => {
              const checked = selected.has(w.id);
              return (
                <button key={w.id} onClick={() => toggle(w.id)} className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg hover:bg-gray-50 text-left">
                  <div className={cn("w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center", checked ? "bg-blue-600 border-blue-600" : "border-gray-300")}>
                    {checked && <Check size={9} color="white" strokeWidth={3} />}
                  </div>
                  <div className="min-w-0"><p className="text-xs font-medium text-gray-800 truncate">{w.well_name}</p><p className="text-[9px] text-gray-400">{w.distance_km?.toFixed(1)}km · {w.well_status}</p></div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export function DrillingIntelligencePage() {
  const {
    activeWellId, setActiveWellId, isStreaming, telemetry, elapsed,
    risks, savedRisks, setRisks, setSavedRisks, persistRisks, startStream, stopStream,
    drillingOffsetRadiusKm: offsetRadiusKm, setDrillingOffsetRadiusKm: setOffsetRadiusKm,
    drillingSelectedOffsetIds: selectedOffsetIds, setDrillingSelectedOffsetIds: setSelectedOffsetIds,
  } = useSimulationStore();
  const [viewMode, setViewMode] = useState<"curtain" | "timeline">("curtain");
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<RiskPrediction | null>(null);
  const lastRiskFetch = useRef<number>(0);

  // ── Queries ──
  const { data: drillingWells } = useQuery({ queryKey: ["drilling-wells"], queryFn: wellsService.listDrilling, staleTime: 60_000 });

  useEffect(() => {
    if (!activeWellId && drillingWells?.length) setActiveWellId(drillingWells[0].id);
  }, [drillingWells, activeWellId, setActiveWellId]);

  const { data: wellDetail } = useQuery({ queryKey: ["well-detail-sim", activeWellId], queryFn: () => activeWellId ? wellsService.getDetail(activeWellId) : null, enabled: !!activeWellId, staleTime: 30_000 });
  const { data: formations } = useQuery({ queryKey: ["well-formations", activeWellId], queryFn: () => activeWellId ? wellsService.getFormations(activeWellId) : [], enabled: !!activeWellId, staleTime: 300_000 });

  const { data: offsetWells } = useQuery({
    queryKey: ["offset-wells-sim", activeWellId, offsetRadiusKm],
    queryFn: () => activeWellId ? wellsService.getOffsetWells(activeWellId, offsetRadiusKm) : [],
    enabled: !!activeWellId, staleTime: 120_000,
  });

  useEffect(() => {
    if (offsetWells?.length) {
      setSelectedOffsetIds(new Set(offsetWells.slice(0, 5).map((w: any) => w.id)));
    }
  }, [offsetWells]);

  const offsetWellIds = (offsetWells ?? []).map((w: any) => w.id).join(",");
  const { data: offsetEvents } = useQuery({
    queryKey: ["offset-events", offsetWellIds],
    queryFn: async () => {
      if (!offsetWells?.length) return {};
      const results = await Promise.all(offsetWells.map(async (ow: any) => ({ wellId: ow.id, events: await wellsService.getEvents(ow.id, { limit: 20 }) })));
      return Object.fromEntries(results.map(r => [r.wellId, r.events]));
    },
    enabled: !!offsetWells?.length, staleTime: 300_000,
  });

  const { data: offsetFormationsMap } = useQuery({
    queryKey: ["offset-formations", offsetWellIds],
    queryFn: async () => {
      if (!offsetWells?.length) return {};
      const results = await Promise.all(offsetWells.map(async (ow: any) => ({ wellId: ow.id, formations: await wellsService.getFormations(ow.id) })));
      return Object.fromEntries(results.map(r => [r.wellId, r.formations]));
    },
    enabled: !!offsetWells?.length, staleTime: 300_000,
  });

  useQuery({
    queryKey: ["saved-risks", activeWellId],
    queryFn: async () => { if (!activeWellId) return []; const data = await liveService.getSavedRisks(activeWellId); setSavedRisks(data); return data; },
    enabled: !!activeWellId, staleTime: 60_000,
  });

  const [confirmedSimEvents, setConfirmedSimEvents] = useState<any[]>([]);

  const filteredOffsetWells = useMemo(() => (offsetWells ?? []).filter((w: any) => selectedOffsetIds.has(w.id)), [offsetWells, selectedOffsetIds]);
  const offsetWellsWithData = useMemo(() => filteredOffsetWells.map((ow: any) => ({
    well: ow,
    events: (offsetEvents?.[ow.id] ?? []) as any[],
    formations: (offsetFormationsMap?.[ow.id] ?? []) as any[],
  })), [filteredOffsetWells, offsetEvents, offsetFormationsMap]);
  
  const allOffsetWellsWithData = useMemo(() => (offsetWells ?? []).map((ow: any) => ({
    well: ow,
    events: (offsetEvents?.[ow.id] ?? []) as any[],
    formations: (offsetFormationsMap?.[ow.id] ?? []) as any[],
  })), [offsetWells, offsetEvents, offsetFormationsMap]);

  useEffect(() => {
    if (!isStreaming || !activeWellId || !telemetry) return;
    
    // 1. Check for confirmed events
    const currentDepth = telemetry.current_depth;
    const newlyConfirmed = risks.filter(r => currentDepth >= r.depth_start && r.confidence >= 70 && !r.is_confirmed);
    
    if (newlyConfirmed.length > 0) {
       setConfirmedSimEvents(prev => {
          let updated = [...prev];
          newlyConfirmed.forEach(r => {
             const existingIdx = updated.findIndex(e => e.event_type === r.risk_type && (r.depth_start - e.end_depth) < 50);
             if (existingIdx >= 0) {
                updated[existingIdx] = {
                   ...updated[existingIdx],
                   end_depth: Math.max(updated[existingIdx].end_depth, r.depth_end),
                };
             } else {
                const newEventId = Math.random() * 1000000;
                updated.push({
                   id: newEventId,
                   event_type: r.risk_type,
                   severity: r.severity,
                   start_depth: r.depth_start,
                   end_depth: r.depth_end,
                   description: `Simulated event based on predicted high-confidence risk (${r.confidence}%).`,
                   mitigations: [{ description: "Analyzing data for actionable parameters..." }],
                   lessons: [],
                   is_simulated: true,
                   well_id: activeWellId
                });
                
                import("@/services/api").then(api => {
                   api.default.post("/api/ml/risk-advice", { 
                       well_id: activeWellId, risk_type: r.risk_type, depth: r.depth_start, formation: r.formation 
                   }).then(res => {
                       setConfirmedSimEvents(current => {
                           const idx = current.findIndex(e => e.id === newEventId);
                           if (idx === -1) return current;
                           const text = res.data?.advice || res.data?.content || "No advice available.";
                           const newList = [...current];
                           newList[idx] = { ...newList[idx], mitigations: [{ description: text }] };
                           return newList;
                       });
                   }).catch(e => console.error(e));
                });
             }
          });
          return updated;
       });
       setRisks(risks.map(r => newlyConfirmed.includes(r) ? { ...r, is_confirmed: true } : r));
    }

    // 2. Generate new risks periodically
    const now = Date.now();
    if (now - lastRiskFetch.current < 5000) return;
    lastRiskFetch.current = now;

    const offsetEvs = allOffsetWellsWithData.flatMap(w => w.events);
    const newRisks: RiskPrediction[] = [];

    // Check events in the next 200m
    const eventsInWindow = offsetEvs.filter(e => e.start_depth > currentDepth && e.start_depth <= currentDepth + 200);
    
    // Group by event type
    const grouped: Record<string, { count: number, total_depth: number }> = {};
    eventsInWindow.forEach(e => {
       if (!grouped[e.event_type]) grouped[e.event_type] = { count: 0, total_depth: 0 };
       grouped[e.event_type].count += 1;
       grouped[e.event_type].total_depth += e.start_depth;
    });

    const ecdBoost = Math.max(0, (telemetry.ecd - 1.5) * 40);
    const torqueBoost = Math.max(0, (telemetry.torque - 12) * 4);
    const gasBoost = Math.max(0, (telemetry.gas_units - 30) * 1.5);
    const pitBoost = Math.max(0, (285 - telemetry.pit_volume) * 2.0);

    Object.entries(grouped).forEach(([type, data]) => {
       const avgDepth = Math.round(data.total_depth / data.count);
       // Base confidence starts at 35 and scales with occurrences, so even 1 occurrence is tracked
       const baseConf = Math.min(65, 35 + (data.count * 15)); 
       
       let typeBoost = 0;
       if (type === "Stuck Pipe" || type === "Pack Off" || type === "Tight hole") typeBoost = torqueBoost + ecdBoost;
       else if (type === "Kick" || type === "Blowout") typeBoost = pitBoost + gasBoost;
       else if (type === "Wellbore Instability" || type === "Lost Circulation") typeBoost = ecdBoost * 1.5;
       else typeBoost = (ecdBoost + torqueBoost + gasBoost + pitBoost) * 0.3;

       const distanceAhead = Math.max(1, avgDepth - currentDepth);
       const distanceDecay = Math.max(0.5, 1 - (distanceAhead / 300)); // less aggressive decay

       const confidence = Math.min(96, (baseConf + typeBoost) * distanceDecay);
       
       if (confidence > 15) {
         const targetFmt = getFormationAtDepth(formations || [], avgDepth);
         newRisks.push({
           risk_type: type,
           depth_start: avgDepth,
           depth_end: avgDepth + 20,
           window: `+${Math.max(1, avgDepth - Math.round(currentDepth))}m ahead`,
           confidence: Math.round(confidence),
           severity: confidence > 80 ? "Critical" : confidence > 60 ? "High" : confidence > 40 ? "Moderate" : "Low",
           formation: targetFmt?.formation_name || targetFmt?.name || telemetry.current_formation,
           evidence: `${data.count} of ${allOffsetWellsWithData.length} total offset wells in radius had this problem here`,
           historical_frequency: data.count,
           is_saved: false,
         });
       }
    });

    setRisks(newRisks.sort((a, b) => b.confidence - a.confidence).slice(0, 5));
  }, [telemetry?.current_depth, isStreaming, activeWellId, allOffsetWellsWithData, formations]);

  const formatElapsed = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const currentDepth = telemetry?.current_depth ?? wellDetail?.current_depth ?? 0;
  const totalDepth = Math.max(wellDetail?.total_depth || wellDetail?.planned_depth || 4000, 1);
  const fmts = formations ?? [];

  const allRisks = [...risks, ...savedRisks.filter(sr => !risks.some(r => r.depth_start === sr.depth_start && r.risk_type === sr.risk_type))];

  // ── Unified Row Generation ──
  const rawDepths = new Set<number>();
  rawDepths.add(0);
  rawDepths.add(Math.round(totalDepth));
  rawDepths.add(Math.round(currentDepth));
  
  for (let d = 250; d < totalDepth; d += 250) rawDepths.add(d);

  fmts.forEach((f: any) => rawDepths.add(Math.round(f.top_depth || 0)));
  offsetWellsWithData.forEach((ow: any) => ow.formations.forEach((f: any) => rawDepths.add(Math.round(f.top_depth || 0))));
  offsetWellsWithData.forEach((ow: any) => ow.events.forEach((e: any) => rawDepths.add(Math.round(e.start_depth || 0))));

  const sortedRaw = Array.from(rawDepths).sort((a, b) => a - b);
  const rowDepths: number[] = [];
  for (const d of sortedRaw) {
    if (rowDepths.length === 0) {
      rowDepths.push(d);
    } else {
      const last = rowDepths[rowDepths.length - 1];
      if (d !== last) rowDepths.push(d);
    }
  }

  const rows = rowDepths.map(rd => ({
    depth: rd,
    hasBitMarker: false,
    offsetEvents: {} as Record<number, any[]>
  }));

  const bitRowDepth = getRowDepth(rowDepths, currentDepth);
  const bitRow = rows.find(r => r.depth === bitRowDepth);
  if (bitRow) bitRow.hasBitMarker = true;

  offsetWellsWithData.forEach((ow: any) => {
    ow.events.forEach((ev: any) => {
      const rd = getRowDepth(rowDepths, ev.start_depth || 0);
      const row = rows.find(r => r.depth === rd);
      if (row) {
        if (!row.offsetEvents[ow.well.id]) row.offsetEvents[ow.well.id] = [];
        row.offsetEvents[ow.well.id].push(ev);
      }
    });
  });

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 bg-white flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Radio size={20} className="text-blue-600" />
              Live Risk Monitor
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap ml-auto">
          <select value={activeWellId ?? ""} onChange={(e) => { stopStream(); setActiveWellId(e.target.value ? parseInt(e.target.value) : null); }} className="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 text-gray-700 min-w-52 bg-white">
            <option value="">Select a drilling well…</option>
            {(drillingWells ?? []).map((w: any) => <option key={w.id} value={w.id}>{w.well_name} — {w.field_name}</option>)}
          </select>
          {!isStreaming ? (
            <button onClick={() => activeWellId && startStream(activeWellId)} disabled={!activeWellId} className={cn("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors", activeWellId ? "bg-green-600 text-white hover:bg-green-700 shadow-sm" : "bg-gray-100 text-gray-400 cursor-not-allowed")}>
              <PlayCircle size={15} />Start Simulation
            </button>
          ) : (
            <button onClick={stopStream} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors shadow-sm">
              <StopCircle size={15} />Stop
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

      {!activeWellId ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center"><Drill size={48} className="text-gray-200 mx-auto mb-4" /><h2 className="text-base font-semibold text-gray-700 mb-1">No Drilling Well Selected</h2><p className="text-sm text-gray-400">Select a drilling well above to begin analysis.</p></div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {telemetry?.alerts && telemetry.alerts.length > 0 && (
            <div className="px-5 py-2 bg-red-50 border-b border-red-200 flex-shrink-0">
              <div className="flex items-center gap-2 flex-wrap"><AlertCircle size={13} className="text-red-600 flex-shrink-0" />{telemetry.alerts.slice(0, 3).map((a, i) => <span key={i} className={cn("text-xs px-2 py-0.5 rounded-full border", a.type === "critical" ? "bg-red-100 border-red-300 text-red-700" : "bg-amber-100 border-amber-300 text-amber-700")}>{a.message}</span>)}</div>
            </div>
          )}

          {/* ── Sub-header toolbar ─────────────────────────────── */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 bg-white flex-shrink-0">
            <button onClick={() => document.getElementById("current-depth-marker")?.scrollIntoView({ behavior: "smooth", block: "center" })} className="font-bold text-gray-900 text-sm hover:text-blue-600 hover:underline transition-colors cursor-pointer text-left focus:outline-none">{currentDepth.toFixed(0)}m</button>
            <span className="text-xs text-gray-500">/ {totalDepth.toFixed(0)}m TD</span>

            <div className="ml-auto flex items-center gap-2">
              {(offsetWells ?? []).length > 0 && (
                <WellPicker
                  wells={offsetWells ?? []}
                  selected={selectedOffsetIds}
                  onChange={setSelectedOffsetIds}
                />
              )}

              <div className="flex items-center gap-1.5 ml-2">
                <SlidersHorizontal size={11} className="text-gray-400 flex-shrink-0" />
                <span className="text-[10px] text-gray-500 whitespace-nowrap">Radius:</span>
                <input
                  type="range" min={1} max={30}
                  value={offsetRadiusKm}
                  onChange={e => setOffsetRadiusKm(Math.min(30, Math.max(1, Number(e.target.value) || 1)))}
                  className="w-32 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={offsetRadiusKm}
                  onChange={e => setOffsetRadiusKm(Math.min(30, Math.max(1, Number(e.target.value) || 1)))}
                  className="w-12 px-1 py-0.5 text-[10px] border border-gray-200 rounded-md text-center"
                />
                <span className="text-[10px] text-gray-500">km</span>
              </div>

              <div className="flex items-center p-0.5 bg-gray-100 rounded-lg border border-gray-200 ml-2 shadow-inner">
                <button onClick={() => setViewMode("curtain")} title="Curtain view" className={cn("px-2 py-1.5 rounded-md text-xs font-medium transition-colors", viewMode === "curtain" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900")}><Columns2 size={13} /></button>
                <button onClick={() => setViewMode("timeline")} title="Timeline view" className={cn("px-2 py-1.5 rounded-md text-xs font-medium transition-colors", viewMode === "timeline" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900")}><AlignJustify size={13} /></button>
              </div>
            </div>
          </div>

          {/* ── Curtain / Timeline Table View ─────────────────── */}
          {/* A strictly sequential topological layout. Rows are pushed open naturally by chips,
              so no absolute positioning trickery or manual overlapping logic is needed. */}
          <div className="flex-1 bg-white p-4 flex gap-4 overflow-hidden">
            <div className="bg-white border border-gray-200 shadow-sm rounded-xl overflow-auto flex-1 relative">
              <table className="w-full table-fixed border-collapse">
                <thead className="sticky top-0 z-40 shadow-sm bg-white ring-1 ring-gray-200">
                  <tr>
                    <th className="w-16 min-w-16 bg-gray-50 border-r border-gray-200 p-0"></th>
                    
                    {/* Target Well Header */}
                    <th className="border-r border-gray-200 p-0 align-bottom bg-white" style={viewMode === "timeline" ? { width: "50%" } : undefined}>
                      <div className="h-9 px-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                          <span className="text-[10px] font-bold text-gray-800 truncate">{wellDetail?.well_name ?? "Target Well"}</span>
                          <span className="text-[9px] text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full flex-shrink-0">ACTIVE</span>
                        </div>
                      </div>
                    </th>

                    {/* Offset Headers (Curtain) */}
                    {viewMode === "curtain" && offsetWellsWithData.map((ow: any) => (
                      <th key={ow.well.id} className="border-r border-gray-200 p-0 align-bottom bg-white">
                        <div className="h-9 px-3 flex flex-col justify-center items-start">
                          <p className="text-[10px] font-bold text-gray-800 truncate leading-tight">{ow.well.well_name}</p>
                          <p className="text-[8px] text-gray-400 font-normal leading-tight">{ow.well.distance_km?.toFixed(1)}km · {ow.well.well_status}</p>
                        </div>
                      </th>
                    ))}

                    {/* Merged Offset Header (Timeline) */}
                    {viewMode === "timeline" && (
                      <th className="border-r border-gray-200 p-0 align-bottom bg-white w-1/2">
                        <div className="h-9 px-3 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-gray-700">All Offset Incidents</span>
                          <span className="text-[9px] text-gray-400 font-normal">{offsetWellsWithData.flatMap((o: any) => o.events).length} events</span>
                        </div>
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => {
                    const targetFmt = getFormationAtDepth(fmts, row.depth);
                    const targetColor = getFormationColor(targetFmt?.formation_name || targetFmt?.name);
                    const isTargetFmtTop = targetFmt && getRowDepth(rowDepths, targetFmt.top_depth || 0) === row.depth;

                    return (
                      <tr key={row.depth} className="border-b border-white/40">
                        {/* Ruler Cell */}
                        <td className="w-16 min-w-16 bg-gray-50 border-r border-gray-200 p-2 pr-1 align-top relative">
                          {row.hasBitMarker ? (
                            <div id="current-depth-marker" className="absolute top-[13px] right-[-4px] -translate-y-1/2 scroll-mt-32 z-30">
                              <div className="bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 whitespace-nowrap">
                                <Drill size={9} />
                                {row.depth}m
                              </div>
                            </div>
                          ) : (
                            <div className="text-[9px] text-gray-500 font-medium tabular-nums text-right pt-[3px]">{row.depth}m</div>
                          )}
                        </td>

                        {/* Target Well Cell (Cleaned Up) */}
                        <td className="relative align-top border-r border-white/30 p-2 pb-4 min-h-[48px]" style={{ backgroundColor: targetColor + "bb" }}>
                          {row.hasBitMarker && <div className="absolute top-[13px] left-0 right-0 border-t-[2px] border-dashed border-orange-500 z-10" />}
                          
                          {isTargetFmtTop && (
                            <div className="text-[10px] font-bold text-gray-800 mb-2 opacity-70 uppercase tracking-wider relative z-10">
                              {targetFmt.formation_name || targetFmt.name}
                            </div>
                          )}
                        </td>

                        {/* Offset Wells Cells (Curtain Mode) */}
                        {viewMode === "curtain" && offsetWellsWithData.map((ow: any) => {
                          const owFmt = getFormationAtDepth(ow.formations, row.depth);
                          const owColor = getFormationColor(owFmt?.formation_name || owFmt?.name);
                          const isOwFmtTop = owFmt && getRowDepth(rowDepths, owFmt.top_depth || 0) === row.depth;
                          const events = row.offsetEvents[ow.well.id] || [];

                          return (
                            <td key={ow.well.id} className="relative align-top border-r border-white/30 p-2 pb-4" style={{ backgroundColor: owColor + "bb" }}>
                              {row.hasBitMarker && <div className="absolute top-[13px] left-0 right-0 border-t-[2px] border-dashed border-orange-500/50 z-10" />}
                              
                              {isOwFmtTop && (
                                <div className="text-[9px] font-bold text-gray-800 mb-2 opacity-50 uppercase tracking-wider relative z-10">
                                  {owFmt.formation_name || owFmt.name}
                                </div>
                              )}
                              
                              <div className="flex flex-col items-end gap-1.5 relative z-20">
                                {events.map((ev, idx) => <EventChip key={idx} event={ev} onClick={() => setSelectedEvent({...ev, well_name: ow.well.well_name, distance_km: ow.well.distance_km})} />)}
                              </div>
                            </td>
                          );
                        })}

                        {/* Merged Offset Cell (Timeline Mode) */}
                        {viewMode === "timeline" && (
                          <td className="relative align-top border-r border-gray-200 p-2 pb-4 bg-white">
                            {row.hasBitMarker && <div className="absolute top-[13px] left-0 right-0 border-t-[2px] border-dashed border-orange-500/50 z-10" />}
                            
                            <div className="flex flex-col items-end gap-1.5 relative z-20">
                              {offsetWellsWithData.flatMap((ow: any) => 
                                (row.offsetEvents[ow.well.id] || []).map((ev: any) => ({...ev, well_name: ow.well.well_name, distance_km: ow.well.distance_km}))
                              ).map((ev: any, idx: number) => (
                                <EventChip key={idx} event={ev} onClick={() => setSelectedEvent(ev)} />
                              ))}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Right Sidebar ── */}
            <div className="w-80 flex-shrink-0 bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-0 flex flex-col bg-white">
                {/* Incidents Header */}
                {confirmedSimEvents.length > 0 && (
                  <>
                    <div className="sticky top-0 bg-red-50/95 backdrop-blur px-3 py-2 border-b border-red-100 z-10 text-[10px] font-bold text-red-800 uppercase tracking-wider flex items-center justify-between shadow-sm">
                      <span className="flex items-center gap-1.5"><AlertCircle size={12} /> Active Incidents</span>
                      <span className="bg-red-200 px-1.5 py-0.5 rounded text-red-900">{confirmedSimEvents.length}</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {[...confirmedSimEvents].reverse().map((ev, i) => <EventSidebarItem key={ev.id || i} event={ev} onClick={() => setSelectedEvent(ev)} />)}
                    </div>
                  </>
                )}

                {/* Risks Header */}
                <div className="sticky top-0 bg-white/95 backdrop-blur px-3 py-2 border-b border-gray-100 z-10 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between shadow-sm" style={{ borderTopWidth: confirmedSimEvents.length > 0 ? '1px' : '0' }}>
                  <span className="flex items-center gap-1.5"><Shield size={12} /> Predicted Risks (Next 200m)</span>
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{risks.length}</span>
                </div>
                <div className="divide-y divide-gray-100 flex-1">
                  {risks.length === 0 ? (
                    <div className="p-8 text-center flex flex-col items-center justify-center h-full text-gray-400">
                      <Shield size={32} className="text-gray-200 mb-3" />
                      <p className="text-xs font-medium">No imminent risks detected.</p>
                      <p className="text-[10px] mt-1 text-gray-400 max-w-[200px]">The trajectory ahead looks clear based on historical offset data.</p>
                    </div>
                  ) : (
                    risks.map((r, i) => <RiskSidebarItem key={i} risk={r} onClick={() => setSelectedRisk(r)} />)
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* ── Telemetry Strip ───────────────────────────────── */}
          {isStreaming && telemetry && (
            <div className="border-t border-gray-200 bg-white flex-shrink-0">
              <div className="flex items-center gap-2 px-4 py-1.5 border-b border-gray-100">
                <Radio size={11} className="text-green-600" />
                <span className="text-[10px] font-semibold text-gray-700 uppercase tracking-wide">Live Telemetry</span>
                <span className="text-[9px] text-gray-400 ml-1">{telemetry.current_formation} · PP {telemetry.pore_pressure_gg?.toFixed(2)}sg · FG {telemetry.frac_gradient_gg?.toFixed(2)}sg</span>
              </div>
              <div className="overflow-x-auto">
                <div className="flex gap-2 px-4 py-2 min-w-max">
                  <GaugeCard label="ROP" value={telemetry.rop} unit="m/h" min={0} max={25} warningPct={0.85} criticalPct={0.95} icon={TrendingUp} color="#2563eb" />
                  <GaugeCard label="WOB" value={telemetry.wob} unit="T" min={0} max={35} warningPct={0.80} criticalPct={0.92} icon={Activity} color="#059669" />
                  <GaugeCard label="RPM" value={telemetry.rpm} unit="rpm" min={0} max={200} warningPct={0.80} criticalPct={0.90} icon={RotateCcw} color="#7c3aed" />
                  <GaugeCard label="Torque" value={telemetry.torque} unit="kNm" min={0} max={25} warningPct={0.72} criticalPct={0.85} icon={Zap} color="#d97706" />
                  <GaugeCard label="ECD" value={telemetry.ecd} unit="sg" min={1.0} max={2.0} warningPct={0.75} criticalPct={0.90} icon={Gauge} color="#ea580c" />
                  <GaugeCard label="Mud Wt" value={telemetry.mud_weight} unit="sg" min={1.0} max={2.0} warningPct={0.70} criticalPct={0.88} icon={Droplets} color="#0891b2" />
                  <GaugeCard label="SPP" value={telemetry.standpipe_pressure} unit="bar" min={0} max={400} warningPct={0.80} criticalPct={0.92} icon={Activity} color="#4f46e5" />
                  <GaugeCard label="Pit Vol" value={telemetry.pit_volume} unit="m³" min={200} max={350} warningPct={0.30} criticalPct={0.15} icon={Droplets} color="#059669" />
                  <GaugeCard label="Gas" value={telemetry.gas_units} unit="gu" min={0} max={200} warningPct={0.40} criticalPct={0.65} icon={Activity} color="#b45309" />
                  <GaugeCard label="Temp" value={telemetry.temp_out} unit="°C" min={30} max={150} warningPct={0.70} criticalPct={0.88} icon={Thermometer} color="#dc2626" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
      {selectedRisk && activeWellId && <RiskPopup risk={selectedRisk} wellId={activeWellId} onClose={() => setSelectedRisk(null)} />}
    </div>
  );
}
