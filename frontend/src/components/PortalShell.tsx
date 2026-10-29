import React, { useState } from "react";
import {
  Award,
  BarChart3,
  Bell,
  Bot,
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  Database,
  FileText,
  Home,
  KeyRound,
  Landmark,
  Lock,
  LogIn,
  PlusCircle,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { DemoUser } from "../api";

interface PortalShellProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  demoUsers: DemoUser[];
  currentUser: DemoUser | null;
  onSwitchRole: (email: string) => void;
  clockOffsetDays: number;
  onTimeTravel: (deltaDays?: number, reset?: boolean) => void;
  unackedAlertsCount: number;
  onOpenNewCaseModal: () => void;
  onOpenLoginModal: () => void;
  children: React.ReactNode;
}

const ROLE_DISPLAY: Record<string, { title: string; sub: string; code: string }> = {
  REGIONAL_OFFICER: { title: "Regional Officer", sub: "WRO, Mumbai / NRO", code: "RO" },
  SCRUTINY_OFFICER: { title: "Scrutiny Officer", sub: "Regulation Bureau", code: "SO" },
  EVC_COMMITTEE: { title: "EVC Chairperson", sub: "Expert Visit Panel", code: "EV" },
  SAC_SHC_COMMITTEE: { title: "SAC / SHC Member", sub: "Appellate Committee", code: "SC" },
  COMPETENT_AUTHORITY: { title: "Competent Authority", sub: "AICTE HQ, New Delhi", code: "CA" },
  BUREAU_ADMIN: { title: "Bureau Director", sub: "AICTE HQ, New Delhi", code: "BD" },
  INSTITUTION: { title: "Nodal Officer", sub: "ABC Institute of Tech", code: "IN" },
};

export const PortalShell: React.FC<PortalShellProps> = ({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  demoUsers,
  currentUser,
  onSwitchRole,
  clockOffsetDays,
  onTimeTravel,
  unackedAlertsCount,
  onOpenNewCaseModal,
  onOpenLoginModal,
  children,
}) => {
  const [showSimTools, setShowSimTools] = useState(false);

  const navItems = [
    { id: "CONTROL_TOWER", label: "Dashboard", icon: Home },
    { id: "CASE_WORKSPACE", label: "Applications", icon: FileText },
    { id: "MY_TASKS", label: "My Tasks", icon: CheckSquare, badge: 12 },
    { id: "EVC_QUEUE", label: "EVC Management", icon: CalendarClock },
    {
      id: "COMMITTEES",
      label: "Committees",
      icon: Users,
      hasChevron: true,
      subItems: [
        "Overview",
        "SAC Committees",
        "SHC Committees",
        "EVC Panels",
        "Meeting Calendar",
        "Recommendations",
        "Committee Members",
      ],
    },
    {
      id: "COMPLIANCE_VAULT",
      label: "Compliance",
      icon: ShieldCheck,
      hasChevron: true,
      subItems: [
        "Overview",
        "Compliance Checklist",
        "Document Verification",
        "Institution Compliance",
        "Deficiency Tracking",
        "Renewals & Payments",
        "Inspection Reports",
      ],
    },
    { id: "REPORTS", label: "Reports & Analytics", icon: BarChart3, hasChevron: true },
    {
      id: "MASTER_DATA",
      label: "Master Data",
      icon: Database,
      hasChevron: true,
      subItems: [
        "Institutions",
        "Programmes & Courses",
        "Experts & EVCs",
        "States & Regions",
        "Users & Roles",
        "Regulatory Norms",
        "Document Templates",
        "Academic Year Settings",
      ],
    },
    {
      id: "RULES_AND_AUDIT",
      label: "Audit & Logs",
      icon: Clock,
      hasChevron: true,
      subItems: [
        "Activity Logs",
        "User Access Logs",
        "System Events",
        "Data Change History",
        "Approval Audit Trail",
        "Security Alerts",
      ],
    },
    { id: "ADMINISTRATION", label: "Administration", icon: Settings, hasChevron: true },
  ];

  const roleInfo = ROLE_DISPLAY[currentUser?.role || "REGIONAL_OFFICER"] || ROLE_DISPLAY.REGIONAL_OFFICER;

  return (
    <div className="min-h-screen flex bg-[#f0f4f8] text-slate-800">
      {/* ==================== EXACT LEFT SIDEBAR ==================== */}
      <aside className="w-[235px] bg-[#0b192c] text-white flex flex-col justify-between shrink-0 select-none shadow-2xl z-30">
        <div>
          {/* AICTE Official White Emblem Header */}
          <div className="px-3.5 py-3 bg-white text-slate-900 border-b border-slate-200 flex items-center gap-2.5">
            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 flex items-center justify-center shadow shrink-0 border-2 border-amber-200">
              <Award className="h-6 w-6 text-slate-950 stroke-[2.3]" />
            </div>
            <div className="leading-tight">
              <div className="text-[17px] font-black tracking-tight text-slate-900">AICTE</div>
              <div className="text-[9.5px] font-semibold text-slate-600 leading-tight">
                All India Council for Technical Education
              </div>
              <div className="text-[8.5px] font-bold text-amber-800 mt-0.5">
                अखिल भारतीय तकनीकी शिक्षा परिषद्
              </div>
            </div>
          </div>

          {/* Navigation Menu with Contextual Sub-Menus */}
          <nav className="px-2.5 py-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                activeTab === item.id ||
                (item.id === "CONTROL_TOWER" && (activeTab === "REPORTS" || activeTab === "ADMINISTRATION"));

              return (
                <div key={item.id}>
                  <button
                    onClick={() =>
                      setActiveTab(
                        item.id === "REPORTS" || item.id === "ADMINISTRATION" ? "RULES_AND_AUDIT" : item.id
                      )
                    }
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[12.5px] font-semibold transition-all ${
                      activeTab === item.id
                        ? "bg-gradient-to-r from-[#f59e0b] to-[#ea580c] text-white font-bold shadow-md shadow-orange-500/25"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined ? (
                      <span className="rounded-full bg-[#ef4444] px-2 py-0.5 text-[10px] font-extrabold text-white">
                        {item.badge}
                      </span>
                    ) : item.hasChevron ? (
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${
                          activeTab === item.id ? "rotate-180 text-white" : "text-slate-400"
                        }`}
                      />
                    ) : null}
                  </button>

                  {/* Sub-menu items shown when parent section is active (Matches Images 5, 6, 7, 8) */}
                  {activeTab === item.id && item.subItems && (
                    <div className="mt-1 ml-3 pl-3 border-l border-slate-700/80 space-y-0.5 py-1">
                      {item.subItems.map((sub, idx) => (
                        <div
                          key={sub}
                          className={`px-2.5 py-1.5 rounded-lg text-[11.5px] cursor-pointer transition ${
                            idx === 0
                              ? "bg-amber-500/20 text-amber-300 font-bold"
                              : "text-slate-400 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          {sub}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Need Help? AI Assistant Card */}
          <div className="mx-2.5 mt-2 rounded-xl border border-sky-400/25 bg-[#122640] p-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="leading-tight">
                  <div className="text-[11.5px] font-bold text-white">Need Help?</div>
                  <div className="text-[10px] text-slate-300">AI Assistant</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Bottom India Gate Silhouette & Government of India Seal */}
        <div className="relative overflow-hidden border-t border-white/10 bg-gradient-to-t from-[#060f1d] via-[#18283e] to-[#7c3f12]/70 pt-6 pb-3.5 px-3 text-center">
          {/* Stylized India Gate Arch Silhouette */}
          <svg
            viewBox="0 0 120 55"
            className="w-24 mx-auto mb-1 opacity-40 text-amber-300"
            fill="currentColor"
          >
            <path d="M25 55 L25 18 L32 18 L32 10 L88 10 L88 18 L95 18 L95 55 L75 55 L75 32 A15 15 0 0 0 45 32 L45 55 Z" />
          </svg>
          <div className="text-[10.5px] font-bold text-amber-200 tracking-wide">भारत सरकार</div>
          <div className="text-[10px] font-medium text-slate-200">Government of India</div>
          <div className="mt-1.5 text-[12px] font-extrabold tracking-wide text-white">
            AICTE-NIYANTRAN
          </div>
          <div className="text-[9px] text-slate-400">v1.0.0 | PS 26262 | SIH 2026</div>
        </div>
      </aside>

      {/* ==================== MAIN PORTAL CONTENT AREA ==================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Exact Top White Header Bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200/90 px-5 py-2.5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Title & Subtitle */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[21px] font-black tracking-tight text-[#0d6e52]">
                  AICTE-NIYANTRAN
                </span>
              </div>
              <div className="text-[11.5px] font-semibold text-slate-600 -mt-0.5">
                Unified Approval & Compliance Control System
              </div>
              <div className="text-[10px] font-medium text-slate-400">
                Rule-Driven | Dependency-Aware | Tamper-Evident | Compliant with PS 26262
              </div>
            </div>

            {/* Center Global Search Bar with Ctrl K */}
            <div className="relative flex-1 max-w-md min-w-[230px]">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search case number, institution, stage, document..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/90 pl-9 pr-14 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#0d6e52] focus:bg-white focus:outline-none"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
                Ctrl K
              </span>
            </div>

            {/* Right Controls: Academic Year + Bell + RO Profile Pill + SIH Demo Tools */}
            <div className="flex items-center gap-3">
              {/* Academic Year Box */}
              <div className="hidden sm:flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-2xs">
                <Calendar className="h-4 w-4 text-slate-600" />
                <div className="leading-tight">
                  <div className="text-[9px] font-semibold text-slate-400">Academic Year</div>
                  <div className="text-[11.5px] font-extrabold text-slate-800 flex items-center gap-1">
                    2026 - 2027 <ChevronDown className="h-3 w-3 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Notification Bell with Red Badge */}
              <button
                onClick={() => setActiveTab("CONTROL_TOWER")}
                className="relative rounded-full border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
                title="Active Alerts & Escalations"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#ef4444] text-[9px] font-extrabold text-white">
                  {Math.max(5, unackedAlertsCount)}
                </span>
              </button>

              {/* Profile & Role Switcher Pill */}
              <div className="relative">
                <button
                  onClick={() => setShowSimTools(!showSimTools)}
                  className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-white pl-1.5 pr-3 py-1 hover:bg-slate-50 transition"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0284c7] text-xs font-extrabold text-white shadow-xs">
                    {roleInfo.code}
                  </div>
                  <div className="text-left leading-tight">
                    <div className="text-xs font-extrabold text-slate-800">{roleInfo.title}</div>
                    <div className="text-[10px] font-medium text-slate-500">{roleInfo.sub}</div>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {/* Dropdown Popover for Live SIH Jury Demo Controls (Role Switcher + Time-Travel + Login Page) */}
                {showSimTools && (
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl z-50 text-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="font-extrabold text-slate-900">
                        SIH Jury Live Role & Clock Controls
                      </span>
                      <button
                        onClick={() => setShowSimTools(false)}
                        className="text-slate-400 hover:text-slate-700 font-bold"
                      >
                        ✕
                      </button>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Switch Active JWT Role:
                      </label>
                      <select
                        value={currentUser?.email || ""}
                        onChange={(e) => {
                          onSwitchRole(e.target.value);
                          setShowSimTools(false);
                        }}
                        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 font-bold text-slate-800"
                      >
                        {demoUsers.map((u) => (
                          <option key={u.id} value={u.email}>
                            {u.role} — {u.full_name} ({u.jurisdiction_code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                        Time-Travel SLA & Lease Expiry Simulator (Current: +{clockOffsetDays}d):
                      </label>
                      <div className="flex gap-1.5">
                        {[7, 15, 30, 90].map((d) => (
                          <button
                            key={d}
                            onClick={() => onTimeTravel(d, false)}
                            className="flex-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 py-1.5 font-bold text-white"
                          >
                            +{d}d
                          </button>
                        ))}
                        <button
                          onClick={() => onTimeTravel(0, true)}
                          className="rounded-lg bg-slate-200 hover:bg-slate-300 px-2.5 py-1.5 font-bold text-slate-700"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex gap-2">
                      <button
                        onClick={() => {
                          setShowSimTools(false);
                          onOpenNewCaseModal();
                        }}
                        className="flex-1 rounded-lg bg-[#0d6e52] hover:bg-emerald-800 py-1.5 font-bold text-white"
                      >
                        + New Application
                      </button>
                      <button
                        onClick={() => {
                          setShowSimTools(false);
                          onOpenLoginModal();
                        }}
                        className="flex-1 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 py-1.5 font-bold text-slate-700"
                      >
                        View Login Screen
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-5 flex-1 max-w-[1600px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
};

/* ==================== OFFICIAL SIGN-IN SCREEN MODAL (Matches Bottom of Image 8) ==================== */
export const OfficialSignInModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  demoUsers: DemoUser[];
  onSelectUser: (email: string) => void;
}> = ({ isOpen, onClose, demoUsers, onSelectUser }) => {
  const [selectedEmail, setSelectedEmail] = useState(demoUsers[0]?.email || "ro.nro@aicte-india.org");
  const [password, setPassword] = useState("••••••••••••");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#fef3c7] via-[#e0f2fe] to-[#d1fae5] shadow-2xl grid grid-cols-1 lg:grid-cols-12">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-white"
        >
          Close ✕
        </button>

        {/* Left 7 Cols: AICTE Campus Backdrop & Patriotic Branding */}
        <div className="p-8 lg:col-span-7 flex flex-col justify-between relative overflow-hidden">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-[#0d6e52]">AICTE-NIYANTRAN</h1>
            <p className="text-sm font-semibold text-slate-700 mt-1">
              Unified Approval & Compliance Control System
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1 text-sky-700">🔍 Transparent</span>
              <span className="flex items-center gap-1 text-amber-700">📋 Rule-Driven</span>
              <span className="flex items-center gap-1 text-emerald-700">✓ Accountable</span>
              <span className="flex items-center gap-1 text-orange-700">🇮🇳 Stronger India</span>
            </div>
          </div>

          {/* Stylized AICTE Headquarters Illustration Card */}
          <div className="my-6 rounded-2xl border border-white/60 bg-gradient-to-r from-[#0f2942] via-[#1e4976] to-[#b45309] p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <span className="rounded bg-amber-400/20 border border-amber-300/40 px-2 py-0.5 text-[10px] font-bold text-amber-200">
                  AICTE HEADQUARTERS · NEW DELHI
                </span>
                <h3 className="text-lg font-extrabold mt-2">
                  "Quality Technical Education for a Developed India"
                </h3>
                <p className="text-xs text-slate-200 mt-1">
                  Integrated Workflow Automation, EVC Scheduling, Undertaking & Lease Validity Monitoring (PS 26262)
                </p>
              </div>
              <Landmark className="h-14 w-14 text-amber-300/80 shrink-0" />
            </div>
          </div>

          <div className="text-xs font-semibold text-slate-600">
            All India Council for Technical Education · Nelson Mandela Marg, Vasant Kunj, New Delhi-110070
          </div>
        </div>

        {/* Right 5 Cols: White Sign-In Card */}
        <div className="bg-white p-8 lg:col-span-5 flex flex-col justify-center shadow-xl">
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 font-black">
              <Award className="h-6 w-6" />
            </div>
            <div className="leading-tight">
              <div className="text-base font-black text-slate-900">AICTE</div>
              <div className="text-[9px] font-semibold text-slate-500">
                All India Council for Technical Education
              </div>
            </div>
          </div>

          <h2 className="text-center text-lg font-black text-slate-900">
            Sign In to <span className="text-[#d97706]">AICTE-NIYANTRAN</span>
          </h2>
          <p className="text-center text-xs text-slate-500 mb-5">
            Access your authorised role account to continue
          </p>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Username / Official Email</label>
              <select
                value={selectedEmail}
                onChange={(e) => setSelectedEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 font-semibold text-slate-800"
              >
                {demoUsers.map((u) => (
                  <option key={u.id} value={u.email}>
                    {u.email} ({u.role} - {u.jurisdiction_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-slate-800"
              />
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <label className="flex items-center gap-1.5 text-slate-600 font-medium">
                <input type="checkbox" defaultChecked /> Remember me
              </label>
              <span className="text-sky-600 font-bold cursor-pointer">Forgot Password?</span>
            </div>

            <button
              onClick={() => {
                onSelectUser(selectedEmail);
                onClose();
              }}
              className="w-full rounded-xl bg-[#0c2340] hover:bg-slate-800 py-2.5 text-xs font-extrabold text-white shadow-md transition"
            >
              Sign In →
            </button>

            <div className="relative py-2 text-center">
              <span className="bg-white px-2 text-[10px] text-slate-400 uppercase font-bold">or</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => {
                  onSelectUser(selectedEmail);
                  onClose();
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 py-2 text-[11px] font-bold text-slate-700"
              >
                <span className="rounded bg-sky-600 px-1 text-[9px] text-white font-black">NIC</span>
                NIC Single Sign-On
              </button>
              <button
                onClick={() => {
                  onSelectUser(selectedEmail);
                  onClose();
                }}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 py-2 text-[11px] font-bold text-slate-700"
              >
                <span className="rounded bg-indigo-600 px-1 text-[9px] text-white font-black">DL</span>
                DigiLocker
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};