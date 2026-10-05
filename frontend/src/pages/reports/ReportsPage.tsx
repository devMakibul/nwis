/**
 * Report Generator Page
 * Select report type, well/field, generate PDF/DOCX, download.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText, Download, Trash2, Plus, FileType, Loader2,
  CheckCircle, AlertTriangle, ChevronRight, Globe, Drill, FileChartColumn, Eye, X
} from "lucide-react";
import api from "@/services/api";
import { wellsService } from "@/services/wellsService";
import { cn } from "@/utils";

const REPORT_TYPES = [
  {
    id: "well_intelligence",
    title: "Well Report",
    description: "Complete analysis of a well: events, offset wells, risk predictions, and AI recommendations.",
    icon: Drill,
    color: "#2563eb",
    requires: "well",
    formats: ["pdf", "docx"],
  },
  {
    id: "field_intelligence",
    title: "Field Report",
    description: "Field-level overview: all wells, incident summary grouped by event type, and NPT analysis.",
    icon: Globe,
    color: "#059669",
    requires: "field",
    formats: ["pdf"],
  },
  {
    id: "management_summary",
    title: "Management Summary",
    description: "High-level platform KPI overview: operational status, risk categories, module health.",
    icon: FileText,
    color: "#7c3aed",
    requires: null,
    formats: ["pdf"],
  },
];

type ReportEntry = {
  id: string;
  title: string;
  report_type: string;
  format: string;
  file_size: number;
  generated_by: string;
  created_at: string;
  well_id?: number;
  field_id?: number;
};

function ReportCard({
  report,
  onDelete,
  onDownload,
  onPreview,
}: {
  report: ReportEntry;
  onDelete: () => void;
  onDownload: () => void;
  onPreview: () => void;
}) {
  const typeConfig = REPORT_TYPES.find((t) => t.id === report.report_type);
  const Icon = typeConfig?.icon ?? FileText;
  const color = typeConfig?.color ?? "#6b7280";
  const sizeKB = Math.round(report.file_size / 1024);
  const date = new Date(report.created_at).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 hover:shadow-sm transition-shadow">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: color + "12" }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{report.title}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {report.format.toUpperCase()} · {sizeKB}KB · {date} · By {report.generated_by}
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={onPreview}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
        >
          <Eye size={12} />
          Preview
        </button>
        <button
          onClick={onDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Download size={12} />
          Download
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

export function ReportsPage() {
  const qc = useQueryClient();
  const [selectedType, setSelectedType] = useState<typeof REPORT_TYPES[0] | null>(null);
  const [selectedWellId, setSelectedWellId] = useState<number | "">("");
  const [selectedFieldId, setSelectedFieldId] = useState<number | "">("");
  const [selectedFormat, setSelectedFormat] = useState<"pdf" | "docx">("pdf");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genSuccess, setGenSuccess] = useState<string | null>(null);
  const [previewReport, setPreviewReport] = useState<ReportEntry | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Data for selectors
  const { data: wells } = useQuery({
    queryKey: ["wells-for-reports"],
    queryFn: () => wellsService.list({ limit: 100 }),
    staleTime: 300_000,
  });

  const { data: fields } = useQuery({
    queryKey: ["fields-for-reports"],
    queryFn: () => api.get("/api/fields").then((r) => r.data),
    staleTime: 300_000,
  });

  // List generated reports
  const { data: reports } = useQuery({
    queryKey: ["reports"],
    queryFn: () => api.get("/api/reports").then((r) => r.data),
    staleTime: 5_000,
    refetchInterval: 10_000,
  });

  const handleGenerate = async () => {
    if (!selectedType) return;

    setGenerating(true);
    setGenError(null);
    setGenSuccess(null);

    try {
      const body: Record<string, unknown> = {
        report_type: selectedType.id,
        format: selectedFormat,
      };
      if (selectedType.requires === "well" && selectedWellId) body.well_id = selectedWellId;
      if (selectedType.requires === "field" && selectedFieldId) body.field_id = selectedFieldId;

      const res = await api.post("/api/reports/generate", body);
      setGenSuccess(`"${res.data.report.title}" generated successfully.`);
      qc.invalidateQueries({ queryKey: ["reports"] });
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setGenError(detail || "Report generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (reportId: string) => {
    await api.delete(`/api/reports/${reportId}`);
    qc.invalidateQueries({ queryKey: ["reports"] });
  };

  const handleDownload = async (reportId: string, filename: string) => {
    try {
      const res = await api.get(`/api/reports/${reportId}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch(e) {
      console.error("Download failed", e);
    }
  };

  const handlePreview = async (report: ReportEntry) => {
    setPreviewReport(report);
    if (report.format === "pdf") {
       try {
         const res = await api.get(`/api/reports/${report.id}/download`, { responseType: 'blob' });
         const url = URL.createObjectURL(res.data);
         setPreviewUrl(url);
       } catch(e) {
         console.error("Preview fetch failed", e);
       }
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewReport(null);
  };

  const canGenerate = selectedType && (
    selectedType.requires === null ||
    (selectedType.requires === "well" && selectedWellId) ||
    (selectedType.requires === "field" && selectedFieldId)
  );

  return (
    <div className="p-6 max-w-[1400px] space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <FileChartColumn size={20} className="text-blue-600" />
          Report Generator
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Generate professional PDF/DOCX drilling intelligence reports from the knowledge base.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-5">

        {/* ── Left: Builder ────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Report type cards */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Report Type</p>
            <div className="space-y-2">
              {REPORT_TYPES.map((type) => {
                const Icon = type.icon;
                const active = selectedType?.id === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => {
                      setSelectedType(type);
                      setSelectedFormat(type.formats[0] as "pdf" | "docx");
                      setGenError(null);
                      setGenSuccess(null);
                    }}
                    className={cn(
                      "w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-colors",
                      active
                        ? "border-current bg-opacity-5"
                        : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                    )}
                    style={active ? { borderColor: type.color, backgroundColor: type.color + "08" } : {}}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: type.color + "15" }}>
                      <Icon size={15} style={{ color: type.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium", active ? "text-gray-900" : "text-gray-700")}>
                        {type.title}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-snug">{type.description}</p>
                    </div>
                    {active && <ChevronRight size={14} style={{ color: type.color }} className="flex-shrink-0 mt-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Configuration */}
          {selectedType && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Configuration</p>

              {/* Well selector */}
              {selectedType.requires === "well" && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Select Well *</label>
                  <select
                    value={selectedWellId}
                    onChange={(e) => setSelectedWellId(e.target.value ? parseInt(e.target.value) : "")}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Choose a well…</option>
                    {(wells ?? []).map((w: { id: number; well_name: string; well_status: string }) => (
                      <option key={w.id} value={w.id}>{w.well_name} — {w.well_status}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Field selector */}
              {selectedType.requires === "field" && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Select Field *</label>
                  <select
                    value={selectedFieldId}
                    onChange={(e) => setSelectedFieldId(e.target.value ? parseInt(e.target.value) : "")}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Choose a field…</option>
                    {(fields ?? []).map((f: { id: number; name: string }) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Format */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">Output Format</label>
                <div className="flex gap-2">
                  {selectedType.formats.map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setSelectedFormat(fmt as "pdf" | "docx")}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                        selectedFormat === fmt
                          ? "bg-blue-600 text-white border-blue-600"
                          : "text-gray-600 border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <FileType size={12} />
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={!canGenerate || generating}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  canGenerate && !generating
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                )}
              >
                {generating ? (
                  <><Loader2 size={14} className="animate-spin" /> Generating…</>
                ) : (
                  <><Plus size={14} /> Generate Report</>
                )}
              </button>

              {/* Status messages */}
              {genSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                  <CheckCircle size={13} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-green-700">{genSuccess}</p>
                </div>
              )}
              {genError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertTriangle size={13} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{genError}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Reports list ───────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Generated Reports</h2>
            <span className="text-xs text-gray-400">{(reports ?? []).length} reports</span>
          </div>

          {(reports ?? []).length === 0 ? (
            <div className="py-16 text-center">
              <FileText size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No reports yet</p>
              <p className="text-xs text-gray-400 mt-1">Select a report type and click Generate</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {(reports ?? []).map((report: ReportEntry) => (
                <div key={report.id} className="p-4">
                  <ReportCard
                    report={report}
                    onDelete={() => handleDelete(report.id)}
                    onDownload={() => handleDownload(report.id, `${report.id}.${report.format}`)}
                    onPreview={() => handlePreview(report)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Preview Modal ─────────────────────────────────────── */}
      {previewReport && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm">
          <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">{previewReport.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5 font-medium tracking-wide">
                    PREVIEWING {previewReport.format.toUpperCase()} DOCUMENT
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDownload(previewReport.id, `${previewReport.id}.${previewReport.format}`)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                >
                  <Download size={14} /> Download
                </button>
                <div className="w-px h-6 bg-gray-200" />
                <button
                  onClick={closePreview}
                  className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 bg-gray-100/50 relative">
              {previewReport.format === "pdf" ? (
                previewUrl ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-full border-0"
                    title="PDF Preview"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 size={32} className="animate-spin text-blue-500" />
                  </div>
                )
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-white">
                  <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-5 shadow-sm border border-blue-100">
                    <FileType size={40} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">DOCX Preview Not Supported</h3>
                  <p className="text-sm text-gray-500 max-w-sm mb-6 leading-relaxed">
                    Live browser preview is only available for PDF reports. Please download the DOCX file to view it in Microsoft Word or a compatible editor.
                  </p>
                  <button
                    onClick={() => handleDownload(previewReport.id, `${previewReport.id}.${previewReport.format}`)}
                    className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                  >
                    <Download size={16} /> Download DOCX
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
