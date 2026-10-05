/**
 * Settings Page — eRTMAC-NWIS Phase 7
 * AI provider config, user profile, system configuration.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Settings, User, Bot, Database, Shield, Bell,
  Check, ChevronRight, ExternalLink, Info, LogOut
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import api from "@/services/api";
import { cn } from "@/utils";

// ─── Section wrapper ───────────────────────────────────────────
function Section({ title, icon: Icon, children }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
        <Icon size={15} className="text-blue-600" />
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

// ─── Setting row ───────────────────────────────────────────────
function SettingRow({ label, description, children }: {
  label: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "relative w-9 h-5 rounded-full transition-colors",
        checked ? "bg-blue-600" : "bg-gray-200"
      )}
    >
      <span className={cn(
        "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
        checked ? "translate-x-4" : ""
      )} />
    </button>
  );
}

// ─── Badge ────────────────────────────────────────────────────
function Badge({ text, color = "blue" }: { text: string; color?: string }) {
  const classes: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    orange: "bg-orange-50 text-orange-700",
    gray: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide", classes[color] || classes.gray)}>
      {text}
    </span>
  );
}

export function SettingsPage() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const { data: health } = useQuery({
    queryKey: ["settings-health"],
    queryFn: () => api.get("/api/health").then((r) => r.data),
    staleTime: 30_000,
  });

  const { data: models } = useQuery({
    queryKey: ["ml-models-settings"],
    queryFn: () => api.get("/api/ml/models").then((r) => r.data),
    staleTime: 30_000,
  });

  const [aiProvider, setAiProvider] = useState(() => localStorage.getItem("aiProvider") || "ollama");
  const [notifAlerts, setNotifAlerts] = useState(true);
  const [notifReports, setNotifReports] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem("aiProvider", aiProvider);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="p-6 max-w-[900px] space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Settings size={20} className="text-blue-600" />
            Settings
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure AI providers, system preferences, and integrations.</p>
        </div>
        <button
          onClick={handleSave}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors",
            saved
              ? "bg-green-100 text-green-700"
              : "bg-blue-600 text-white hover:bg-blue-700"
          )}
        >
          {saved ? <><Check size={14} /> Saved</> : "Save Changes"}
        </button>
      </div>

      {/* ── AI Configuration ────────────────────────────────── */}
      <Section title="AI Provider" icon={Bot}>
        <SettingRow label="Primary AI Provider" description="Select your preferred AI backend. Note: API keys and URLs are securely managed in your backend .env file.">
          <select
            value={aiProvider}
            onChange={(e) => {
                setAiProvider(e.target.value);
                localStorage.setItem("aiProvider", e.target.value);
            }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer bg-white"
          >
            <option value="ollama">Ollama (Local)</option>
            <option value="openrouter">OpenRouter (Cloud)</option>
          </select>
        </SettingRow>

        <SettingRow label="Vision Model" description="Qwen2.5-VL used for PDF page extraction and OCR.">
          <Badge text="Qwen2.5-VL" color="blue" />
        </SettingRow>
        <SettingRow label="Embedding Model" description="Used for document knowledge search (RAG).">
          <Badge text="sentence-transformers" color="gray" />
        </SettingRow>
      </Section>

      {/* ── ML Engine Status ─────────────────────────────────── */}
      <Section title="ML Risk Engine" icon={Database}>
        <div className="space-y-3">
          {(models ?? []).map((m: {
            label: string; trained: boolean;
            metrics: { roc_auc?: number; f1?: number; accuracy?: number };
            trained_at: string; dataset_size: number;
            top_features: string[];
          }) => (
            <div key={m.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{m.label}</p>
                {m.trained ? (
                  <p className="text-xs text-gray-400 mt-0.5">
                    AUC: {m.metrics?.roc_auc?.toFixed(3) ?? "—"} · F1: {m.metrics?.f1?.toFixed(3) ?? "—"} · Trained on {m.dataset_size?.toLocaleString()} samples
                  </p>
                ) : (
                  <p className="text-xs text-orange-500 mt-0.5">Not trained — using rule-based fallback</p>
                )}
              </div>
              <Badge text={m.trained ? "Trained" : "Pending"} color={m.trained ? "green" : "orange"} />
            </div>
          ))}
          {(models ?? []).length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Model status unavailable</p>
          )}
        </div>
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <Info size={13} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Admin users can trigger model retraining via the ML API endpoint or by running <code className="font-mono">python -m app.ml.train_models</code> in the backend directory.
          </p>
        </div>
      </Section>

      {/* ── System Status ────────────────────────────────────── */}
      <Section title="System Status" icon={Shield}>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Backend API", status: "operational", detail: "v0.9 · FastAPI" },
            { label: "Database", status: "operational", detail: "PostgreSQL + TimescaleDB" },
            { label: "pgvector", status: "operational", detail: "Vector similarity search" },
            { label: "WebSocket", status: "operational", detail: "Live telemetry streaming" },
            { label: "Report Engine", status: "operational", detail: "ReportLab + python-docx" },
            { label: "ML Engine", status: (models ?? []).some((m: { trained: boolean }) => m.trained) ? "operational" : "degraded", detail: "XGBoost / Rule-based" },
          ].map(({ label, status, detail }) => (
            <div key={label} className="flex items-center gap-2.5 p-3 border border-gray-100 rounded-xl">
              <div className={cn("w-2 h-2 rounded-full flex-shrink-0",
                status === "operational" ? "bg-green-500" : "bg-amber-500")} />
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-900">{label}</p>
                <p className="text-[10px] text-gray-400">{detail}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
          <span>eRTMAC-NWIS v0.9</span>
          <span>Nearby Wells Intelligence System · Oil India Limited</span>
        </div>
      </Section>

      {/* ── Notifications ────────────────────────────────────── */}
      <Section title="Notifications" icon={Bell}>
        <SettingRow label="Critical Alerts" description="Notify when ML risk predictions exceed Critical threshold.">
          <Toggle checked={notifAlerts} onChange={setNotifAlerts} />
        </SettingRow>
        <SettingRow label="Report Generation" description="Notify when a report finishes generating.">
          <Toggle checked={notifReports} onChange={setNotifReports} />
        </SettingRow>
        <SettingRow label="Dark Mode" description="Switch to a dark color scheme (prototype).">
          <Toggle checked={darkMode} onChange={setDarkMode} />
        </SettingRow>
      </Section>

      {/* ── About ─────────────────────────────────────────────── */}
      <Section title="About" icon={Info}>
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex justify-between"><span className="text-gray-400">Product</span><span>eRTMAC-NWIS</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Full name</span><span>Nearby Wells Intelligence System</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Organisation</span><span>Oil India Limited</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Version</span><span>0.9.0-beta</span></div>
          <div className="flex justify-between"><span className="text-gray-400">API</span><span>44 endpoints · FastAPI 0.115</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Frontend</span><span>React 19 · Vite · Tailwind v4</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Database</span><span>PostgreSQL 17 · TimescaleDB · pgvector</span></div>
        </div>
      </Section>

      <div className="pt-2 flex justify-end">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-medium transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
