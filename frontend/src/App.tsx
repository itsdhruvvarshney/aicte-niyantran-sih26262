import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Bell,
  BookOpen,
  Bot,
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FastForward,
  FileCheck2,
  FileText,
  Filter,
  GitBranch,
  Landmark,
  LayoutDashboard,
  MapPin,
  PlusCircle,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { api, CaseSummaryItem, DemoUser } from "./api";
import {
  CaseIntelligenceWorkspace,
  CitationEbriefModal,
  NewApplicationModal,
} from "./components/CaseWorkspaceAndModals";
import {
  ComplianceAndLeaseVault,
  EvcQueueBoard,
  RuleSimulatorAndAuditStudio,
} from "./components/ComplianceAndRuleStudio";

const ROLE_LABELS: Record<string, string> = {
  INSTITUTION: "Institution Nodal Officer",
  SCRUTINY_OFFICER: "Scrutiny Officer",
  EVC_COMMITTEE: "EVC Committee Chair",
  SAC_SHC_COMMITTEE: "SAC / SHC Appellate Member",
  REGIONAL_OFFICER: "Regional Officer",
  COMPETENT_AUTHORITY: "Competent Authority (HQ)",
  BUREAU_ADMIN: "Regulation Bureau Director",
};

export default function App() {
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);
  const [activeTab, setActiveTab] = useState<string>("CONTROL_TOWER");

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<number | null>(null);
  const [caseDetail, setCaseDetail] = useState<any>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [taskFilter, setTaskFilter] = useState<"ALL" | "OVERDUE" | "DUE_SOON">("ALL");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState<string>(
    "Namaste! I am Niyantran AI (Rule-Grounded Assistant). Click any quick chip below or ask about case blockers, SLA priority score P, or pending compliance."
  );

  const [ebriefData, setEbriefData] = useState<any>(null);
  const [isNewCaseOpen, setIsNewCaseOpen] = useState(false);
  const [rulesList, setRulesList] = useState<any[]>([]);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [auditLedger, setAuditLedger] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    api
      .getDemoUsers()
      .then(async (users) => {
        setDemoUsers(users);
        const defaultRo = users.find((u) => u.role === "REGIONAL_OFFICER") || users[0];
        if (defaultRo) {
          await handleSwitchRole(defaultRo.email);
        }
      })
      .catch((err) => setErrorMessage(err.message));
  }, []);

  const handleSwitchRole = async (email: string) => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await api.quickLogin(email);
      api.setToken(res.access_token);
      setCurrentUser(res.user);
      await loadDashboard(selectedCaseId);
      await loadRulesAndAudit();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async (preferredCaseId?: number | null) => {
    const data = await api.getDashboardOverview("ALL", "ALL");
    setDashboardData(data);
    const cases: CaseSummaryItem[] = data.cases || [];
    if (cases.length > 0) {
      const targetId =
        preferredCaseId && cases.some((c) => c.id === preferredCaseId)
          ? preferredCaseId
          : cases[0].id;
      setSelectedCaseId(targetId);
      const detail = await api.getApplicationDetail(targetId);
      setCaseDetail(detail);
    }
  };

  const loadRulesAndAudit = async () => {
    try {
      const [rules, audit] = await Promise.all([api.getRules(), api.getAuditLedger()]);
      setRulesList(rules);
      setAuditLedger(audit);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectCase = async (id: number, targetTab = "CASE_WORKSPACE") => {
    setSelectedCaseId(id);
    try {
      setLoading(true);
      const detail = await api.getApplicationDetail(id);
      setCaseDetail(detail);
      setActiveTab(targetTab);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeTravel = async (deltaDays?: number, reset = false) => {
    try {
      setLoading(true);
      setErrorMessage(null);
      await api.timeTravel({ delta_days: deltaDays, reset_to_zero: reset });
      await loadDashboard(selectedCaseId);
      await loadRulesAndAudit();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceStage = async (payload: any) => {
    if (!selectedCaseId) return;
    try {
      setLoading(true);
      setErrorMessage(null);
      await api.advanceStage(selectedCaseId, payload);
      await loadDashboard(selectedCaseId);
      await loadRulesAndAudit();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevertStage = async (payload: any) => {
    if (!selectedCaseId) return;
    try {
      setLoading(true);
      setErrorMessage(null);
      await api.revertStage(selectedCaseId, payload);
      await loadDashboard(selectedCaseId);
      await loadRulesAndAudit();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitClarification = async (text: string) => {
    if (!selectedCaseId) return;
    try {
      setLoading(true);
      setErrorMessage(null);
      await api.submitClarification(selectedCaseId, text);
      await loadDashboard(selectedCaseId);
      await loadRulesAndAudit();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadEvidence = async (obligationId: number, payload: any) => {
    try {
      setLoading(true);
      setErrorMessage(null);
      await api.uploadEvidence(obligationId, payload);
      await loadDashboard(selectedCaseId);
      await loadRulesAndAudit();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEvidence = async (obligationId: number, payload: any) => {
    try {
      setLoading(true);
      setErrorMessage(null);
      await api.verifyEvidence(obligationId, payload);
      await loadDashboard(selectedCaseId);
      await loadRulesAndAudit();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleEvc = async (appId: number, payload: any) => {
    try {
      setLoading(true);
      setErrorMessage(null);
      await api.scheduleEvc(appId, payload);
      await loadDashboard(appId);
      await loadRulesAndAudit();
      setActiveTab("CASE_WORKSPACE");
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const allCases: CaseSummaryItem[] = dashboardData?.cases || [];
  const filteredCases = useMemo(() => {
    return allCases.filter((c) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        c.case_number.toLowerCase().includes(q) ||
        c.institution_name.toLowerCase().includes(q) ||
        c.current_stage.toLowerCase().includes(q) ||
        c.jurisdiction_code.toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (taskFilter === "OVERDUE") return c.priority.risk_band === "CRITICAL_OVERDUE";
      if (taskFilter === "DUE_SOON") return c.priority.hours_remaining <= 72;
      return true;
    });
  }, [allCases, searchQuery, taskFilter]);

  const unackedAlerts = (dashboardData?.alerts || []).filter((a: any) => !a.is_acknowledged);
  const topPriorityCase = allCases[0];

  // Rule-Grounded Niyantran AI Assistant Handler (Deterministic, Zero Hallucination)
  const handleAskNiyantranAi = async (chipQuery?: string) => {
    const q = (chipQuery || aiPrompt).trim().toLowerCase();
    const activeCase = caseDetail?.application;
    const blocker = caseDetail?.blocker_diagnosis;
    const p = caseDetail?.priority;

    if (!activeCase) {
      setAiResponse("Please select a case first so I can inspect its rule graph.");
      return;
    }

    if (q.includes("hold") || q.includes("block") || q.includes("why")) {
      setAiResponse(
        `[${activeCase.case_number}] Blocker Diagnosis: ${blocker.headline}. ${blocker.explanation} Next action owner: ${blocker.owner_role} under ${blocker.rule_citation}.`
      );
    } else if (q.includes("compliance") || q.includes("lease") || q.includes("undertaking")) {
      const postObs = (caseDetail?.obligations || []).filter(
        (o: any) => o.obligation_type !== "WORKFLOW_STAGE"
      );
      const summary = postObs
        .map((o: any) => `${o.stage_code} [${o.state}] (Due: ${o.due_at?.slice(0, 10)})`)
        .join(" | ");
      setAiResponse(
        `[${activeCase.case_number}] Post-Approval Obligations: ${summary || "All clear"
        }. Note: Uploaded documents remain in SUBMITTED state until verified by an authorised officer.`
      );
    } else if (q.includes("priority") || q.includes("score") || q.includes("sla")) {
      setAiResponse(
        `[${activeCase.case_number}] Operational Priority Index P = ${p.priority_score} (${p.risk_band}). Computed via P = (0.40*D[${p.D_deadline_proximity}] + 0.35*A[${p.A_stage_ageing}] + 0.25*B[${p.B_dependency_blocking}]) + OverdueBoost(${p.O_overdue_boost}).`
      );
    } else if (q.includes("brief") || q.includes("summary")) {
      const eb = await api.getCitationEbrief(activeCase.id);
      setEbriefData(eb);
      setAiResponse(
        `Opened Citation-Verified Electronic Case Dossier (e-Brief) for ${activeCase.case_number}.`
      );
    } else {
      setAiResponse(
        `[${activeCase.case_number}] Stage: ${activeCase.current_stage} (${activeCase.overall_status}) | Priority P=${p?.priority_score} | Next Owner: ${blocker?.owner_role}. Statutory approvals remain reserved for Competent Authorities.`
      );
    }
    if (!chipQuery) setAiPrompt("");
  };

  const formattedSimDate = dashboardData?.simulated_now_utc
    ? new Date(dashboardData.simulated_now_utc).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
    : "Loading...";

  const sidebarItems = [
    { id: "CONTROL_TOWER", label: "Dashboard", icon: LayoutDashboard },
    { id: "CASE_WORKSPACE", label: "Applications & DAG", icon: FileText },
    { id: "MY_TASKS", label: "My Tasks", icon: CheckSquare, badge: allCases.length },
    { id: "EVC_QUEUE", label: "EVC Management", icon: CalendarClock },
    { id: "COMMITTEES", label: "Committees (SAC/SHC)", icon: Users },
    { id: "COMPLIANCE_VAULT", label: "Compliance & Leases", icon: ShieldCheck },
    { id: "RULES_AND_AUDIT", label: "Audit & Rule Studio", icon: Scale },
  ];

  return (
    <div className="min-h-screen flex bg-[#f1f5f9] text-slate-800 font-sans">
      {/* ==================== LEFT DARK NAVY AICTE SIDEBAR ==================== */}
      <aside className="w-64 bg-[#0b192c] text-white flex flex-col justify-between shrink-0 shadow-2xl z-30">
        <div>
          {/* Top AICTE Branding Header */}
          <div className="p-4 border-b border-slate-800 bg-white text-slate-900 flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 flex items-center justify-center shadow-md shrink-0 border-2 border-amber-200">
              <Award className="h-6 w-6 text-slate-950 stroke-[2.3]" />
            </div>
            <div className="leading-tight">
              <div className="text-lg font-black tracking-tight text-slate-900">AICTE</div>
              <div className="text-[10px] font-semibold text-slate-600">
                All India Council for Technical Education
              </div>
              <div className="text-[9px] text-amber-700 font-bold">Regulation Bureau · GoI</div>
            </div>
          </div>

          {/* Sidebar Navigation Links */}
          <nav className="p-3 space-y-1.5">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${isActive
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25 font-bold"
                      : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isActive ? "bg-white text-orange-600" : "bg-rose-600 text-white"
                        }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Need Help? AI Assistant Card */}
          <div className="mx-3 mt-3 rounded-xl border border-indigo-400/30 bg-gradient-to-br from-slate-800/90 to-indigo-950/80 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Need Help?</div>
                  <div className="text-[10px] text-sky-300">Niyantran AI Assistant</div>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveTab("CONTROL_TOWER");
                  handleAskNiyantranAi("Why is case on hold?");
                }}
                className="rounded-lg bg-sky-500/20 hover:bg-sky-500/30 p-1.5 text-sky-200"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Patriotic Monument & Bharat Sarkar Footer */}
        <div className="relative overflow-hidden border-t border-slate-800 bg-gradient-to-t from-slate-950 via-[#1a2536] to-amber-900/30 p-4 text-center">
          <div className="mx-auto mb-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300">
            <Landmark className="h-5 w-5" />
          </div>
          <div className="text-[11px] font-bold text-amber-200">भारत सरकार</div>
          <div className="text-[10px] font-semibold text-slate-300">Government of India</div>
          <div className="mt-2 pt-2 border-t border-slate-700/70 text-[11px] font-extrabold tracking-wide text-white">
            AICTE-NIYANTRAN
          </div>
          <div className="text-[9px] text-slate-400">v2.0.0 | PS 26262 | SIH 2026</div>
        </div>
      </aside>

      {/* ==================== RIGHT MAIN CONTENT AREA ==================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top White Official Header Bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
          <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-black tracking-tight text-emerald-800">
                  AICTE-NIYANTRAN
                </h1>
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                  PS 26262 · Regulation Bureau
                </span>
              </div>
              <p className="text-xs font-medium text-slate-600">
                Unified Approval & Compliance Control System ·{" "}
                <span className="text-slate-500">
                  Rule-Driven | Dependency-Aware | Tamper-Evident | Human-in-the-Loop
                </span>
              </p>
            </div>

            {/* Global Search Bar */}
            <div className="relative flex-1 max-w-md min-w-[240px]">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search case number, institution, stage, region..."
                className="w-full rounded-full border border-slate-300 bg-slate-50 pl-9 pr-14 py-1.5 text-xs text-slate-800 focus:border-emerald-600 focus:bg-white focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
                Ctrl K
              </span>
            </div>

            {/* Right Controls: Academic Year, Alerts Bell, Active Role Badge */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs">
                <Calendar className="h-4 w-4 text-slate-500" />
                <div>
                  <div className="text-[9px] uppercase text-slate-400 font-bold">Academic Year</div>
                  <div className="font-bold text-slate-800">2026 - 2027</div>
                </div>
              </div>

              <button
                onClick={() => setActiveTab("CONTROL_TOWER")}
                className="relative rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-600 hover:bg-slate-100"
                title="Unacknowledged Escalation Alerts"
              >
                <Bell className="h-4 w-4" />
                {unackedAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white">
                    {unackedAlerts.length}
                  </span>
                )}
              </button>

              {currentUser && (
                <div className="flex items-center gap-2.5 rounded-full border border-slate-200 bg-slate-50 pl-1.5 pr-3 py-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white">
                    {currentUser.role.slice(0, 2)}
                  </div>
                  <div className="text-left leading-tight">
                    <div className="text-xs font-bold text-slate-800">
                      {ROLE_LABELS[currentUser.role] || currentUser.role}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500">
                      Jurisdiction: {currentUser.jurisdiction_code}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SIH Finale Jury Interactive Control Strip: Real JWT Role Switcher + Time-Travel Clock */}
          <div className="bg-[#0f233c] text-white px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-amber-400 mr-1">
                <UserCheck className="h-3.5 w-3.5" />
                Switch JWT Role:
              </span>
              {demoUsers.map((u) => {
                const active = currentUser?.email === u.email;
                return (
                  <button
                    key={u.id}
                    onClick={() => handleSwitchRole(u.email)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${active
                        ? "bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-bold shadow"
                        : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                      }`}
                  >
                    {ROLE_LABELS[u.role] || u.role} [{u.jurisdiction_code}]
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-lg bg-slate-900/90 border border-slate-700 px-2.5 py-1">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[11px] text-slate-300">Clock:</span>
                <span className="font-mono text-[11px] font-bold text-white">
                  {dashboardData?.simulated_now_utc?.slice(0, 10)}
                </span>
                {(dashboardData?.clock_offset_days || 0) > 0 && (
                  <span className="rounded bg-amber-500 px-1.5 py-0.2 text-[10px] font-extrabold text-slate-950">
                    +{dashboardData.clock_offset_days}d
                  </span>
                )}
                {[7, 15, 30, 90].map((d) => (
                  <button
                    key={d}
                    onClick={() => handleTimeTravel(d, false)}
                    className="rounded bg-indigo-600 hover:bg-indigo-500 px-2 py-0.5 text-[10px] font-bold text-white transition"
                  >
                    +{d}d
                  </button>
                ))}
                <button
                  onClick={() => handleTimeTravel(0, true)}
                  className="rounded bg-slate-700 hover:bg-slate-600 px-2 py-0.5 text-[10px] text-slate-200"
                >
                  Reset
                </button>
              </div>

              <button
                onClick={() => setIsNewCaseOpen(true)}
                className="flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1 text-[11px] font-bold text-white shadow"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                + New Application
              </button>
            </div>
          </div>
        </header>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="bg-rose-600 text-white px-6 py-2.5 text-xs font-bold flex items-center justify-between shadow">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="rounded bg-rose-800 px-2.5 py-0.5 text-[11px]"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ==================== MAIN WORKSPACE CANVAS ==================== */}
        <main className="p-6 space-y-6 max-w-[1600px] w-full mx-auto">
          {/* ==================== SCREEN 1: EXECUTIVE CONTROL TOWER DASHBOARD ==================== */}
          {activeTab === "CONTROL_TOWER" && dashboardData && (
            <div className="space-y-6">
              {/* Patriotic Tricolor & Monument Welcome Hero Banner */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0b192c] via-[#1e3a5f] to-[#0f4c3a] text-white p-6 shadow-lg border border-slate-300">
                <div className="absolute top-0 right-0 h-2 w-full bg-gradient-to-r from-orange-500 via-white to-emerald-600 opacity-90" />
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-amber-300">
                      Welcome back,
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white mt-0.5">
                      {ROLE_LABELS[currentUser?.role || "REGIONAL_OFFICER"]}
                    </h2>
                    <p className="text-xs text-slate-200 mt-1">
                      Jurisdiction: <strong>{currentUser?.jurisdiction_code}</strong> |{" "}
                      {formattedSimDate}
                    </p>
                    <p className="text-xs text-amber-200/90 mt-1 font-medium">
                      Driving Transparent, Timely and Compliant Technical Education Approvals under APH 2024–27
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-950/45 backdrop-blur-md border border-white/15 px-5 py-3 max-w-md">
                    <p className="text-xs italic font-medium text-amber-100">
                      "From Application to Approval to Post-Approval Compliance — One Unified Rule-Driven Control System"
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-emerald-300 font-semibold">
                      <ShieldCheck className="h-4 w-4" />
                      Statutory Decisions Locked to Competent Authorities
                    </div>
                  </div>
                </div>
              </div>

              {/* 5 White KPI Summary Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200/90 flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500">Total Applications</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-900">
                        {dashboardData.analytics.total_applications}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-600">↑ Active</span>
                    </div>
                    <div className="text-[11px] text-slate-400">This Academic Year</div>
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200/90 flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500">Pending at Your End</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-900">
                        {allCases.filter((c) => c.overall_status === "IN_PROGRESS").length}
                      </span>
                      <span className="text-[11px] font-bold text-amber-600">Action Due</span>
                    </div>
                    <div className="text-[11px] text-slate-400">Require Verification</div>
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200/90 flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500">EVC Queue & Visits</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-900">
                        {allCases.filter((c) => c.evc_queue_status !== "NOT_APPLICABLE").length}
                      </span>
                      <span className="text-[11px] font-bold text-purple-600">Tracked</span>
                    </div>
                    <div className="text-[11px] text-slate-400">Scrutiny + EVC / Only EVC</div>
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200/90 flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500">Post-Approval Compliance</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-900">
                        {allCases.filter((c) => c.overall_status === "CONDITIONAL_APPROVED").length}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-600">5-State Vault</span>
                    </div>
                    <div className="text-[11px] text-slate-400">Undertakings & Leases</div>
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-4 shadow-sm border border-rose-200 flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500">Overdue / Escalated</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-rose-600">
                        {unackedAlerts.length}
                      </span>
                      <span className="text-[11px] font-bold text-rose-600">L1/L2/L3</span>
                    </div>
                    <div className="text-[11px] text-slate-400">Require Immediate Attention</div>
                  </div>
                </div>
              </div>

              {/* Main 3-Column Dashboard Grid (Matches Reference Image 1) */}
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                {/* LEFT + CENTER AREA (8 Cols) */}
                <div className="space-y-6 xl:col-span-8">
                  {/* 6-Stage Application Lifecycle Overview */}
                  <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900">
                          Application Lifecycle Overview
                        </h3>
                        <p className="text-xs text-slate-500">
                          Track the complete journey from submission to post-approval compliance
                        </p>
                      </div>
                      <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        APH 2024–2027 Live Telemetry
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                      {[
                        {
                          label: "Submission",
                          count: allCases.length,
                          sub: "Total Routed",
                          color: "bg-sky-500",
                          stage: "ALL",
                        },
                        {
                          label: "Scrutiny",
                          count: allCases.filter((c) => c.current_stage === "SCRUTINY").length,
                          sub: "In Progress",
                          color: "bg-amber-500",
                          stage: "SCRUTINY",
                        },
                        {
                          label: "EVC Queue/Visit",
                          count: allCases.filter((c) =>
                            ["EVC_QUEUE", "EVC_VISIT"].includes(c.current_stage)
                          ).length,
                          sub: "Scheduled",
                          color: "bg-purple-500",
                          stage: "EVC_QUEUE",
                        },
                        {
                          label: "SAC / SHC",
                          count: allCases.filter((c) => c.current_stage === "SAC_SHC").length,
                          sub: "Under Appeal",
                          color: "bg-rose-500",
                          stage: "SAC_SHC",
                        },
                        {
                          label: "Final Decision",
                          count: allCases.filter((c) => c.current_stage === "COMPETENT_AUTHORITY")
                            .length,
                          sub: "Authority Gate",
                          color: "bg-emerald-500",
                          stage: "COMPETENT_AUTHORITY",
                        },
                        {
                          label: "Post-Approval",
                          count: allCases.filter((c) => c.overall_status === "CONDITIONAL_APPROVED")
                            .length,
                          sub: "Under Monitoring",
                          color: "bg-teal-600",
                          stage: "POST",
                        },
                      ].map((node, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-center hover:border-slate-300 transition"
                        >
                          <div
                            className={`mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full ${node.color} text-white font-bold text-xs shadow`}
                          >
                            0{idx + 1}
                          </div>
                          <div className="text-xs font-bold text-slate-700">{node.label}</div>
                          <div className="text-xl font-black text-slate-900 mt-0.5">
                            {node.count}
                          </div>
                          <div className="text-[10px] text-slate-400">{node.sub}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Row 2: Applications by Route Type (Donut) + "Why Is Backlog Growing?" 6-Bucket Chart */}
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Applications by APH Route Type Donut */}
                    <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
                      <h3 className="text-sm font-extrabold text-slate-900">
                        Applications by Route Type (APH 2024–27)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Dynamic workflow routing under PS 26262 Section A
                      </p>

                      <div className="mt-4 flex items-center gap-5">
                        <div className="relative h-32 w-32 shrink-0 flex items-center justify-center">
                          <svg viewBox="0 0 36 36" className="h-32 w-32 -rotate-90">
                            <circle
                              cx="18"
                              cy="18"
                              r="15.9"
                              fill="transparent"
                              stroke="#e2e8f0"
                              strokeWidth="4.2"
                            />
                            <circle
                              cx="18"
                              cy="18"
                              r="15.9"
                              fill="transparent"
                              stroke="#0ea5e9"
                              strokeWidth="4.2"
                              strokeDasharray="35 65"
                              strokeDashoffset="0"
                            />
                            <circle
                              cx="18"
                              cy="18"
                              r="15.9"
                              fill="transparent"
                              stroke="#10b981"
                              strokeWidth="4.2"
                              strokeDasharray="30 70"
                              strokeDashoffset="-35"
                            />
                            <circle
                              cx="18"
                              cy="18"
                              r="15.9"
                              fill="transparent"
                              stroke="#f43f5e"
                              strokeWidth="4.2"
                              strokeDasharray="20 80"
                              strokeDashoffset="-65"
                            />
                            <circle
                              cx="18"
                              cy="18"
                              r="15.9"
                              fill="transparent"
                              stroke="#8b5cf6"
                              strokeWidth="4.2"
                              strokeDasharray="15 85"
                              strokeDashoffset="-85"
                            />
                          </svg>
                          <div className="absolute text-center">
                            <div className="text-xl font-black text-slate-900">
                              {allCases.length}
                            </div>
                            <div className="text-[9px] font-semibold text-slate-400">
                              Active Cases
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 space-y-2 text-xs">
                          {[
                            {
                              label: "Scrutiny + EVC",
                              code: "SCRUTINY_PLUS_EVC",
                              dot: "bg-emerald-500",
                            },
                            {
                              label: "Only Scrutiny (EoA)",
                              code: "ONLY_SCRUTINY",
                              dot: "bg-sky-500",
                            },
                            {
                              label: "EVC + SAC/SHC",
                              code: "EVC_PLUS_SAC_SHC",
                              dot: "bg-rose-500",
                            },
                            {
                              label: "Only EVC (Direct)",
                              code: "ONLY_EVC",
                              dot: "bg-purple-500",
                            },
                          ].map((rt) => {
                            const cnt = allCases.filter(
                              (c) => c.route_pattern === rt.code
                            ).length;
                            return (
                              <div
                                key={rt.code}
                                className="flex items-center justify-between border-b border-slate-100 pb-1"
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`h-2.5 w-2.5 rounded-full ${rt.dot}`} />
                                  <span className="font-semibold text-slate-700">
                                    {rt.label}
                                  </span>
                                </div>
                                <span className="font-mono font-bold text-slate-900">
                                  {cnt} Cases
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* "Why Is the Backlog Growing?" 6-Bucket Root-Cause Analytics */}
                    <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900">
                            Why Is Backlog Growing? (Root-Cause View)
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Separates Officer Pendency from Institution Clarification Delays
                          </p>
                        </div>
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                      </div>

                      <div className="mt-3 space-y-2">
                        {Object.entries(
                          dashboardData.analytics.backlog_root_causes_6_buckets || {}
                        ).map(([bucket, count]: [string, any]) => {
                          const pct = Math.min(
                            100,
                            Math.round(
                              (Number(count) / Math.max(1, allCases.length)) * 100
                            )
                          );
                          return (
                            <div key={bucket} className="text-xs">
                              <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-0.5">
                                <span>{bucket.replace(/_/g, " ")}</span>
                                <span className="font-mono font-bold text-slate-900">
                                  {count} ({pct}%)
                                </span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-600"
                                  style={{ width: `${Math.max(8, pct)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Recent Applications Table */}
                  <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900">
                          Active Approval & Compliance Applications Queue
                        </h3>
                        <p className="text-xs text-slate-500">
                          Click any application row to open its Dependency DAG, Checklist & Action Console
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab("CASE_WORKSPACE")}
                        className="text-xs font-bold text-sky-600 hover:underline"
                      >
                        Open Case Workspace →
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                          <tr>
                            <th className="px-3 py-2.5">Case Number</th>
                            <th className="px-3 py-2.5">Institution Name</th>
                            <th className="px-3 py-2.5">APH Route</th>
                            <th className="px-3 py-2.5">Current Stage</th>
                            <th className="px-3 py-2.5">Priority Index (P)</th>
                            <th className="px-3 py-2.5">Status</th>
                            <th className="px-3 py-2.5">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredCases.map((c) => (
                            <tr
                              key={c.id}
                              className="hover:bg-sky-50/50 transition cursor-pointer"
                              onClick={() => handleSelectCase(c.id)}
                            >
                              <td className="px-3 py-3 font-mono font-bold text-sky-700">
                                {c.case_number}
                              </td>
                              <td className="px-3 py-3">
                                <div className="font-bold text-slate-900">
                                  {c.institution_name}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {c.programme_name}
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700">
                                  {c.route_pattern}
                                </span>
                              </td>
                              <td className="px-3 py-3 font-semibold text-slate-800">
                                {c.current_stage}
                              </td>
                              <td className="px-3 py-3">
                                <span
                                  className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-extrabold ${c.priority.risk_band === "CRITICAL_OVERDUE"
                                      ? "bg-rose-100 text-rose-700 border border-rose-300"
                                      : c.priority.risk_band === "AT_RISK_APPROACHING"
                                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                                        : "bg-emerald-100 text-emerald-700"
                                    }`}
                                >
                                  P = {c.priority.priority_score}
                                </span>
                              </td>
                              <td className="px-3 py-3">
                                <span
                                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${c.overall_status === "REVERTED_DEFICIENT"
                                      ? "bg-rose-100 text-rose-700"
                                      : c.overall_status === "CONDITIONAL_APPROVED"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-amber-100 text-amber-800"
                                    }`}
                                >
                                  {c.overall_status}
                                </span>
                              </td>
                              <td className="px-3 py-3">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectCase(c.id);
                                  }}
                                  className="rounded-lg bg-sky-600 hover:bg-sky-500 px-2.5 py-1 text-[11px] font-bold text-white"
                                >
                                  View →
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN (4 Cols): Regional Distribution + Compliance + Priority Queue + SLA Gauge + AI Assistant */}
                <div className="space-y-6 xl:col-span-4">
                  {/* India - 8 Regional Offices Distribution + Compliance Monitoring Split */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                        India · 8 Regional Offices
                      </h3>
                      <div className="mt-3 space-y-1.5 text-xs">
                        {["NRO", "NWRO", "WRO", "SWRO", "SCRO", "SRO", "ERO", "CRO"].map(
                          (reg, i) => {
                            const rStat =
                              dashboardData.analytics.region_wise_summary?.[reg] || {
                                total: 0,
                                overdue: 0,
                              };
                            const colors = [
                              "bg-sky-500",
                              "bg-amber-500",
                              "bg-rose-500",
                              "bg-emerald-500",
                              "bg-purple-500",
                              "bg-indigo-500",
                              "bg-teal-500",
                              "bg-orange-500",
                            ];
                            return (
                              <div
                                key={reg}
                                className="flex items-center justify-between border-b border-slate-100 pb-1"
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`h-2 w-2 rounded-full ${colors[i % colors.length]}`}
                                  />
                                  <span className="font-bold text-slate-700">{reg}</span>
                                </div>
                                <span className="font-mono text-[11px] font-bold text-slate-900">
                                  {rStat.total} ({rStat.overdue} Overdue)
                                </span>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>

                    {/* Compliance & Document Validity Card */}
                    <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                          Compliance Vault
                        </h3>
                        <button
                          onClick={() => setActiveTab("COMPLIANCE_VAULT")}
                          className="text-[11px] font-bold text-sky-600 hover:underline"
                        >
                          Open Vault
                        </button>
                      </div>
                      <div className="mt-3 space-y-2.5 text-xs">
                        {[
                          {
                            title: "Lease Deeds Tracked",
                            sub: "T-90/60/30/7d Alerts",
                            badge: "Active",
                            tone: "bg-amber-100 text-amber-800",
                          },
                          {
                            title: "Fire Safety NOCs",
                            sub: "Validity Monitoring",
                            badge: "Tracked",
                            tone: "bg-rose-100 text-rose-700",
                          },
                          {
                            title: "PhD Undertakings",
                            sub: "Time-Bound Conditions",
                            badge: "5-State",
                            tone: "bg-emerald-100 text-emerald-700",
                          },
                          {
                            title: "Upload ≠ Verified",
                            sub: "Officer Sign-Off Gate",
                            badge: "Enforced",
                            tone: "bg-sky-100 text-sky-700",
                          },
                        ].map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => setActiveTab("COMPLIANCE_VAULT")}
                            className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-2 cursor-pointer hover:border-slate-300"
                          >
                            <div>
                              <div className="font-bold text-slate-800 text-[11px]">
                                {item.title}
                              </div>
                              <div className="text-[10px] text-slate-500">{item.sub}</div>
                            </div>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${item.tone}`}
                            >
                              {item.badge}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Priority Task Queue + SLA Escalations Semi-Circle Gauge (P) */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Priority Task Queue */}
                    <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                          Priority Task Queue
                        </h3>
                        <button
                          onClick={() => setActiveTab("MY_TASKS")}
                          className="text-[11px] font-bold text-sky-600 hover:underline"
                        >
                          View All
                        </button>
                      </div>
                      <div className="flex gap-1 mb-2.5">
                        {[
                          { id: "ALL", label: `All (${allCases.length})` },
                          {
                            id: "OVERDUE",
                            label: `Overdue (${allCases.filter(
                              (c) => c.priority.risk_band === "CRITICAL_OVERDUE"
                            ).length
                              })`,
                          },
                        ].map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setTaskFilter(t.id as any)}
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${taskFilter === t.id
                                ? "bg-slate-900 text-white"
                                : "bg-slate-100 text-slate-600"
                              }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-2 max-h-52 overflow-y-auto">
                        {filteredCases.slice(0, 4).map((c) => (
                          <div
                            key={c.id}
                            onClick={() => handleSelectCase(c.id)}
                            className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-xs hover:border-sky-400 cursor-pointer transition"
                          >
                            <div className="font-bold text-slate-800 truncate">
                              {c.blocker_headline}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500">
                              Case: {c.case_number}
                            </div>
                            <div className="mt-1 flex items-center justify-between">
                              <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-800">
                                {c.current_stage}
                              </span>
                              <span className="font-mono text-[10px] font-bold text-rose-600">
                                P={c.priority.priority_score} ›
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* SLA Escalations (P) Semi-Circle Gauge */}
                    <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200 flex flex-col justify-between">
                      <div>
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                          SLA Escalations (P)
                        </h3>
                        <p className="text-[10px] text-slate-400">
                          Operational Priority Heuristic
                        </p>
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
                            stroke={
                              (topPriorityCase?.priority.priority_score || 0) > 100
                                ? "#e11d48"
                                : "#f59e0b"
                            }
                            strokeWidth="10"
                            strokeDasharray="126"
                            strokeDashoffset={Math.max(
                              0,
                              126 -
                              Math.min(
                                126,
                                ((topPriorityCase?.priority.priority_score || 60) / 140) *
                                126
                              )
                            )}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="-mt-6">
                          <div className="text-xl font-black text-slate-900">
                            P = {topPriorityCase?.priority.priority_score || 0}
                          </div>
                          <div className="text-[11px] font-bold text-rose-600">
                            {topPriorityCase?.priority.risk_band || "ON_TRACK"}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1 text-[11px] border-t border-slate-100 pt-2">
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1.5 text-slate-600">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" /> 0–49 Normal
                          </span>
                          <span className="font-bold">
                            {allCases.filter((c) => c.priority.priority_score < 50).length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1.5 text-slate-600">
                            <span className="h-2 w-2 rounded-full bg-amber-500" /> 50–99 Watch/Risk
                          </span>
                          <span className="font-bold">
                            {
                              allCases.filter(
                                (c) =>
                                  c.priority.priority_score >= 50 &&
                                  c.priority.priority_score <= 100
                              ).length
                            }
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="flex items-center gap-1.5 text-slate-600">
                            <span className="h-2 w-2 rounded-full bg-rose-600" /> 100+ Breach (O)
                          </span>
                          <span className="font-bold text-rose-600">
                            {allCases.filter((c) => c.priority.priority_score > 100).length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rule-Grounded AI Assistant Widget (Niyantran AI) */}
                  <div className="rounded-2xl bg-white p-4 shadow-sm border border-sky-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-sky-600" />
                        <h3 className="text-xs font-extrabold text-slate-900">
                          AI Assistant (Niyantran AI)
                        </h3>
                      </div>
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                        Rule-Grounded · Read-Only
                      </span>
                    </div>

                    <div className="mt-2.5 rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-700 leading-relaxed">
                      {aiResponse}
                    </div>

                    <div className="mt-2.5 flex gap-1.5">
                      <input
                        type="text"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAskNiyantranAi()}
                        placeholder="Ask about case status, SLA, compliance rules..."
                        className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                      />
                      <button
                        onClick={() => handleAskNiyantranAi()}
                        className="rounded-lg bg-sky-600 hover:bg-sky-500 px-3 py-1.5 text-white"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[
                        "Why is case on hold?",
                        "Show pending compliance",
                        "Generate e-Brief",
                        "Explain priority score",
                      ].map((chip) => (
                        <button
                          key={chip}
                          onClick={() => handleAskNiyantranAi(chip)}
                          className="rounded-full border border-sky-200 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 text-[10px] font-semibold text-sky-700 transition"
                        >
                          • {chip}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Ribbon: Real-Time Alerts & Notifications (Matches Reference Image 1) */}
              <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Real-Time Alerts, Lease Expiry Reminders & Multi-Tier Escalations (Section F)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Backed by PostgreSQL UNIQUE(obligation_id, alert_band) — Zero duplicate alert spam across retries
                    </p>
                  </div>
                  <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">
                    {unackedAlerts.length} Unacknowledged
                  </span>
                </div>

                {dashboardData.alerts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-500">
                    No active escalation alerts yet. Click <strong>+15d</strong> or <strong>+30d</strong> in the top Time-Travel Clock bar to trigger live L1/L2/L3 SLA breaches and Lease Expiry alerts!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                    {dashboardData.alerts.slice(0, 4).map((al: any) => (
                      <div
                        key={al.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 flex flex-col justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="rounded bg-rose-100 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-700">
                              {al.alert_band}
                            </span>
                            <span className="font-mono font-bold text-slate-700">
                              {al.case_number}
                            </span>
                          </div>
                          <p className="mt-2 text-slate-700 font-medium line-clamp-3">
                            {al.explanation_text}
                          </p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500">
                            To: {al.recipient_role}
                          </span>
                          {al.is_acknowledged ? (
                            <span className="text-[10px] font-bold text-emerald-600">
                              ✓ Acknowledged
                            </span>
                          ) : (
                            <button
                              onClick={async () => {
                                await api.acknowledgeAlert(
                                  al.id,
                                  "Acknowledged by officer from Control Tower."
                                );
                                await loadDashboard(selectedCaseId);
                              }}
                              className="rounded bg-slate-900 hover:bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-white"
                            >
                              Acknowledge
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== SCREEN 3: MY TASKS & OFFICER ACTION QUEUE (Matches Reference Image 3) ==================== */}
          {activeTab === "MY_TASKS" && dashboardData && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    My Tasks & Assigned Stage Obligations
                  </h2>
                  <p className="text-xs text-slate-500">
                    Manage your assigned scrutiny reviews, EVC slots, compliance verifications, and SLA deadlines
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-700">SLA Compliance Rate</div>
                    <div className="text-lg font-black text-emerald-600">84% On-Time</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2.5">#</th>
                        <th className="px-3 py-2.5">Task / Required Action</th>
                        <th className="px-3 py-2.5">Application ID</th>
                        <th className="px-3 py-2.5">Institution Name</th>
                        <th className="px-3 py-2.5">Stage</th>
                        <th className="px-3 py-2.5">Owner Role</th>
                        <th className="px-3 py-2.5">Priority (P)</th>
                        <th className="px-3 py-2.5">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allCases.map((c, i) => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="px-3 py-3 font-mono text-slate-500">{i + 1}</td>
                          <td className="px-3 py-3 font-bold text-slate-900">
                            {c.blocker_headline}
                          </td>
                          <td className="px-3 py-3 font-mono font-bold text-sky-700">
                            {c.case_number}
                          </td>
                          <td className="px-3 py-3 font-medium text-slate-800">
                            {c.institution_name}
                          </td>
                          <td className="px-3 py-3">
                            <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                              {c.current_stage}
                            </span>
                          </td>
                          <td className="px-3 py-3 font-mono text-[11px] text-slate-600">
                            {c.next_owner_role}
                          </td>
                          <td className="px-3 py-3 font-mono font-bold text-rose-600">
                            P = {c.priority.priority_score} ({c.priority.risk_band})
                          </td>
                          <td className="px-3 py-3">
                            <button
                              onClick={() => handleSelectCase(c.id, "CASE_WORKSPACE")}
                              className="rounded-lg bg-orange-500 hover:bg-orange-600 px-3 py-1 text-[11px] font-bold text-white"
                            >
                              Execute Task →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================== SCREEN 5: COMMITTEES MANAGEMENT (SAC / SHC / EVC Panels — Matches Reference Image 5) ==================== */}
          {activeTab === "COMMITTEES" && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-gradient-to-r from-[#0b192c] via-[#1f3a60] to-[#2c1f4a] text-white p-6 shadow-lg">
                <h2 className="text-2xl font-black">Committees Management</h2>
                <p className="text-xs text-amber-200 mt-1">
                  SAC (Standing Appellate Committee) | SHC (Standing Hearing Committee) | EVC Panels | Electronic Case Dossiers (e-Briefs)
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {[
                  {
                    code: "SAC",
                    name: "Standing Appellate Committee",
                    desc: "Reviews appeals against scrutiny/EVC deficiencies and conditional approval representations under APH Clause 2.24.",
                    badge: "5 Committees · 248 Cases",
                    tone: "border-amber-300 bg-amber-50/50",
                  },
                  {
                    code: "SHC",
                    name: "Standing Hearing Committee",
                    desc: "Reviews post-approval undertaking breaches, expired lease escalations, and regulatory show-cause proceedings.",
                    badge: "5 Committees · 186 Cases",
                    tone: "border-sky-300 bg-sky-50/50",
                  },
                  {
                    code: "EVC Panels",
                    name: "Expert Visit Committees",
                    desc: "Constitutes online and physical inspection panels to verify campus infrastructure, labs, and faculty norms.",
                    badge: "8 Regional Queues",
                    tone: "border-emerald-300 bg-emerald-50/50",
                  },
                ].map((cm) => (
                  <div
                    key={cm.code}
                    className={`rounded-2xl border ${cm.tone} bg-white p-5 shadow-sm flex flex-col justify-between`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-black text-slate-900">{cm.code}</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                          {cm.badge}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-600 mt-0.5">{cm.name}</div>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">{cm.desc}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                      <button
                        onClick={() => setActiveTab("CASE_WORKSPACE")}
                        className="text-xs font-bold text-sky-700 hover:underline"
                      >
                        Inspect Assigned Cases →
                      </button>
                      {selectedCaseId && (
                        <button
                          onClick={async () => {
                            const eb = await api.getCitationEbrief(selectedCaseId);
                            setEbriefData(eb);
                          }}
                          className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-[11px] font-bold text-white"
                        >
                          Generate Committee e-Brief
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 5-Step Committee Workflow */}
              <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
                <h3 className="text-sm font-extrabold text-slate-900 mb-3">
                  Statutory Committee Deliberation Workflow (Supported by Automated Citation e-Briefs)
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-5 text-xs">
                  {[
                    {
                      step: "1. Agenda Preparation",
                      sub: "Eligible cases queued with auto-compiled Citation e-Brief",
                    },
                    {
                      step: "2. Member Pre-Review",
                      sub: "Committee inspects Scrutiny & EVC observations",
                    },
                    {
                      step: "3. Hearing / Deliberation",
                      sub: "Institution representation recorded with timestamp",
                    },
                    {
                      step: "4. Recommendation",
                      sub: "Human committee signs off speaking order",
                    },
                    {
                      step: "5. Competent Authority",
                      sub: "Final statutory LoA/EoA decision & undertaking spawn",
                    },
                  ].map((s, idx) => (
                    <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="font-bold text-slate-900">{s.step}</div>
                      <div className="text-[11px] text-slate-500 mt-1">{s.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==================== SCREEN 2: APPLICATION LIFECYCLE & DAG WORKSPACE ==================== */}
          {activeTab === "CASE_WORKSPACE" && (
            <div className="rounded-2xl bg-slate-950 p-5 text-slate-100 shadow-xl">
              <CaseIntelligenceWorkspace
                caseDetail={caseDetail}
                currentUserRole={currentUser?.role || "REGIONAL_OFFICER"}
                onAdvanceStage={handleAdvanceStage}
                onRevertStage={handleRevertStage}
                onSubmitClarification={handleSubmitClarification}
                onOpenEbrief={async () => {
                  if (!selectedCaseId) return;
                  const eb = await api.getCitationEbrief(selectedCaseId);
                  setEbriefData(eb);
                }}
                onNavigateTab={setActiveTab}
              />
            </div>
          )}

          {/* ==================== SCREEN 4: EVC MANAGEMENT BOARD ==================== */}
          {activeTab === "EVC_QUEUE" && dashboardData && (
            <div className="rounded-2xl bg-slate-950 p-5 text-slate-100 shadow-xl">
              <EvcQueueBoard
                cases={dashboardData.cases}
                onSelectCase={(id) => handleSelectCase(id, "CASE_WORKSPACE")}
                onScheduleEvc={handleScheduleEvc}
              />
            </div>
          )}

          {/* ==================== SCREEN 6: 5-STATE COMPLIANCE & LEASE VAULT ==================== */}
          {activeTab === "COMPLIANCE_VAULT" && dashboardData && (
            <div className="rounded-2xl bg-slate-950 p-5 text-slate-100 shadow-xl">
              <ComplianceAndLeaseVault
                caseDetail={caseDetail}
                cases={dashboardData.cases}
                selectedCaseId={selectedCaseId || 1}
                onSelectCaseId={async (id) => {
                  setSelectedCaseId(id);
                  const detail = await api.getApplicationDetail(id);
                  setCaseDetail(detail);
                }}
                onUploadEvidence={handleUploadEvidence}
                onVerifyEvidence={handleVerifyEvidence}
              />
            </div>
          )}

          {/* ==================== SCREEN 7: RULE SIMULATOR & SHA-256 AUDIT STUDIO ==================== */}
          {activeTab === "RULES_AND_AUDIT" && (
            <div className="rounded-2xl bg-slate-950 p-5 text-slate-100 shadow-xl">
              <RuleSimulatorAndAuditStudio
                rules={rulesList}
                simulationResult={simulationResult}
                onRunSimulation={async (bId, dId) => {
                  const res = await api.simulateRuleImpact(bId, dId);
                  setSimulationResult(res);
                }}
                onActivateDraft={async (dId) => {
                  await api.activateDraftRule(dId);
                  await loadRulesAndAudit();
                }}
                auditLedger={auditLedger}
                onRefreshAudit={async () => {
                  const audit = await api.getAuditLedger();
                  setAuditLedger(audit);
                }}
                onSimulateTamper={async () => {
                  await api.simulateTamper();
                  const audit = await api.getAuditLedger();
                  setAuditLedger(audit);
                }}
                onRestoreTamper={async () => {
                  await api.restoreTamper();
                  const audit = await api.getAuditLedger();
                  setAuditLedger(audit);
                }}
              />
            </div>
          )}
        </main>
      </div>

      {/* Citation e-Brief Modal */}
      {ebriefData && <CitationEbriefModal ebrief={ebriefData} onClose={() => setEbriefData(null)} />}

      {/* New Application Modal */}
      <NewApplicationModal
        isOpen={isNewCaseOpen}
        onClose={() => setIsNewCaseOpen(false)}
        onCreate={async (payload) => {
          const res = await api.createApplication(payload);
          await loadDashboard(res.id);
          await handleSelectCase(res.id, "CASE_WORKSPACE");
        }}
      />
    </div>
  );
}