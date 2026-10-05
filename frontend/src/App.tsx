/**
 * Application router — all routes defined here.
 */
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/auth/LoginPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { WellExplorerPage } from "@/pages/wells/WellExplorerPage";
import { WellDetailPage } from "@/pages/wells/WellDetailPage";
import { MapPage } from "@/pages/map/MapPage";
import { DocumentsPage } from "@/pages/documents/DocumentsPage";
import { AssistantPage } from "@/pages/assistant/AssistantPage";
import { DrillingIntelligencePage } from "@/pages/monitoring/DrillingIntelligencePage";
import { AnalyticsPage } from "@/pages/analytics/AnalyticsPage";
import { ReportsPage } from "@/pages/reports/ReportsPage";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { HistoricalEventsPage } from "@/pages/documents/HistoricalEventsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected */}
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/live-monitoring" element={<DrillingIntelligencePage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/wells" element={<WellExplorerPage />} />
            <Route path="/wells/:id" element={<WellDetailPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/historical-events" element={<HistoricalEventsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontSize: "13px",
            fontFamily: "Inter, sans-serif",
            background: "#fff",
            color: "#111827",
            border: "1px solid #e5e7eb",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
          },
        }}
      />
    </QueryClientProvider>
  );
}
