import React, { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Building2,
  Calendar,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  Clock,
  Download,
  FileCheck2,
  FileText,
  Filter,
  FolderOpen,
  Landmark,
  MessageSquare,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { CaseSummaryItem } from "../api";

/* ==================== SCREEN 1: EXACT EXECUTIVE DASHBOARD (Matches Image 1) ==================== */
export const ExecutiveDashboardView: React.FC<{
  dashboardData: any;
  allCases: CaseSummaryItem[];
  filteredCases: CaseSummaryItem[];
  currentUserRole: string;
  currentUserJurisdiction: string;
  formattedSimDate: string;
  taskFilter: "ALL" | "OVERDUE" | "DUE_SOON";
  setTaskFilter: (f: "ALL" | "OVERDUE" | "DUE_SOON") => void;
  aiPrompt: string;
  setAiPrompt: (q: string) => void;
  aiResponse: string;
  onAskAi: (chip?: string) => void;
  onSelectCase: (id: number, targetTab?: string) => void;
  onNavigateTab: (tab: string) => void;
  onAcknowledgeAlert: (alertId: number) => Promise<void>;
}> = ({
  dashboardData,
  allCases,
  filteredCases,
  currentUserRole,
  currentUserJurisdiction,
  formattedSimDate,
  taskFilter,
  setTaskFilter,
  aiPrompt,
  setAiPrompt,
  aiResponse,
  onAskAi,
  onSelectCase,
  onNavigateTab,
  onAcknowledgeAlert,
}) => {
  const topPriorityCase = allCases[0];
  const pScore = topPriorityCase ? Math.round(topPriorityCase.priority.priority_score) : 87;

  return (
    <div className="space-y-4">
      {/* 1. Patriotic Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0b1d33] via-[#1f4068] to-[#b45309] text-white px-6 py-5 shadow-md border border-slate-200/60">
        {/* Decorative Tricolor Wave SVG */}
        <svg
          className="absolute inset-0 h-full w-full opacity-25 pointer-events-none"
          viewBox="0 0 1200 220"
          preserveAspectRatio="none"
        >
          <path
            d="M350,220 C520,80 760,180 1200,20 L1200,220 Z"
            fill="url(#heroTricolor)"
          />
          <defs>
            <linearGradient id="heroTricolor" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>
          </defs>
        </svg>

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex h-16 w-16 rounded-2xl bg-white/15 backdrop-blur-xs border border-white/25 items-center justify-center text-amber-300 shadow-inner">
              <Landmark className="h-9 w-9" />
            </div>
            <div>
              <div className="text-xs font-semibold text-amber-200">Welcome back,</div>
              <h2 className="text-2xl md:text-[28px] font-black tracking-tight text-white leading-tight">
                Regional Officer
              </h2>
              <div className="text-xs text-slate-200 font-medium mt-0.5">
                {currentUserJurisdiction === "HQ" ? "WRO, Mumbai / HQ" : `${currentUserJurisdiction}, Regional Office`} | {formattedSimDate}
              </div>
              <div className="text-xs text-amber-100/90 mt-0.5">
                Driving Transparent, Timely and Compliant Technical Education Approvals
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-[#0b192c]/80 backdrop-blur-md border border-white/20 px-5 py-3.5 max-w-xs shadow-lg">
            <p className="text-xs italic font-semibold text-white leading-relaxed">
              "From Application to Approval to Compliance — One Unified Control System"
            </p>
          </div>
        </div>
      </div>

      {/* 2. Five White KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        {[
          {
            title: "Total Applications",
            val: "1,248",
            trend: "↑ 12%",
            trendColor: "text-emerald-600",
            sub: "This Academic Year",
            iconBg: "bg-sky-100 text-sky-600",
            icon: FileText,
            tab: "CASE_WORKSPACE",
          },
          {
            title: "Pending at Your End",
            val: "86",
            trend: "↑ 8%",
            trendColor: "text-amber-600",
            sub: "Require Action",
            iconBg: "bg-amber-100 text-amber-600",
            icon: Clock,
            tab: "MY_TASKS",
          },
          {
            title: "EVC Scheduled",
            val: "42",
            trend: "↑ 25%",
            trendColor: "text-emerald-600",
            sub: "Upcoming Visits",
            iconBg: "bg-purple-100 text-purple-600",
            icon: Users,
            tab: "EVC_QUEUE",
          },
          {
            title: "Post-Approval Compliance",
            val: "320",
            trend: "↑ 14%",
            trendColor: "text-emerald-600",
            sub: "Undertakings & Leases",
            iconBg: "bg-emerald-100 text-emerald-600",
            icon: ShieldCheck,
            tab: "COMPLIANCE_VAULT",
          },
          {
            title: "Overdue / Escalated",
            val: "28",
            trend: "↑ 40%",
            trendColor: "text-rose-600",
            sub: "Require Immediate Attention",
            iconBg: "bg-rose-100 text-rose-600",
            icon: AlertTriangle,
            tab: "RULES_AND_AUDIT",
          },
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigateTab(kpi.tab)}
              className="rounded-2xl bg-white p-4 shadow-xs border border-slate-200/80 flex items-center gap-3.5 cursor-pointer hover:border-sky-300 transition"
            >
              <div className={`h-11 w-11 rounded-xl ${kpi.iconBg} flex items-center justify-center shrink-0`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500">{kpi.title}</div>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-[22px] font-black text-slate-900 leading-none">{kpi.val}</span>
                  <span className={`text-[11px] font-extrabold ${kpi.trendColor}`}>{kpi.trend}</span>
                </div>
                <div className="text-[10.5px] text-slate-400 font-medium mt-0.5">{kpi.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Main 12-Col Grid Matching Image 1 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* LEFT 6 COLS */}
        <div className="space-y-4 xl:col-span-6">
          {/* Application Lifecycle Overview */}
          <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-200/80">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Application Lifecycle Overview</h3>
                <p className="text-[11px] text-slate-500">
                  Track the complete journey from submission to post-approval compliance
                </p>
              </div>
              <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10.5px] font-bold text-slate-600">
                Academic Year 2026-27 ▾
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 text-center pt-1">
              {[
                { label: "Submission", val: "1,248", sub: "Total", color: "bg-sky-500" },
                { label: "Scrutiny", val: "312", sub: "In Progress", color: "bg-amber-500" },
                { label: "EVC", val: "186", sub: "Scheduled", color: "bg-purple-500" },
                { label: "SAC/SHC", val: "74", sub: "Under Review", color: "bg-rose-500" },
                { label: "Final Decision", val: "420", sub: "Approved", color: "bg-emerald-500" },
                { label: "Post-Approval", val: "320", sub: "Under Monitoring", color: "bg-sky-600" },
              ].map((st, i) => (
                <div
                  key={i}
                  onClick={() => onNavigateTab("CASE_WORKSPACE")}
                  className="rounded-xl bg-slate-50/70 p-2.5 border border-slate-100 hover:border-slate-300 cursor-pointer transition"
                >
                  <div
                    className={`mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full ${st.color} text-white text-xs font-bold shadow-xs`}
                  >
                    ✓
                  </div>
                  <div className="text-[11px] font-bold text-slate-700">{st.label}</div>
                  <div className="text-base font-black text-slate-900">{st.val}</div>
                  <div className="text-[9.5px] text-slate-400 font-medium">{st.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Applications by Route Type (Donut) + Monthly Application Trend (Bars) */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Donut Card */}
            <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-200/80">
              <h3 className="text-xs font-extrabold text-slate-900">
                Applications by Route Type (APH 2024-27)
              </h3>
              <div className="mt-3 flex items-center gap-3">
                <div className="relative h-28 w-28 shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 36 36" className="h-28 w-28 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#0284c7" strokeWidth="4.6" strokeDasharray="32 68" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="4.6" strokeDasharray="28 72" strokeDashoffset="-32" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#ef4444" strokeWidth="4.6" strokeDasharray="18 82" strokeDashoffset="-60" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#8b5cf6" strokeWidth="4.6" strokeDasharray="12 88" strokeDashoffset="-78" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f59e0b" strokeWidth="4.6" strokeDasharray="10 90" strokeDashoffset="-90" />
                  </svg>
                  <div className="absolute text-center">
                    <div className="text-base font-black text-slate-900 leading-none">1,248</div>
                    <div className="text-[8.5px] font-semibold text-slate-400 mt-0.5">Total Applications</div>
                  </div>
                </div>

                <div className="flex-1 space-y-1.5 text-[11px]">
                  {[
                    ["Only Scrutiny", "32%", "399", "bg-sky-600"],
                    ["Scrutiny + EVC", "28%", "349", "bg-emerald-500"],
                    ["EVC + SAC/SHC", "18%", "225", "bg-rose-500"],
                    ["Only EVC", "12%", "150", "bg-purple-500"],
                    ["Others", "10%", "125", "bg-amber-500"],
                  ].map(([lbl, pct, cnt, dot], i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                        <span className={`h-2 w-2 rounded-full ${dot}`} /> {lbl}
                      </span>
                      <span className="font-mono text-[10.5px] font-bold text-slate-600">
                        {pct} &nbsp;{cnt}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Monthly Application Trend Card */}
            <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-slate-900">Monthly Application Trend</h3>
                <span className="text-[10px] font-bold text-emerald-600">↑ 18% Last 8 Months</span>
              </div>
              <div className="mt-3 flex items-end justify-between gap-2 h-28 pt-4 px-1">
                {[
                  ["Jan", 120, "h-9"],
                  ["Feb", 180, "h-12"],
                  ["Mar", 210, "h-15"],
                  ["Apr", 160, "h-11"],
                  ["May", 190, "h-14"],
                  ["Jun", 220, "h-16"],
                  ["Jul", 260, "h-20"],
                  ["Aug", 300, "h-24"],
                ].map(([m, v, hCls], i) => (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <span className="text-[9px] font-bold text-slate-600 mb-1">{v}</span>
                    <div className={`w-full rounded-t-md bg-gradient-to-t from-[#0284c7] to-[#38bdf8] ${hCls}`} />
                    <span className="text-[9.5px] font-semibold text-slate-400 mt-1">{m}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Applications Table */}
          <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-200/80">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-sm font-extrabold text-slate-900">Recent Applications</h3>
              <button
                onClick={() => onNavigateTab("CASE_WORKSPACE")}
                className="text-xs font-bold text-sky-600 hover:underline"
              >
                View All
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11.5px]">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-2.5 py-2">Case Number</th>
                    <th className="px-2.5 py-2">Institution Name</th>
                    <th className="px-2.5 py-2">Type</th>
                    <th className="px-2.5 py-2">Current Stage</th>
                    <th className="px-2.5 py-2">SLA Due</th>
                    <th className="px-2.5 py-2">Status</th>
                    <th className="px-2.5 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCases.slice(0, 6).map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => onSelectCase(c.id, "CASE_WORKSPACE")}
                      className="hover:bg-sky-50/60 cursor-pointer transition"
                    >
                      <td className="px-2.5 py-2.5 font-mono font-bold text-slate-800">{c.case_number}</td>
                      <td className="px-2.5 py-2.5 font-bold text-slate-900 truncate max-w-[170px]">
                        {c.institution_name}
                      </td>
                      <td className="px-2.5 py-2.5 text-slate-600">
                        {c.route_pattern === "SCRUTINY_PLUS_EVC"
                          ? "Scrutiny + EVC"
                          : c.route_pattern === "ONLY_SCRUTINY"
                          ? "Only Scrutiny"
                          : c.route_pattern === "EVC_PLUS_SAC_SHC"
                          ? "EVC + SAC/SHC"
                          : "Only EVC"}
                      </td>
                      <td className="px-2.5 py-2.5 font-semibold text-sky-700">{c.current_stage}</td>
                      <td className="px-2.5 py-2.5 text-slate-500 font-mono text-[10.5px]">
                        {c.priority.due_at_iso ? c.priority.due_at_iso.slice(0, 10) : "27 Aug 2026"}
                      </td>
                      <td className="px-2.5 py-2.5">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            c.priority.risk_band === "CRITICAL_OVERDUE"
                              ? "bg-rose-100 text-rose-700"
                              : c.overall_status === "CONDITIONAL_APPROVED"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {c.priority.risk_band === "CRITICAL_OVERDUE"
                            ? "Overdue"
                            : c.overall_status === "CONDITIONAL_APPROVED"
                            ? "Forwarded"
                            : "In Progress"}
                        </span>
                      </td>
                      <td className="px-2.5 py-2.5 font-bold text-sky-600">View ···</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* CENTER 3 COLS: India Regional Distribution + Compliance Monitoring */}
        <div className="space-y-4 xl:col-span-3">
          {/* India - Regional Distribution */}
          <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-200/80">
            <h3 className="text-sm font-extrabold text-slate-900">India - Regional Distribution</h3>
            <div className="mt-3 flex items-center gap-2">
              <div className="w-[52%] flex justify-center">
                <svg viewBox="0 0 200 230" className="h-44 w-auto drop-shadow-xs">
                  <path
                    d="M85,12 L112,18 L122,42 L152,65 L178,78 L168,112 L138,132 L115,188 L96,218 L78,185 L58,138 L30,108 L42,72 L68,45 Z"
                    fill="#bae6fd"
                    stroke="#0284c7"
                    strokeWidth="2"
                  />
                  <path d="M58,138 L30,108 L42,72 L85,95 Z" fill="#fdba74" />
                  <path d="M85,95 L138,132 L115,188 L78,185 Z" fill="#fca5a5" />
                  <path d="M122,42 L178,78 L168,112 L120,95 Z" fill="#86efac" />
                </svg>
              </div>

              <div className="w-[48%] space-y-1.5 text-xs">
                {[
                  ["NRO", 180, "bg-sky-600"],
                  ["NWRO", 145, "bg-teal-500"],
                  ["WRO", 220, "bg-orange-500"],
                  ["SWRO", 160, "bg-amber-500"],
                  ["SCRO", 118, "bg-purple-500"],
                  ["SRO", 140, "bg-rose-500"],
                  ["ERO", 132, "bg-emerald-500"],
                  ["CRO", 153, "bg-indigo-600"],
                ].map(([code, count, dot], i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold text-slate-700 text-[11px]">
                      <span className={`h-2 w-2 rounded-full ${dot}`} /> {code}
                    </span>
                    <span className="font-mono font-bold text-slate-800 text-[11px]">{count}</span>
                  </div>
                ))}
                <button
                  onClick={() => onNavigateTab("MASTER_DATA")}
                  className="pt-1 text-[11px] font-bold text-sky-600 hover:underline block"
                >
                  View Details ›
                </button>
              </div>
            </div>
          </div>

          {/* Compliance Monitoring */}
          <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-200/80">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-extrabold text-slate-900">Compliance Monitoring</h3>
              <button
                onClick={() => onNavigateTab("COMPLIANCE_VAULT")}
                className="text-xs font-bold text-sky-600 hover:underline"
              >
                View All
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              {[
                {
                  title: "Lease Documents",
                  sub: "Expiring in 30 days",
                  count: 32,
                  tone: "text-rose-600",
                  iconBg: "bg-amber-100 text-amber-700",
                },
                {
                  title: "Fire Safety NOCs",
                  sub: "Expiring in 60 days",
                  count: 18,
                  tone: "text-rose-600",
                  iconBg: "bg-rose-100 text-rose-600",
                },
                {
                  title: "Building Certificates",
                  sub: "Expiring in 60 days",
                  count: 26,
                  tone: "text-amber-700",
                  iconBg: "bg-sky-100 text-sky-600",
                },
                {
                  title: "Undertakings Pending",
                  sub: "Verification",
                  count: 44,
                  tone: "text-rose-600",
                  iconBg: "bg-emerald-100 text-emerald-600",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  onClick={() => onNavigateTab("COMPLIANCE_VAULT")}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 p-3 hover:border-slate-300 cursor-pointer transition"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`h-8 w-8 rounded-lg ${item.iconBg} flex items-center justify-center font-bold`}>
                      !
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-800 text-xs">{item.title}</div>
                      <div className="text-[10.5px] text-slate-500">{item.sub}</div>
                    </div>
                  </div>
                  <span className={`font-mono text-sm font-black ${item.tone}`}>{item.count} ›</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT 3 COLS: Priority Task Queue + SLA Escalations (P) Gauge + AI Assistant */}
        <div className="space-y-4 xl:col-span-3">
          {/* Priority Task Queue */}
          <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-200/80">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-extrabold text-slate-900">Priority Task Queue</h3>
              <button
                onClick={() => onNavigateTab("MY_TASKS")}
                className="text-xs font-bold text-sky-600 hover:underline"
              >
                View All
              </button>
            </div>

            <div className="flex gap-1.5 mb-3">
              {[
                { id: "ALL", label: "All (12)" },
                { id: "OVERDUE", label: "Overdue (4)" },
                { id: "DUE_SOON", label: "Due Today (5)" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setTaskFilter(tab.id as any)}
                  className={`rounded-lg px-2.5 py-1 text-[10.5px] font-bold transition ${
                    taskFilter === tab.id
                      ? "bg-[#0c1b2e] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {[
                {
                  title: "Review Scrutiny Report",
                  caseNo: "AICTE/WRO/2026/1473",
                  tag: "Scrutiny",
                  tagTone: "bg-amber-100 text-amber-800",
                  due: "Due Today",
                  dueTone: "text-rose-600",
                  id: allCases[0]?.id || 1,
                },
                {
                  title: "EVC Slot Allocation",
                  caseNo: "AICTE/WRO/2026/1392",
                  tag: "EVC",
                  tagTone: "bg-purple-100 text-purple-800",
                  due: "Due Today",
                  dueTone: "text-rose-600",
                  id: allCases[1]?.id || 1,
                },
                {
                  title: "Verify Undertaking Document",
                  caseNo: "AICTE/WRO/2025/0987",
                  tag: "Compliance",
                  tagTone: "bg-emerald-100 text-emerald-800",
                  due: "Due in 2 days",
                  dueTone: "text-slate-500",
                  id: allCases[1]?.id || 2,
                },
                {
                  title: "Respond to Institution Query",
                  caseNo: "AICTE/WRO/2026/1521",
                  tag: "Clarification",
                  tagTone: "bg-orange-100 text-orange-800",
                  due: "Due in 3 days",
                  dueTone: "text-slate-500",
                  id: allCases[0]?.id || 1,
                },
                {
                  title: "Review EVC Findings",
                  caseNo: "AICTE/WRO/2026/1314",
                  tag: "EVC",
                  tagTone: "bg-purple-100 text-purple-800",
                  due: "Due in 3 days",
                  dueTone: "text-slate-500",
                  id: allCases[2]?.id || 1,
                },
              ].map((t, idx) => (
                <div
                  key={idx}
                  onClick={() => onSelectCase(t.id, "MY_TASKS")}
                  className="rounded-xl border border-slate-100 bg-slate-50/90 p-2.5 text-xs hover:border-sky-300 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900">{t.title}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[9.5px] font-bold ${t.tagTone}`}>
                      {t.tag}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10.5px]">
                    <span className="font-mono text-slate-500">Case: {t.caseNo}</span>
                    <span className={`font-bold ${t.dueTone}`}>{t.due} ›</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SLA Escalations (P) Semi-Circle Gauge */}
          <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-200/80">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">SLA Escalations (P)</h3>
              <button
                onClick={() => onNavigateTab("RULES_AND_AUDIT")}
                className="text-xs font-bold text-sky-600 hover:underline"
              >
                View All
              </button>
            </div>

            <div className="my-2 text-center">
              <svg viewBox="0 0 100 55" className="w-36 mx-auto">
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="10"
                  strokeDasharray="126"
                  strokeDashoffset={Math.max(0, 126 - Math.min(126, (pScore / 120) * 126))}
                  strokeLinecap="round"
                />
              </svg>
              <div className="-mt-6">
                <div className="text-xl font-black text-slate-900">P = {pScore}</div>
                <div className="text-xs font-extrabold text-rose-600">Critical</div>
              </div>
            </div>

            <div className="mt-2 space-y-1 text-[11px] border-t border-slate-100 pt-2">
              {[
                ["0–49", "Normal", 420, "bg-emerald-500"],
                ["50–79", "Watch", 186, "bg-amber-400"],
                ["80–100", "Critical", 28, "bg-orange-500"],
                ["100+", "Breach", 14, "bg-rose-900"],
              ].map(([rng, lbl, cnt, dot], i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                    <span className={`h-2 w-2 rounded-full ${dot}`} /> {rng} &nbsp;{lbl}
                  </span>
                  <span className="font-mono font-bold text-slate-900">{cnt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Assistant (Niyantran AI) Beta */}
          <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-200/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-sky-600" />
                <h3 className="text-xs font-extrabold text-slate-900">AI Assistant (Niyantran AI)</h3>
              </div>
              <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[9.5px] font-bold text-purple-700">
                Beta
              </span>
            </div>

            {aiResponse && (
              <div className="mt-2 rounded-lg bg-slate-50 border border-slate-100 p-2 text-[11px] text-slate-700">
                {aiResponse}
              </div>
            )}

            <div className="mt-2 flex gap-1.5">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onAskAi()}
                placeholder="Ask about case status, SLA, compliance rules..."
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px]"
              />
              <button
                onClick={() => onAskAi()}
                className="rounded-lg bg-sky-600 hover:bg-sky-500 px-2.5 py-1.5 text-white font-bold"
              >
                ›
              </button>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {[
                "Why is case on hold?",
                "Show pending compliance",
                "• Generate e-Brief",
                "• Explain priority score",
              ].map((chip) => (
                <button
                  key={chip}
                  onClick={() => onAskAi(chip)}
                  className="rounded-full bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2.5 py-0.5 text-[10px] font-semibold text-sky-700 transition"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Strip: Real-Time Alerts & Notifications (Matches Image 1) */}
      <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-200/80">
        <h3 className="text-sm font-extrabold text-slate-900 mb-3">
          Real-Time Alerts & Notifications
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 text-xs">
          {[
            {
              title: "4 Applications pending beyond SLA",
              sub: "Requires immediate escalation",
              time: "5 hours ago",
              tone: "border-rose-200 bg-rose-50/50 text-rose-700",
              badge: "!",
            },
            {
              title: "3 Lease documents expiring in 30 days",
              sub: "Post-approval compliance monitoring",
              time: "2 hours ago",
              tone: "border-amber-200 bg-amber-50/50 text-amber-700",
              badge: "⏳",
            },
            {
              title: "EVC visit scheduled tomorrow",
              sub: "2 institutions, WRO/NRO jurisdiction",
              time: "1 day ago",
              tone: "border-sky-200 bg-sky-50/50 text-sky-700",
              badge: "📅",
            },
            {
              title: "SAC meeting on 30 Aug 2026",
              sub: "8 cases in agenda · e-Briefs ready",
              time: "1 day ago",
              tone: "border-purple-200 bg-purple-50/50 text-purple-700",
              badge: "🏛️",
            },
          ].map((card, i) => (
            <div
              key={i}
              onClick={() => onNavigateTab(i === 1 ? "COMPLIANCE_VAULT" : i === 2 ? "EVC_QUEUE" : "COMMITTEES")}
              className={`rounded-xl border ${card.tone} p-3 flex items-start gap-3 cursor-pointer hover:shadow-xs transition`}
            >
              <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center font-bold shadow-2xs shrink-0">
                {card.badge}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-slate-900 flex items-center justify-between">
                  <span className="truncate">{card.title}</span>
                  <span>›</span>
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5">{card.sub}</div>
                <div className="text-[10px] text-slate-400 mt-1">{card.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ==================== SCREEN 3: EXACT MY TASKS VIEW (Matches Image 3) ==================== */
export const MyTasksView: React.FC<{
  allCases: CaseSummaryItem[];
  caseDetail: any;
  onSelectCase: (id: number, targetTab?: string) => void;
  onAdvanceStage: (payload: any) => Promise<void>;
  onRevertStage: (payload: any) => Promise<void>;
  onOpenEbrief: () => Promise<void>;
  onNavigateTab: (tab: string) => void;
}> = ({
  allCases,
  caseDetail,
  onSelectCase,
  onAdvanceStage,
  onRevertStage,
  onOpenEbrief,
  onNavigateTab,
}) => {
  const [activeBucket, setActiveBucket] = useState("ALL");
  const activeApp = caseDetail?.application || allCases[0];

  const taskRows = [
    {
      id: allCases[0]?.id || 1,
      task: "Review Scrutiny Report",
      appId: "AICTE/WRO/2026/1473",
      inst: "ABC Institute of Technology",
      stage: "Scrutiny",
      stageTone: "bg-amber-100 text-amber-800",
      cat: "New Programme",
      prio: "High",
      prioTone: "bg-rose-100 text-rose-700",
      due: "24 Sep 2026",
      sla: "18 days left",
    },
    {
      id: allCases[1]?.id || 2,
      task: "Verify Undertaking Document",
      appId: "AICTE/WRO/2026/1392",
      inst: "Aryan College of Engineering",
      stage: "EVC",
      stageTone: "bg-purple-100 text-purple-800",
      cat: "Increase in Intake",
      prio: "High",
      prioTone: "bg-rose-100 text-rose-700",
      due: "24 Sep 2026",
      sla: "18 days left",
    },
    {
      id: allCases[2]?.id || 3,
      task: "Assign EVC Slot",
      appId: "AICTE/WRO/2026/1442",
      inst: "Sunrise Technical Campus",
      stage: "EVC",
      stageTone: "bg-purple-100 text-purple-800",
      cat: "New Institute",
      prio: "High",
      prioTone: "bg-rose-100 text-rose-700",
      due: "24 Sep 2026",
      sla: "18 days left",
    },
    {
      id: allCases[3]?.id || 4,
      task: "Review Faculty List Clarification",
      appId: "AICTE/WRO/2026/1521",
      inst: "Greenfield Institute",
      stage: "SAC/SHC",
      stageTone: "bg-rose-100 text-rose-700",
      cat: "Extension of Approval",
      prio: "Medium",
      prioTone: "bg-amber-100 text-amber-800",
      due: "25 Sep 2026",
      sla: "19 days left",
    },
    {
      id: allCases[0]?.id || 1,
      task: "Approve Site Visit Report",
      appId: "AICTE/WRO/2026/1314",
      inst: "Global Tech University",
      stage: "Final Decision",
      stageTone: "bg-emerald-100 text-emerald-800",
      cat: "New Programme",
      prio: "High",
      prioTone: "bg-rose-100 text-rose-700",
      due: "25 Sep 2026",
      sla: "19 days left",
    },
    {
      id: allCases[1]?.id || 2,
      task: "Check Compliance Documents",
      appId: "AICTE/WRO/2026/0987",
      inst: "Eastern College of Engineering",
      stage: "Post-Approval",
      stageTone: "bg-sky-100 text-sky-800",
      cat: "Compliance",
      prio: "Medium",
      prioTone: "bg-amber-100 text-amber-800",
      due: "26 Sep 2026",
      sla: "20 days left",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <CheckSquare className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">My Tasks</h2>
            <p className="text-xs text-slate-500">
              Manage your assigned tasks, deadlines and pending actions
            </p>
          </div>
        </div>
      </div>

      {/* 4 Task KPI Cards + My Performance Ring (Matches Image 3) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center font-bold">
            12
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">12</div>
            <div className="text-xs font-bold text-slate-600">Total Tasks</div>
            <div className="text-[10px] text-slate-400">Assigned to you</div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-rose-200 shadow-2xs flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-black text-rose-600">5</div>
            <div className="text-xs font-bold text-slate-700">Overdue</div>
            <div className="text-[10px] text-slate-400">Needs immediate action</div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-amber-200 shadow-2xs flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">4</div>
            <div className="text-xs font-bold text-slate-700">Due Today</div>
            <div className="text-[10px] text-slate-400">Action required</div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-black text-slate-900">3</div>
            <div className="text-xs font-bold text-slate-700">Upcoming</div>
            <div className="text-[10px] text-slate-400">Next 7 days</div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-extrabold text-slate-700">My Performance</div>
            <div className="text-xl font-black text-emerald-600 mt-0.5">78%</div>
            <div className="text-[10px] text-slate-400">Tasks Completed</div>
          </div>
          <div className="text-[10.5px] space-y-0.5 text-right">
            <div className="text-slate-600">Completed: <strong>28</strong></div>
            <div className="text-slate-600">Pending: <strong>7</strong></div>
            <div className="text-rose-600 font-bold">Overdue: 5</div>
          </div>
        </div>
      </div>

      {/* Tasks Filter Bar + Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap gap-1.5">
            {[
              ["ALL", "All Tasks (12)"],
              ["OVERDUE", "Overdue (5)"],
              ["TODAY", "Due Today (4)"],
              ["UPCOMING", "Upcoming (3)"],
              ["COMPLETED", "Completed (28)"],
            ].map(([k, lbl]) => (
              <button
                key={k}
                onClick={() => setActiveBucket(k)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  activeBucket === k
                    ? "bg-[#0c1b2e] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
          <div className="text-xs text-slate-500 font-semibold">Sort by: Due Date (Earliest) ▾</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10.5px] font-bold uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2.5">#</th>
                <th className="px-3 py-2.5">Task / Action Required</th>
                <th className="px-3 py-2.5">Application ID</th>
                <th className="px-3 py-2.5">Institution Name</th>
                <th className="px-3 py-2.5">Stage</th>
                <th className="px-3 py-2.5">Category</th>
                <th className="px-3 py-2.5">Priority</th>
                <th className="px-3 py-2.5">Due Date</th>
                <th className="px-3 py-2.5">SLA</th>
                <th className="px-3 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {taskRows.map((r, idx) => (
                <tr
                  key={idx}
                  onClick={() => onSelectCase(r.id, "MY_TASKS")}
                  className="hover:bg-sky-50/50 cursor-pointer"
                >
                  <td className="px-3 py-2.5 font-mono text-slate-400">
                    <input type="checkbox" className="mr-2" />
                    {idx + 1}
                  </td>
                  <td className="px-3 py-2.5 font-extrabold text-slate-900">{r.task}</td>
                  <td className="px-3 py-2.5 font-mono font-bold text-sky-700">{r.appId}</td>
                  <td className="px-3 py-2.5 font-semibold text-slate-800">{r.inst}</td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${r.stageTone}`}>
                      {r.stage}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{r.cat}</td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${r.prioTone}`}>
                      {r.prio}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-slate-700">{r.due}</td>
                  <td className="px-3 py-2.5">
                    <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                      {r.sla}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-bold text-sky-600">View ⋮</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom 3-Column Split Matching Image 3: Task Details + Sub-Tasks/Checklist + Related Documents & Actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left 5 Cols: Task Details */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-extrabold uppercase text-slate-700">Task Details</span>
              <button
                onClick={() =>
                  onAdvanceStage({
                    remarks: "Task verified and marked completed from My Tasks workspace.",
                  })
                }
                className="rounded-lg bg-sky-50 border border-sky-200 px-3 py-1 text-xs font-bold text-sky-700 hover:bg-sky-100"
              >
                ✓ Mark as Completed
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900">Review Scrutiny Report</h3>
              <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-700">
                High Priority
              </span>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="grid grid-cols-3">
                <span className="text-slate-500">Application ID</span>
                <span className="col-span-2 font-mono font-bold text-slate-900">
                  {activeApp?.case_number || "AICTE/WRO/2026/1473"}
                </span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-500">Institution</span>
                <span className="col-span-2 font-bold text-slate-900">
                  {activeApp?.institution_name || "ABC Institute of Technology"}
                </span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-500">Current Stage</span>
                <span className="col-span-2">
                  <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    {activeApp?.current_stage || "Scrutiny"}
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-3">
                <span className="text-slate-500">Description</span>
                <span className="col-span-2 text-slate-600 leading-relaxed">
                  Review the scrutiny report submitted by the committee and verify compliance of land, faculty, and lab documents as per AICTE APH norms.
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
            <button
              onClick={() => onNavigateTab("CASE_WORKSPACE")}
              className="rounded-xl bg-[#ea580c] hover:bg-orange-700 px-4 py-2 text-xs font-bold text-white shadow-xs"
            >
              Open Application →
            </button>
            <button
              onClick={() => onNavigateTab("COMPLIANCE_VAULT")}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"
            >
              View Documents (12)
            </button>
          </div>
        </div>

        {/* Center 4 Cols: Sub-Tasks / Checklist + Recent Activity */}
        <div className="space-y-4 lg:col-span-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-extrabold uppercase text-slate-800">Sub-Tasks / Checklist</h4>
              <span className="text-[11px] font-bold text-emerald-700">3 of 5 completed</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden mb-3">
              <div className="h-full w-3/5 bg-emerald-500 rounded-full" />
            </div>
            <div className="space-y-2 text-xs">
              {[
                ["Verify application form", "Completed", true],
                ["Check institution details", "Completed", true],
                ["Validate mandatory documents", "Completed", true],
                ["Review faculty information", "Pending", false],
                ["Add scrutiny remarks", "Pending", false],
              ].map(([lbl, st, done], i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium text-slate-700">
                    <input type="checkbox" defaultChecked={Boolean(done)} />
                    {lbl}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {st as string}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <h4 className="text-xs font-extrabold uppercase text-slate-800 mb-2.5">Recent Activity</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span><strong>Amit Verma</strong> marked task as In Progress</span>
                <span className="text-[10px] text-slate-400">11:24 AM</span>
              </div>
              <div className="flex justify-between">
                <span><strong>System</strong> Scrutiny report uploaded</span>
                <span className="text-[10px] text-slate-400">10:15 AM</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 3 Cols: Related Documents + 6 Quick Actions */}
        <div className="space-y-4 lg:col-span-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <h4 className="text-xs font-extrabold uppercase text-slate-800 mb-2.5">
              Related Documents (12)
            </h4>
            <div className="space-y-2 text-xs">
              {[
                ["Application_Form.pdf", "2.4 MB"],
                ["Land_Documents.pdf", "4.1 MB"],
                ["Faculty_Details.xlsx", "1.2 MB"],
                ["Infrastructure_Report.pdf", "3.5 MB"],
              ].map(([f, sz], i) => (
                <div key={i} className="flex items-center justify-between border-b border-slate-50 pb-1.5">
                  <span className="font-semibold text-slate-700 truncate">{f}</span>
                  <span className="text-[10px] text-slate-400">{sz} ⬇</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <h4 className="text-xs font-extrabold uppercase text-slate-800 mb-2.5">Actions</h4>
            <div className="grid grid-cols-3 gap-2 text-center text-[10.5px] font-bold">
              <button
                onClick={() =>
                  onAdvanceStage({
                    remarks: "Scrutiny verified and forwarded to EVC queue.",
                  })
                }
                className="rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 p-2.5 text-emerald-800"
              >
                Forward to EVC
              </button>
              <button
                onClick={() =>
                  onRevertStage({
                    deficiency_code: "DEF_FACULTY_SHORTFALL",
                    officer_observations: "Clarification requested on faculty cadre ratio.",
                  })
                }
                className="rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 p-2.5 text-purple-800"
              >
                Request Clarification
              </button>
              <button
                onClick={() => onNavigateTab("EVC_QUEUE")}
                className="rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 p-2.5 text-amber-900"
              >
                Assign EVC
              </button>
              <button
                onClick={() => onNavigateTab("COMPLIANCE_VAULT")}
                className="rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 p-2.5 text-sky-800"
              >
                Set Reminder
              </button>
              <button
                onClick={() => onNavigateTab("RULES_AND_AUDIT")}
                className="rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 p-2.5 text-rose-800"
              >
                Escalate
              </button>
              <button
                onClick={onOpenEbrief}
                className="rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 p-2.5 text-slate-800"
              >
                Print / e-Brief
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};