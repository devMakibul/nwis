/**
 * Global Simulation Store — persists across all page navigations.
 * Holds WebSocket reference, active well, telemetry state, and depth history.
 */
import { create } from "zustand";
import api from "@/services/api";

export interface TelemetryState {
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

export interface RiskPrediction {
  id?: number;
  risk_type: string;
  depth_start: number;
  depth_end: number;
  window?: string;
  confidence: number;
  severity: string;
  formation?: string;
  evidence: string;
  historical_frequency: number;
  generated_time?: string;
  is_saved?: boolean;
}

interface SimulationStore {
  // Well selection
  activeWellId: number | null;
  setActiveWellId: (id: number | null) => void;

  // Simulation state
  isStreaming: boolean;
  telemetry: TelemetryState | null;
  depthHistory: number[];         // Last 60 depth readings
  elapsed: number;                // Seconds since sim started

  // Risk predictions
  risks: RiskPrediction[];
  savedRisks: RiskPrediction[];   // Fetched from DB
  setRisks: (risks: RiskPrediction[]) => void;
  setSavedRisks: (risks: RiskPrediction[]) => void;
  persistRisks: (wellId: number, risks: RiskPrediction[]) => Promise<void>;

  // Persistent UI State for Drilling Intelligence
  drillingOffsetRadiusKm: number;
  setDrillingOffsetRadiusKm: (radius: number) => void;
  drillingSelectedOffsetIds: Set<number>;
  setDrillingSelectedOffsetIds: (ids: Set<number>) => void;

  // WebSocket
  wsRef: WebSocket | null;

  // Actions
  startStream: (wellId: number) => Promise<void>;
  stopStream: () => void;
  updateWellDepthInDB: (wellId: number, depth: number) => Promise<void>;
  markWellCompleted: (wellId: number) => Promise<void>;

  // Timer
  _timerInterval: ReturnType<typeof setInterval> | null;
  _dbSyncInterval: ReturnType<typeof setInterval> | null;
}

export const useSimulationStore = create<SimulationStore>((set, get) => ({
  activeWellId: null,
  isStreaming: false,
  telemetry: null,
  depthHistory: [],
  elapsed: 0,
  risks: [],
  savedRisks: [],
  wsRef: null,
  _timerInterval: null,
  _dbSyncInterval: null,

  setActiveWellId: (id) => {
    get().stopStream();
    set({ activeWellId: id, telemetry: null, depthHistory: [], risks: [], savedRisks: [] });
  },

  setRisks: (risks) => set({ risks }),
  setSavedRisks: (risks) => set({ savedRisks: risks }),

  drillingOffsetRadiusKm: 15,
  setDrillingOffsetRadiusKm: (radius) => set({ drillingOffsetRadiusKm: radius }),
  drillingSelectedOffsetIds: new Set(),
  setDrillingSelectedOffsetIds: (ids) => set({ drillingSelectedOffsetIds: ids }),

  persistRisks: async (wellId, risks) => {
    if (!risks.length) return;
    try {
      await api.post(`/api/live/risks/${wellId}/persist`, risks);
      // Mark them as saved locally
      set({ risks: get().risks.map(r => ({ ...r, is_saved: true })) });
    } catch (e) {
      console.error("Failed to persist risks", e);
    }
  },

  updateWellDepthInDB: async (wellId, depth) => {
    try {
      await api.patch(`/api/wells/${wellId}/sim-update`, null, {
        params: { current_depth: depth },
      });
    } catch (e) {
      console.error("Failed to update well depth", e);
    }
  },

  markWellCompleted: async (wellId) => {
    try {
      await api.patch(`/api/wells/${wellId}/sim-update`, null, {
        params: { well_status: "Completed" },
      });
    } catch (e) {
      console.error("Failed to mark well completed", e);
    }
  },

  startStream: async (wellId) => {
    const state = get();
    if (state.isStreaming) return;

    // Initialize simulator via REST (starts from well's current DB depth)
    await api.post(`/api/live/sim/${wellId}/start`, null, {
      params: { mode: "Auto" },
    });

    const wsUrl = `ws://localhost:8000/ws/telemetry/${wellId}`;
    const ws = new WebSocket(wsUrl);

    // Start elapsed timer
    set({ elapsed: 0 });
    const timer = setInterval(() => set(s => ({ elapsed: s.elapsed + 1 })), 1000);

    // Start periodic DB depth sync every 15s
    const dbSync = setInterval(() => {
      const { telemetry, activeWellId } = get();
      if (telemetry && activeWellId) {
        get().updateWellDepthInDB(activeWellId, telemetry.current_depth);
      }
    }, 15_000);

    ws.onopen = () => {
      set({ isStreaming: true, depthHistory: [], wsRef: ws, _timerInterval: timer, _dbSyncInterval: dbSync });
    };

    ws.onmessage = (event) => {
      try {
        const data: TelemetryState = JSON.parse(event.data);
        set(s => ({
          telemetry: data,
          depthHistory: [...s.depthHistory.slice(-60), data.current_depth],
        }));

        // Check if well reached target depth
        if (data.current_depth >= data.total_depth) {
          get().markWellCompleted(wellId);
          get().stopStream();
        }
      } catch { /* noop */ }
    };

    ws.onclose = () => {
      set({ isStreaming: false });
      clearInterval(get()._timerInterval ?? undefined);
      clearInterval(get()._dbSyncInterval ?? undefined);
    };

    ws.onerror = () => {
      set({ isStreaming: false });
    };
  },

  stopStream: () => {
    const { wsRef, _timerInterval, _dbSyncInterval, activeWellId, telemetry } = get();
    if (wsRef) {
      try { wsRef.send(JSON.stringify({ command: "stop" })); } catch { /* noop */ }
      wsRef.close();
    }
    if (_timerInterval) clearInterval(_timerInterval);
    if (_dbSyncInterval) clearInterval(_dbSyncInterval);
    // Final DB sync on stop
    if (activeWellId && telemetry) {
      get().updateWellDepthInDB(activeWellId, telemetry.current_depth);
    }
    set({ isStreaming: false, wsRef: null, _timerInterval: null, _dbSyncInterval: null });
  },
}));
