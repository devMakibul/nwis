/**
 * Sidebar navigation — collapsible, icon+label, role-aware.
 * Design: Apple-inspired, clean, minimal.
 */
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Radio, Map, Drill, FileText,
  MessageSquare, BarChart2, Settings, LogOut,
  ChevronLeft, ChevronRight, Shield, History,
  FileBarChart, ChartSpline, Bot, FileChartColumn, Cylinder
} from "lucide-react";
import { cn } from "@/utils";
import { useAuthStore } from "@/store/authStore";

interface NavItem {
  label: string;
  icon: React.ElementType;
  to: string;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
  { label: "Offset Wells Map", icon: Map, to: "/map" },
  { label: "Live Risk Monitor", icon: Radio, to: "/live-monitoring" },
  { label: "Well Explorer", icon: Cylinder, to: "/wells" },
  { label: "Historical Events", icon: History, to: "/historical-events" },
  { label: "Document Manager", icon: FileText, to: "/documents" },
  { label: "Analytics", icon: ChartSpline, to: "/analytics" },
  { label: "Report Generator", icon: FileChartColumn, to: "/reports" },
  { label: "Ask NWIS", icon: Bot, to: "/assistant" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleSettings = () => {
    navigate("/settings");
  };

  return (
    <aside
      style={{ width: collapsed ? 64 : 240 }}
      className="flex flex-col h-screen border-r border-gray-200 bg-white transition-all duration-300 flex-shrink-0"
    >
      {/* Logo area */}
      <div className="flex items-center h-14 px-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded bg-blue-700 flex items-center justify-center flex-shrink-0">
            <Shield size={14} color="white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 leading-tight truncate">eRTMAC-NWIS</p>
              <p className="text-[10px] text-gray-400 leading-tight truncate">Oil India Limited</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex-shrink-0"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 mx-2 rounded-md text-sm font-medium",
                "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
                "transition-colors duration-100",
                isActive && "text-blue-700 bg-blue-50 hover:bg-blue-50 hover:text-blue-700",
                collapsed && "justify-center"
              )
            }
            title={collapsed ? item.label : undefined}
          >
            <item.icon size={16} className="flex-shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User area */}
      <div className="border-t border-gray-100 p-3">
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-blue-700">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-[10px] text-gray-400 truncate">{user?.role.name}</p>
            </div>
            <button
              onClick={handleSettings}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
              title="Settings"
            >
              <Settings size={15} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleSettings}
            className="w-full flex justify-center p-2 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100"
            title="Settings"
          >
            <Settings size={15} />
          </button>
        )}
      </div>
    </aside>
  );
}
