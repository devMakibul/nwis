/**
 * Login Page
 * Features: role selector that auto-fills demo credentials, clean professional design.
 */
import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Shield, ChevronDown, Eye, EyeOff, AlertCircle, FileText, AlertTriangle, Lightbulb, BookOpen } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { authService } from "@/services/authService";
import { cn } from "@/utils";

interface DemoRole {
  label: string;
  email: string;
  password: string;
  description: string;
  color: string;
}

const DEMO_ROLES: DemoRole[] = [
  {
    label: "Admin",
    email: "admin@nwis.oilindia.in",
    password: "admin123",
    description: "Full system administration",
    color: "#dc2626",
  },
  {
    label: "Drilling Engineer",
    email: "engineer@nwis.oilindia.in",
    password: "engineer123",
    description: "Operational decision making",
    color: "#1d4ed8",
  },
  {
    label: "Management",
    email: "management@nwis.oilindia.in",
    password: "mgmt123",
    description: "Read-only overview",
    color: "#059669",
  },
];

export function LoginPage() {
  const { isAuthenticated, setAuth, setLoading, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const [selectedRole, setSelectedRole] = useState<DemoRole>(DEMO_ROLES[1]);
  const [email, setEmail] = useState(DEMO_ROLES[1].email);
  const [password, setPassword] = useState(DEMO_ROLES[1].password);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  useEffect(() => {
    setEmail(selectedRole.email);
    setPassword(selectedRole.password);
    setError("");
  }, [selectedRole]);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await authService.login({ email, password });
      setAuth(data.access_token, data.user);
      navigate("/dashboard");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail || "Invalid credentials. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-white border-r border-gray-200 flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-700 flex items-center justify-center">
              <Shield size={20} color="white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">eRTMAC-NWIS</h1>
              <p className="text-xs text-gray-500">Oil India Limited</p>
            </div>
          </div>

          <div className="mt-16">
            <h2 className="text-3xl font-semibold text-gray-900 leading-tight">
              Nearby Wells<br />Intelligence System
            </h2>
            <p className="mt-4 text-base text-gray-500 leading-relaxed max-w-md">
              AI-powered drilling decision support. Combining historical well knowledge, 
              geological context, and machine learning to help engineers make better decisions.
            </p>
          </div>

          <div className="mt-12 space-y-4">
            {[
              { 
                icon: FileText, 
                color: "text-blue-500", 
                bg: "bg-blue-50",
                text: "Converting old paper documents to structured data" 
              },
              { 
                icon: AlertTriangle, 
                color: "text-amber-500", 
                bg: "bg-amber-50",
                text: "Identify potential risks before they happen" 
              },
              { 
                icon: Lightbulb, 
                color: "text-green-500", 
                bg: "bg-green-50",
                text: "Generate recommendations to assist drilling engineers make proactive decisions" 
              },
              { 
                icon: BookOpen, 
                color: "text-purple-500", 
                bg: "bg-purple-50",
                text: "Knowledge repo of drilling events, lessons learned, operational challenges, and mitigation measures" 
              },
            ].map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div key={idx} className="flex items-start gap-4 p-4 border border-gray-100 rounded-xl bg-white hover:shadow-sm transition-shadow">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", feature.bg, feature.color)}>
                    <Icon size={18} />
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed font-medium mt-1">
                    {feature.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-gray-400">
          Smart India Hackathon 2026 — Problem Statement SIH26121
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded bg-blue-700 flex items-center justify-center">
              <Shield size={16} color="white" />
            </div>
            <span className="font-semibold text-gray-900">eRTMAC-NWIS</span>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900">Sign in</h2>
            <p className="text-sm text-gray-500 mt-1">Access the drilling intelligence platform</p>
          </div>

          {/* Role selector */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Demo Role
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white hover:border-gray-300 focus:outline-none focus:border-blue-500"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: selectedRole.color }}
                  />
                  <span className="font-medium">{selectedRole.label}</span>
                  <span className="text-gray-400 text-xs">— {selectedRole.description}</span>
                </div>
                <ChevronDown size={14} className={cn("text-gray-400 transition-transform", roleDropdownOpen && "rotate-180")} />
              </button>

              {roleDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
                  {DEMO_ROLES.map((role) => (
                    <button
                      key={role.label}
                      type="button"
                      onClick={() => {
                        setSelectedRole(role);
                        setRoleDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-gray-50",
                        selectedRole.label === role.label && "bg-blue-50"
                      )}
                    >
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: role.color }} />
                      <div>
                        <p className="font-medium text-gray-900">{role.label}</p>
                        <p className="text-xs text-gray-400">{role.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Login form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                placeholder="email@oilindia.in"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                "w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white",
                "bg-blue-700 hover:bg-blue-800 focus:outline-none",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-colors duration-150"
              )}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            eRTMAC-NWIS v0.9 — Smart India Hackathon 2026
          </p>
        </div>
      </div>
    </div>
  );
}
