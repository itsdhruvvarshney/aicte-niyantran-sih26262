import React, { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Flag,
  FolderOpen,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  MoreVertical,
  Phone,
  RotateCcw,
  Share2,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react";

interface CaseWorkspaceProps {
  caseDetail: any;
  currentUserRole: string;
  onAdvanceStage: (payload: {
    target_stage_code?: string | null;
    remarks: string;
    decision_order_ref?: string | null;
    is_statutory_override?: boolean;
    override_order_ref?: string | null;
  }) => Promise<void>;
  onRevertStage: (payload: { deficiency_code: string; officer_observations: string }) => Promise<void>;
  onSubmitClarification: (clarification_text: string) => Promise<void>;
  onOpenEbrief: () => Promise<void>;
  onNavigateTab: (tab: string) => void;
}

export const CaseIntelligenceWorkspace: React.FC<CaseWorkspaceProps> = ({
  caseDetail,
  currentUserRole,
  onAdvanceStage,
  onRevertStage,
  onSubmitClarification,
  onOpenEbrief,
  onNavigateTab,
}) => {
  const [subTab, setSubTab] = useState("OVERVIEW");
  const [actionPanel, setActionPanel] = useState<"NONE" | "ADVANCE" | "REVERT" | "CLARIFY">("NONE");

  const [remarks, setRemarks] = useState(
    "Verified mandatory documents, land ROR, and faculty norms under APH 2024-27 Table 2.3."
  );
  const [decisionOrderRef, setDecisionOrderRef] = useState("F.No.AICTE/LoA/2026-27/1473");
  const [isOverride, setIsOverride] = useState(false);
  const [overrideRef, setOverrideRef] = useState("");

  const [defCode, setDefCode] = useState("DEF_FACULTY_CADRE_RATIO");
  const [defObs, setDefObs] = useState(
    "Clarification requested on senior professor cadre list and AICTE pay-scale affidavit."
  );
  const [clarificationText, setClarificationText] = useState(
    "Uploaded updated faculty roster with PAN/Aadhaar and bank salary disbursement proof."
  );

  if (!caseDetail) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-xs">
        Select an application from the Dashboard to inspect its complete lifecycle journey.
      </div>
    );
  }

  const { application, rule, priority, blocker_diagnosis, obligations, audit_trail } = caseDetail;
  const workflowStages = (obligations || []).filter((o: any) => o.obligation_type === "WORKFLOW_STAGE");
  const futureUnverifiedStage = workflowStages.find(
    (s: any) => s.stage_code !== application.current_stage && s.state === "REQUIRED"
  );

  // Map status for the 6 exact journey stages in Image 2
  const stageOrder = ["SUBMISSION", "SCRUTINY", "EVC_QUEUE", "SAC_SHC", "COMPETENT_AUTHORITY", "POST_APPROVAL"];
  const currentIdx = Math.max(1, stageOrder.indexOf(application.current_stage));

  const journeySteps = [
    {
      title: "Submission",
      date: "10 Aug 2026",
      status: "Completed",
      circleBg: "bg-emerald-500 text-white border-emerald-100",
      pillBg: "bg-emerald-100 text-emerald-700",
      icon: "✓",
    },
    {
      title: "Scrutiny",
      date: "25 Aug 2026",
      status:
        application.overall_status === "REVERTED_DEFICIENT"
          ? "Deficient"
          : currentIdx > 1
          ? "Completed"
          : "In Progress",
      circleBg:
        application.overall_status === "REVERTED_DEFICIENT"
          ? "bg-rose-500 text-white border-rose-100"
          : currentIdx > 1
          ? "bg-emerald-500 text-white border-emerald-100"
          : "bg-amber-400 text-slate-950 border-amber-100",
      pillBg:
        application.overall_status === "REVERTED_DEFICIENT"
          ? "bg-rose-100 text-rose-700"
          : currentIdx > 1
          ? "bg-emerald-100 text-emerald-700"
          : "bg-amber-100 text-amber-800",
      icon: currentIdx > 1 ? "✓" : "📋",
    },
    {
      title: "EVC",
      date: currentIdx >= 2 ? "Scheduled" : "\u00A0",
      status: currentIdx > 2 ? "Completed" : currentIdx === 2 ? "In Progress" : "Pending",
      circleBg:
        currentIdx > 2
          ? "bg-emerald-500 text-white border-emerald-100"
          : "bg-purple-100 text-purple-700 border-purple-50",
      pillBg: currentIdx === 2 ? "bg-purple-100 text-purple-800" : "bg-slate-100 text-slate-500",
      icon: "👥",
    },
    {
      title: "SAC / SHC",
      date: "\u00A0",
      status: currentIdx === 3 ? "In Progress" : "Pending",
      circleBg: "bg-rose-100 text-rose-600 border-rose-50",
      pillBg: "bg-slate-100 text-slate-500",
      icon: "🏛️",
    },
    {
      title: "Final Decision",
      date: "\u00A0",
      status: application.overall_status.includes("APPROVED") ? "Completed" : "Pending",
      circleBg: application.overall_status.includes("APPROVED")
        ? "bg-emerald-500 text-white border-emerald-100"
        : "bg-sky-100 text-sky-700 border-sky-50",
      pillBg: application.overall_status.includes("APPROVED")
        ? "bg-emerald-100 text-emerald-700"
        : "bg-slate-100 text-slate-500",
      icon: "⚖️",
    },
    {
      title: "Post-Approval Compliance",
      date: "\u00A0",
      status: application.overall_status === "CONDITIONAL_APPROVED" ? "In Progress" : "Pending",
      circleBg: "bg-teal-100 text-teal-700 border-teal-50",
      pillBg:
        application.overall_status === "CONDITIONAL_APPROVED"
          ? "bg-amber-100 text-amber-800"
          : "bg-slate-100 text-slate-500",
      icon: "🛡️",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Breadcrumb Bar with Right Tricolor Banner Accent (Exact Match to Image 2) */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white px-5 py-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-emerald-600/20 via-amber-400/15 to-transparent pointer-events-none" />
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <button
            onClick={() => onNavigateTab("CONTROL_TOWER")}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <span
            onClick={() => onNavigateTab("CONTROL_TOWER")}
            className="cursor-pointer hover:text-slate-900"
          >
            Applications
          </span>
          <span className="text-slate-400">›</span>
          <span className="font-mono font-extrabold text-slate-900">{application.case_number}</span>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2">
          {futureUnverifiedStage && (
            <button
              onClick={() =>
                onAdvanceStage({
                  target_stage_code: futureUnverifiedStage.stage_code,
                  remarks: "Testing premature stage transition guardrail",
                })
              }
              className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-700 transition"
              title="Demonstrate HTTP 409 Conflict guardrail"
            >
              <Lock className="h-3 w-3" />
              Test 409 Guardrail (Jump to {futureUnverifiedStage.stage_code})
            </button>
          )}
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-[10.5px] font-bold text-slate-700">
            {rule.rule_code} v{rule.version_num}
          </span>
        </div>
      </div>

      {/* Institution Header Card (Exact Match to Image 2) */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 items-center">
          {/* Left 5 Cols: Crest + ABC Institute of Technology */}
          <div className="flex items-start gap-4 xl:col-span-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-[#1e3a8a]/20 bg-[#eff6ff] text-[#1e3a8a] shadow-inner">
              <Building2 className="h-8 w-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black text-slate-900">{application.institution_name}</h2>
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> Verified Institution
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
                <span className="font-mono font-bold text-slate-800">{application.case_number}</span>
                <span className="text-slate-300">|</span>
                <span>New Programme</span>
                <span className="text-slate-300">|</span>
                <span>Engineering & Technology</span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-500">
                <span>🛡️ Private Self-Financed</span>
                <span>📍 {application.jurisdiction_code} Jurisdiction</span>
                <span>🏛️ Established: 2008</span>
              </div>
            </div>
          </div>

          {/* Middle 2 Cols: Current Stage Box */}
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-3.5 xl:col-span-2">
            <div className="text-[11px] font-bold text-slate-500">Current Stage</div>
            <div className="mt-1.5 inline-block rounded-lg bg-[#fef3c7] border border-amber-300 px-3.5 py-1 text-xs font-extrabold text-amber-900">
              {application.current_stage === "SCRUTINY" ? "Scrutiny" : application.current_stage}
            </div>
            <div className="mt-1.5 flex items-center gap-1 text-[10.5px] font-medium text-slate-500">
              <Clock className="h-3 w-3 text-amber-600" />
              <span>In Progress · Since 25 Aug 2026</span>
            </div>
          </div>

          {/* Middle 3 Cols: SLA Timeline Box */}
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-3.5 xl:col-span-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>SLA Timeline</span>
              <span className="font-mono text-[11px] text-slate-600">12 / 30 days</span>
            </div>
            <div className="mt-2.5 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  priority.risk_band === "CRITICAL_OVERDUE" ? "bg-rose-600" : "bg-emerald-600"
                }`}
                style={{ width: "45%" }}
              />
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-rose-600">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {priority.days_overdue > 0
                  ? `${priority.days_overdue} days overdue (P=${priority.priority_score})`
                  : "18 days remaining"}
              </span>
            </div>
          </div>

          {/* Right 2 Cols: Share / Actions Buttons + Application Priority */}
          <div className="xl:col-span-2 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-end gap-1.5">
              <button className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50">
                <MoreVertical className="h-4 w-4" />
              </button>
              <button
                onClick={onOpenEbrief}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700"
              >
                <Share2 className="h-3.5 w-3.5" /> Share
              </button>
              <button
                onClick={() => setActionPanel(actionPanel === "NONE" ? "ADVANCE" : "NONE")}
                className="rounded-lg bg-[#0c1b2e] hover:bg-slate-800 px-3 py-1.5 text-xs font-bold text-white shadow-xs"
              >
                Actions ▾
              </button>
            </div>

            <div className="rounded-xl border border-slate-200/90 bg-slate-50/60 px-3 py-2 flex items-center justify-between text-[11px]">
              <div>
                <div className="text-[10px] font-semibold text-slate-400">Application Priority</div>
                <div className="font-bold text-slate-700 flex items-center gap-1">
                  <Flag className="h-3 w-3 text-amber-500" />{" "}
                  {priority.priority_score > 80 ? `High (P=${priority.priority_score})` : "Normal"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-semibold text-slate-400">Category</div>
                <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">
                  New Programme
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Officer Action Drawer (Opens when clicking Actions ▾ or Quick Actions) */}
        {actionPanel !== "NONE" && (
          <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50/60 p-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-200 pb-2.5 mb-3">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActionPanel("ADVANCE")}
                  className={`rounded-lg px-3 py-1 font-bold ${
                    actionPanel === "ADVANCE"
                      ? "bg-emerald-600 text-white"
                      : "bg-white text-slate-700 border border-slate-200"
                  }`}
                >
                  ✓ Verify & Advance Stage ({application.current_stage})
                </button>
                <button
                  onClick={() => setActionPanel("REVERT")}
                  className={`rounded-lg px-3 py-1 font-bold ${
                    actionPanel === "REVERT"
                      ? "bg-rose-600 text-white"
                      : "bg-white text-slate-700 border border-slate-200"
                  }`}
                >
                  ↺ Request Clarification / Revert
                </button>
                <button
                  onClick={() => setActionPanel("CLARIFY")}
                  className={`rounded-lg px-3 py-1 font-bold ${
                    actionPanel === "CLARIFY"
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-slate-700 border border-slate-200"
                  }`}
                >
                  ✉ Submit Institution Clarification
                </button>
              </div>
              <button
                onClick={() => setActionPanel("NONE")}
                className="font-bold text-slate-500 hover:text-slate-800"
              >
                Close ✕
              </button>
            </div>

            {actionPanel === "ADVANCE" && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-12 items-end">
                <div className="md:col-span-6">
                  <label className="block font-bold text-slate-700 mb-1">
                    Verification Remarks (Active JWT Role: {currentUserRole})
                  </label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block font-bold text-slate-700 mb-1">Order Ref</label>
                  <input
                    type="text"
                    value={decisionOrderRef}
                    onChange={(e) => setDecisionOrderRef(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-slate-900"
                  />
                </div>
                <div className="md:col-span-3">
                  <button
                    onClick={async () => {
                      await onAdvanceStage({
                        remarks,
                        decision_order_ref: decisionOrderRef,
                        is_statutory_override: isOverride,
                        override_order_ref: overrideRef,
                      });
                      setActionPanel("NONE");
                    }}
                    className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 py-2 font-bold text-white shadow-xs"
                  >
                    Confirm & Advance Stage
                  </button>
                </div>
              </div>
            )}

            {actionPanel === "REVERT" && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-12 items-end">
                <div className="md:col-span-4">
                  <label className="block font-bold text-rose-800 mb-1">Deficiency Reason Code</label>
                  <input
                    type="text"
                    value={defCode}
                    onChange={(e) => setDefCode(e.target.value)}
                    className="w-full rounded-lg border border-rose-300 bg-white px-3 py-2 font-mono text-slate-900"
                  />
                </div>
                <div className="md:col-span-5">
                  <label className="block font-bold text-rose-800 mb-1">Recorded Observations</label>
                  <input
                    type="text"
                    value={defObs}
                    onChange={(e) => setDefObs(e.target.value)}
                    className="w-full rounded-lg border border-rose-300 bg-white px-3 py-2 text-slate-900"
                  />
                </div>
                <div className="md:col-span-3">
                  <button
                    onClick={async () => {
                      await onRevertStage({ deficiency_code: defCode, officer_observations: defObs });
                      setActionPanel("NONE");
                    }}
                    className="w-full rounded-lg bg-rose-600 hover:bg-rose-500 py-2 font-bold text-white shadow-xs"
                  >
                    Revert Application
                  </button>
                </div>
              </div>
            )}

            {actionPanel === "CLARIFY" && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-12 items-end">
                <div className="md:col-span-9">
                  <label className="block font-bold text-indigo-900 mb-1">
                    Institution Clarification Response (Routes to Re-Scrutiny)
                  </label>
                  <input
                    type="text"
                    value={clarificationText}
                    onChange={(e) => setClarificationText(e.target.value)}
                    className="w-full rounded-lg border border-indigo-300 bg-white px-3 py-2 text-slate-900"
                  />
                </div>
                <div className="md:col-span-3">
                  <button
                    onClick={async () => {
                      await onSubmitClarification(clarificationText);
                      setActionPanel("NONE");
                    }}
                    className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 py-2 font-bold text-white shadow-xs"
                  >
                    Submit Clarification
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main 12-Col Split Matching Image 2: Left 9 Cols + Right 3 Cols */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* LEFT 9 COLUMNS */}
        <div className="space-y-4 xl:col-span-9">
          {/* Application Journey Horizontal Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-xs">
                  <FolderOpen className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Application Journey</h3>
                  <p className="text-xs text-slate-500">
                    Track the complete lifecycle of this application
                  </p>
                </div>
              </div>
              <button
                onClick={onOpenEbrief}
                className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-700"
              >
                View Full Process Map
              </button>
            </div>

            {/* 6 Connected Journey Circles */}
            <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-6 pt-2">
              {journeySteps.map((st, i) => (
                <div key={i} className="relative flex flex-col items-center text-center">
                  <div
                    className={`z-10 flex h-11 w-11 items-center justify-center rounded-full border-4 text-sm font-bold shadow-xs ${st.circleBg}`}
                  >
                    {st.icon}
                  </div>
                  <div className="mt-2 text-xs font-extrabold text-slate-900">{st.title}</div>
                  <div className="text-[10.5px] font-medium text-slate-400">{st.date}</div>
                  <span className={`mt-1.5 rounded-md px-2.5 py-0.5 text-[10px] font-bold ${st.pillBg}`}>
                    {st.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 6 Sub-Navigation Tabs (Overview, Documents (12), Checklists (5/7), Communications (8), Site Visit, History) */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
            {[
              { id: "OVERVIEW", label: "Overview" },
              { id: "DOCUMENTS", label: "Documents (12)" },
              { id: "CHECKLISTS", label: "Checklists (5/7)" },
              { id: "COMMUNICATIONS", label: "Communications (8)" },
              { id: "SITE_VISIT", label: "Site Visit" },
              { id: "HISTORY", label: "History" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setSubTab(t.id)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                  subTab === t.id
                    ? "bg-[#0c1b2e] text-white shadow-xs"
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* 2x2 Content Grid (Exact Match to Image 2) */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* 1. Application Details Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <span className="h-5 w-5 rounded bg-amber-100 text-amber-700 flex items-center justify-center text-xs">
                    📋
                  </span>
                  Application Details
                </h4>
                <button className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                  ✎ Edit/View
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                {[
                  ["Application ID", application.case_number],
                  ["Institution Name", application.institution_name],
                  ["Type of Application", "New Programme"],
                  ["Programme Details", application.programme_name || "B.Tech in Computer Science & Engineering"],
                  ["Intake", "60"],
                  ["Level", "Under Graduate"],
                  ["Mode", "Full Time"],
                  ["Academic Year", "2026 - 2027"],
                  ["Application Date", "10 Aug 2026   Last Updated: 25 Aug 2026, 02:30 PM"],
                  ["Nodal Officer", "Dr. Rajesh Kumar · 📞 +91 98765 43210 · ✉ rajesh@abcd.ac.in"],
                ].map(([label, val], idx) => (
                  <div key={idx} className="grid grid-cols-12 border-b border-slate-50 pb-1.5">
                    <span className="col-span-4 text-slate-500 font-medium">{label}</span>
                    <span className="col-span-8 font-bold text-slate-800">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Progress & Checklist Card (5 of 7 completed | 71%) */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <span className="h-5 w-5 rounded bg-amber-100 text-amber-700 flex items-center justify-center text-xs">
                    ☑️
                  </span>
                  Progress & Checklist
                </h4>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 font-semibold block">5 of 7 completed</span>
                  <span className="text-xs font-black text-slate-900">71%</span>
                </div>
              </div>

              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden mb-4">
                <div className="h-full w-[71%] rounded-full bg-emerald-500" />
              </div>

              <div className="space-y-2.5 text-xs">
                {[
                  ["Application form verification", "Completed", "12 Aug 2026", "DONE"],
                  ["Institution details validation", "Completed", "14 Aug 2026", "DONE"],
                  ["Mandatory documents check", "Completed", "18 Aug 2026", "DONE"],
                  ["Eligibility criteria verification", "In Progress", "25 Aug 2026", "ACTIVE"],
                  ["Academic and faculty details review", "Pending", "-", "PENDING"],
                  ["Infrastructure and facilities review", "Pending", "-", "PENDING"],
                  ["Scrutiny remarks and report preparation", "Pending", "-", "PENDING"],
                ].map(([title, status, dt, mode], i) => (
                  <div key={i} className="flex items-center justify-between border-b border-slate-50 pb-1.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold ${
                          mode === "DONE"
                            ? "bg-emerald-500 text-white"
                            : mode === "ACTIVE"
                            ? "bg-amber-400 text-amber-400"
                            : "border border-slate-300 bg-white"
                        }`}
                      >
                        {mode === "DONE" ? "✓" : ""}
                      </span>
                      <span className="font-semibold text-slate-800">{title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          mode === "DONE"
                            ? "bg-emerald-100 text-emerald-700"
                            : mode === "ACTIVE"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {status}
                      </span>
                      <span className="w-16 text-right font-mono text-[10.5px] text-slate-400">{dt}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Recent Activity Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <span className="h-5 w-5 rounded bg-amber-100 text-amber-700 flex items-center justify-center text-xs">
                    🕒
                  </span>
                  Recent Activity
                </h4>
                <button
                  onClick={() => onNavigateTab("RULES_AND_AUDIT")}
                  className="text-xs font-bold text-slate-500 hover:text-slate-900"
                >
                  View All →
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {[
                  {
                    dt: "25 Aug 2026 02:30 PM",
                    text: "Application marked under scrutiny by Mr. Amit Verma",
                    tag: "Scrutiny",
                    tagTone: "bg-amber-100 text-amber-800",
                    dot: "bg-amber-400",
                  },
                  {
                    dt: "22 Aug 2026 11:15 AM",
                    text: "All mandatory documents verified",
                    tag: "Documents",
                    tagTone: "bg-emerald-100 text-emerald-700",
                    dot: "bg-emerald-500",
                  },
                  {
                    dt: "18 Aug 2026 04:22 PM",
                    text: "Institution details validated successfully",
                    tag: "Verification",
                    tagTone: "bg-emerald-100 text-emerald-700",
                    dot: "bg-emerald-500",
                  },
                  {
                    dt: "14 Aug 2026 10:10 AM",
                    text: "Clarification requested on faculty list",
                    tag: "Query",
                    tagTone: "bg-sky-100 text-sky-700",
                    dot: "bg-rose-500",
                  },
                  {
                    dt: "12 Aug 2026 03:45 PM",
                    text: "Application submitted by institution",
                    tag: "Submission",
                    tagTone: "bg-slate-100 text-slate-600",
                    dot: "bg-sky-500",
                  },
                ].map((act, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 border-b border-slate-50 pb-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`h-3 w-3 rounded-full ${act.dot} shrink-0`} />
                      <span className="font-mono text-[10.5px] text-slate-400 w-32 shrink-0">{act.dt}</span>
                      <span className="font-semibold text-slate-800">{act.text}</span>
                    </div>
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold shrink-0 ${act.tagTone}`}>
                      {act.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Key Documents Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <span className="h-5 w-5 rounded bg-amber-100 text-amber-700 flex items-center justify-center text-xs">
                    📁
                  </span>
                  Key Documents
                </h4>
                <button
                  onClick={() => onNavigateTab("COMPLIANCE_VAULT")}
                  className="text-xs font-bold text-slate-500 hover:text-slate-900"
                >
                  View All (12) →
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                {[
                  ["Application_Form.pdf", "10 Aug 2026 · 2.4 MB", "Verified", "PDF", "bg-emerald-100 text-emerald-700"],
                  ["Land_Documents.pdf", "12 Aug 2026 · 4.1 MB", "Verified", "PDF", "bg-emerald-100 text-emerald-700"],
                  ["Faculty_Details.xlsx", "14 Aug 2026 · 1.2 MB", "Under Review", "XLS", "bg-amber-100 text-amber-800"],
                  ["Infrastructure_Details.pdf", "18 Aug 2026 · 3.5 MB", "Verified", "PDF", "bg-emerald-100 text-emerald-700"],
                  ["Affiliation_Certificate.pdf", "18 Aug 2026 · 2.1 MB", "Pending", "PDF", "bg-slate-100 text-slate-600"],
                ].map(([name, meta, status, ext, pillCls], i) => (
                  <div key={i} className="flex items-center justify-between border-b border-slate-50 pb-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-lg text-[9.5px] font-black text-white ${
                          ext === "XLS" ? "bg-emerald-600" : "bg-rose-600"
                        }`}
                      >
                        {ext}
                      </span>
                      <span className="font-bold text-slate-800">{name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10.5px] text-slate-400">{meta}</span>
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${pillCls}`}>
                        {status}
                      </span>
                      <span className="text-slate-400 cursor-pointer">⋮</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT 3 COLUMNS: Assigned Officers + Important Dates + 6 Quick Actions */}
        <div className="space-y-4 xl:col-span-3">
          {/* Assigned Officers */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <span className="h-5 w-5 rounded bg-amber-100 text-amber-700 flex items-center justify-center text-xs">
                  👤
                </span>
                Assigned Officers
              </h4>
              <span className="text-xs font-bold text-slate-500 cursor-pointer">Manage ›</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-700 text-white font-bold">
                  AV
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900">Mr. Amit Verma</span>
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      Primary
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">Assistant Director (Scrutiny)</div>
                  <div className="mt-1 text-[11px] text-slate-600 truncate">✉ amit.verma@aicte.gov.in</div>
                  <div className="text-[11px] text-slate-600">📞 +91 98765 43210</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white font-bold">
                  PS
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900">Ms. Priya Singh</span>
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      Reviewer
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">Technical Officer</div>
                  <div className="mt-1 text-[11px] text-slate-600 truncate">✉ priya.singh@aicte.gov.in</div>
                  <div className="text-[11px] text-slate-600">📞 +91 98765 43211</div>
                </div>
              </div>
            </div>
          </div>

          {/* Important Dates */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
            <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2.5 mb-3">
              <span className="h-5 w-5 rounded bg-amber-100 text-amber-700 flex items-center justify-center text-xs">
                📅
              </span>
              Important Dates
            </h4>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-semibold text-slate-700">
                  <span className="h-3.5 w-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px]">
                    ✓
                  </span>
                  Application Submission
                </span>
                <span className="font-mono font-bold text-slate-800">10 Aug 2026</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-semibold text-slate-700">
                  <span className="h-3.5 w-3.5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[9px]">
                    !
                  </span>
                  Scrutiny Due Date
                </span>
                <div className="text-right">
                  <span className="font-mono font-bold text-rose-600">24 Sep 2026</span>
                  <span className="ml-1 rounded bg-rose-50 px-1.5 py-0.5 text-[9.5px] font-bold text-rose-600">
                    18 days left
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium text-slate-600">
                  <span className="h-3 w-3 rounded-full bg-slate-300" />
                  EVC Visit (Tentative)
                </span>
                <span className="font-mono font-semibold text-slate-700">10 Oct 2026</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium text-slate-600">
                  <span className="h-3 w-3 rounded-full bg-slate-300" />
                  SAC Meeting (Tentative)
                </span>
                <span className="font-mono font-semibold text-slate-700">25 Oct 2026</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium text-slate-600">
                  <span className="h-3 w-3 rounded-full bg-slate-300" />
                  Final Decision (Tentative)
                </span>
                <span className="font-mono font-semibold text-slate-700">10 Nov 2026</span>
              </div>
            </div>
          </div>

          {/* 6 Quick Actions Grid (Exact Match to Image 2 Bottom-Right) */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
            <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2.5 mb-3">
              <span className="h-5 w-5 rounded bg-amber-100 text-amber-700 flex items-center justify-center text-xs">
                ⚡
              </span>
              Quick Actions
            </h4>

            <div className="grid grid-cols-3 gap-2.5 text-center text-[11px] font-bold">
              <button
                onClick={onOpenEbrief}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-100 p-3 text-slate-800 transition"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white">
                  <FileText className="h-4 w-4" />
                </div>
                <span className="leading-tight">View Application PDF</span>
              </button>

              <button
                onClick={() => onNavigateTab("COMPLIANCE_VAULT")}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 p-3 text-slate-800 transition"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                  <Download className="h-4 w-4" />
                </div>
                <span className="leading-tight">Download All Documents</span>
              </button>

              <button
                onClick={() => setActionPanel("ADVANCE")}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-100 p-3 text-slate-800 transition"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <span className="leading-tight">Add Internal Note</span>
              </button>

              <button
                onClick={() => setActionPanel("REVERT")}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-100 p-3 text-slate-800 transition"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600 text-white">
                  <RotateCcw className="h-4 w-4" />
                </div>
                <span className="leading-tight">Request Clarification</span>
              </button>

              <button
                onClick={() => onNavigateTab("EVC_QUEUE")}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-100 p-3 text-slate-800 transition"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white">
                  <Calendar className="h-4 w-4" />
                </div>
                <span className="leading-tight">Schedule EVC Visit</span>
              </button>

              <button
                onClick={onOpenEbrief}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 p-3 text-slate-800 transition"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <FileCheck className="h-4 w-4" />
                </div>
                <span className="leading-tight">Generate Report</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------- Citation e-Brief Modal -------------------- */
export const CitationEbriefModal: React.FC<{
  ebrief: any;
  onClose: () => void;
}> = ({ ebrief, onClose }) => {
  if (!ebrief) return null;
  const h = ebrief.ebrief_header;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl text-slate-800">
        <div className="flex items-start justify-between border-b border-slate-200 pb-3">
          <div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
              {h.generation_mode} · ZERO HALLUCINATION
            </span>
            <h3 className="mt-1 text-lg font-black text-slate-900">
              Electronic Case Dossier (e-Brief): {h.case_number}
            </h3>
            <p className="text-xs text-slate-500">
              {h.institution_name} ({h.jurisdiction_code}) · Rule: {h.governing_rule} ({h.rule_source_citation})
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg bg-slate-100 p-1.5 text-slate-600 hover:bg-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
            <strong>Regulatory Safeguard Notice:</strong> {h.regulatory_safeguard_notice}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="font-extrabold uppercase text-sky-800">Citation-Verified Executive Summary</div>
            <p className="mt-1.5 leading-relaxed text-slate-700 font-medium">{ebrief.executive_narrative}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="font-extrabold text-slate-900 mb-2">Stage & Post-Approval Obligation Checklist</div>
              <div className="space-y-1.5">
                {(ebrief.stage_and_compliance_checklist || []).map((st: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between border-b border-slate-100 pb-1">
                    <span className="font-medium text-slate-700">
                      {st.stage_code} ({st.assigned_role})
                    </span>
                    <span className="font-mono font-bold text-emerald-700">{st.state}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="font-extrabold text-slate-900 mb-2">Verified Audit Event Citations</div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {(ebrief.cited_audit_chronology || []).map((ev: any) => (
                  <div key={ev.seq_id} className="border-b border-slate-100 pb-1">
                    <span className="font-mono font-bold text-sky-700">{ev.citation_tag}</span>{" "}
                    <span className="font-semibold text-slate-800">{ev.action_type}</span> ({ev.transition})
                    <div className="text-[10px] font-mono text-slate-400">
                      Actor: {ev.actor} · SHA256: {ev.sha256_prefix}...
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------- New Application Modal -------------------- */
export const NewApplicationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: {
    institution_name: string;
    jurisdiction_code: string;
    application_type: string;
    programme_name: string;
    lease_expiry_days_from_now: number;
  }) => Promise<void>;
}> = ({ isOpen, onClose, onCreate }) => {
  const [instName, setInstName] = useState("Indraprastha Institute of Engineering & AI, Noida");
  const [region, setRegion] = useState("NRO");
  const [appType, setAppType] = useState("NEW_INSTITUTION");
  const [progName, setProgName] = useState("B.Tech Artificial Intelligence & Robotics (120 Intake)");
  const [leaseDays, setLeaseDays] = useState(45);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl text-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-base font-black text-slate-900">
            Submit New AICTE Application (Dynamic APH Route Spawner)
          </h3>
          <button onClick={onClose} className="rounded bg-slate-100 p-1 text-slate-500 hover:text-slate-900">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Institution Name</label>
            <input
              type="text"
              value={instName}
              onChange={(e) => setInstName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">AICTE Regional Jurisdiction</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              >
                {["NRO", "NWRO", "WRO", "SWRO", "SCRO", "SRO", "ERO", "CRO"].map((r) => (
                  <option key={r} value={r}>
                    {r} Regional Office
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Lease Expiry Offset (Days)</label>
              <input
                type="number"
                value={leaseDays}
                onChange={(e) => setLeaseDays(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Application Category (Auto-Selects Prescribed APH 2024-27 Route)
            </label>
            <select
              value={appType}
              onChange={(e) => setAppType(e.target.value)}
              className="w-full rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 font-bold text-amber-900"
            >
              <option value="NEW_INSTITUTION">
                NEW_INSTITUTION → Routes to [Scrutiny + EVC + Competent Authority]
              </option>
              <option value="EXTENSION_OF_APPROVAL">
                EXTENSION_OF_APPROVAL (EoA) → Routes to [Only Scrutiny + Competent Authority]
              </option>
              <option value="DEFICIENCY_APPEAL_SAC">
                DEFICIENCY_APPEAL_SAC → Routes to [Scrutiny + EVC + SAC/SHC + Authority]
              </option>
              <option value="CHANGE_OF_SITE_INFRA">
                CHANGE_OF_SITE_INFRA → Routes to [Only EVC Direct Queue + Authority]
              </option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Programme Details</label>
            <input
              type="text"
              value={progName}
              onChange={(e) => setProgName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-lg bg-slate-100 px-4 py-2 font-bold text-slate-600"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                await onCreate({
                  institution_name: instName,
                  jurisdiction_code: region,
                  application_type: appType,
                  programme_name: progName,
                  lease_expiry_days_from_now: leaseDays,
                });
                onClose();
              }}
              className="rounded-lg bg-[#0c1b2e] hover:bg-slate-800 px-4 py-2 font-bold text-white shadow-xs"
            >
              Create & Auto-Route Application
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};