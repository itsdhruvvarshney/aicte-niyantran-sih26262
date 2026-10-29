import React, { useState } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Database,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  GraduationCap,
  Landmark,
  Lock,
  MapPin,
  Plus,
  RefreshCw,
  Scale,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";

/* ==================== SCREEN 6: EXACT COMPLIANCE MANAGEMENT + LIVE 5-STATE VAULT (Matches Image 6) ==================== */
export const ComplianceAndLeaseVault: React.FC<{
  caseDetail: any;
  cases: any[];
  selectedCaseId: number;
  onSelectCaseId: (id: number) => void;
  onUploadEvidence: (
    obligationId: number,
    payload: {
      claimed_issue_date: string;
      claimed_expiry_date: string;
      demo_filename: string;
      file?: File | null;
    }
  ) => Promise<void>;
  onVerifyEvidence: (
    obligationId: number,
    payload: {
      decision: "ACCEPTED_VERIFIED" | "REJECTED_DEFICIENT";
      human_confirmed_checkbox: boolean;
      verifier_remarks: string;
      confirmed_expiry_date?: string | null;
    }
  ) => Promise<void>;
}> = ({
  caseDetail,
  cases,
  selectedCaseId,
  onSelectCaseId,
  onUploadEvidence,
  onVerifyEvidence,
}) => {
  const [activeSubTab, setActiveSubTab] = useState("Institution Compliance");
  const [showLiveVaultDrawer, setShowLiveVaultDrawer] = useState(true);

  const [issueDate, setIssueDate] = useState("2026-10-01");
  const [expiryDate, setExpiryDate] = useState("2056-09-30");
  const [demoFilename] = useState("Registered_Land_Lease_Deed_2056-09-30_Renewal.pdf");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [humanConfirmed, setHumanConfirmed] = useState(false);
  const [verifierRemarks, setVerifierRemarks] = useState(
    "Verified registered lease deed stamp duty, Khasra schedule, and expiry date 2056-09-30."
  );

  const obligations = (caseDetail?.obligations || []).filter(
    (o: any) =>
      o.obligation_type === "TIME_BOUND_UNDERTAKING" ||
      o.obligation_type === "LEASE_DOCUMENT_VALIDITY"
  );
  const submissions = caseDetail?.evidence_submissions || [];

  const complianceTableRows = [
    {
      no: 1,
      inst: "ABC Institute of Technology",
      appId: "AICTE/WRO/2026/1473",
      reg: "WRO",
      score: 92,
      status: "Compliant",
      stTone: "bg-emerald-100 text-emerald-700",
      barColor: "bg-emerald-500",
      pending: 2,
      due: "15 Nov 2026",
      realId: cases[0]?.id || 1,
    },
    {
      no: 2,
      inst: "Aryan College of Engineering",
      appId: "AICTE/WRO/2026/1392",
      reg: "WRO",
      score: 65,
      status: "Partially Compliant",
      stTone: "bg-amber-100 text-amber-800",
      barColor: "bg-amber-500",
      pending: 8,
      due: "18 Oct 2026",
      realId: cases[1]?.id || 2,
    },
    {
      no: 3,
      inst: "Sunrise Technical Campus",
      appId: "AICTE/WRO/2026/1442",
      reg: "NWRO",
      score: 48,
      status: "Non-Compliant",
      stTone: "bg-rose-100 text-rose-700",
      barColor: "bg-rose-500",
      pending: 12,
      due: "12 Oct 2026",
      realId: cases[2]?.id || 1,
    },
    {
      no: 4,
      inst: "Greenfield Institute",
      appId: "AICTE/WRO/2026/1521",
      reg: "SWRO",
      score: 78,
      status: "Partially Compliant",
      stTone: "bg-amber-100 text-amber-800",
      barColor: "bg-emerald-500",
      pending: 5,
      due: "22 Oct 2026",
      realId: cases[0]?.id || 1,
    },
    {
      no: 5,
      inst: "Global Tech University",
      appId: "AICTE/WRO/2026/1314",
      reg: "WRO",
      score: 88,
      status: "Compliant",
      stTone: "bg-emerald-100 text-emerald-700",
      barColor: "bg-emerald-500",
      pending: 1,
      due: "10 Nov 2026",
      realId: cases[1]?.id || 2,
    },
    {
      no: 6,
      inst: "Sharda Polytechnic",
      appId: "AICTE/WRO/2026/1265",
      reg: "NRO",
      score: 55,
      status: "Partially Compliant",
      stTone: "bg-amber-100 text-amber-800",
      barColor: "bg-amber-500",
      pending: 9,
      due: "20 Oct 2026",
      realId: cases[0]?.id || 1,
    },
    {
      no: 7,
      inst: "Eastern College of Engineering",
      appId: "AICTE/WRO/2026/0987",
      reg: "ERO",
      score: 74,
      status: "Partially Compliant",
      stTone: "bg-amber-100 text-amber-800",
      barColor: "bg-emerald-500",
      pending: 6,
      due: "25 Oct 2026",
      realId: cases[1]?.id || 2,
    },
    {
      no: 8,
      inst: "Pioneer Institute",
      appId: "AICTE/WRO/2026/1178",
      reg: "CRO",
      score: 95,
      status: "Compliant",
      stTone: "bg-emerald-100 text-emerald-700",
      barColor: "bg-emerald-500",
      pending: 0,
      due: "05 Nov 2026",
      realId: cases[0]?.id || 1,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Tricolor Campus Hero Banner (Exact Match to Image 6) */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-white via-[#f0fdf4] to-[#dcfce7] p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">Compliance Management</h2>
              <p className="text-xs font-medium text-slate-600">
                Ensure continuous compliance with AICTE norms and regulatory requirements
              </p>
              <p className="mt-1 text-xs italic font-semibold text-emerald-800">
                "Compliant Institutions. Quality Education. Stronger India."
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-[#0b192c]/90 px-3.5 py-2 text-[11px] font-bold text-white shadow-md">
            <span className="rounded bg-sky-500/20 px-2 py-0.5 text-sky-300">📋 Monitor</span>
            <span>→</span>
            <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-emerald-300">✓ Verify</span>
            <span>→</span>
            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-amber-300">🕒 Track</span>
            <span>→</span>
            <span className="rounded bg-rose-500/20 px-2 py-0.5 text-rose-300">🔔 Alert</span>
            <span>→</span>
            <span className="rounded bg-teal-500/20 px-2 py-0.5 text-teal-300">🛡️ Ensure</span>
          </div>
        </div>
      </div>

      {/* 5 KPI Summary Cards (1,248 | 892 | 256 | 100 | 76% Score Ring) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500">Total Institutions</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900">1,248</span>
              <span className="text-[11px] font-bold text-emerald-600">↑ 12%</span>
            </div>
            <div className="text-[10px] text-slate-400">Under AICTE Jurisdiction</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500">Compliant</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900">892</span>
              <span className="text-xs font-bold text-slate-400">72%</span>
              <span className="text-[11px] font-bold text-emerald-600">↑ 8%</span>
            </div>
            <div className="text-[10px] text-slate-400">Verified Undertakings</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500">Partially Compliant</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900">256</span>
              <span className="text-xs font-bold text-slate-400">21%</span>
              <span className="text-[11px] font-bold text-rose-500">↓ 3%</span>
            </div>
            <div className="text-[10px] text-slate-400">Awaiting Verification</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500">Non-Compliant</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900">100</span>
              <span className="text-xs font-bold text-slate-400">8%</span>
              <span className="text-[11px] font-bold text-rose-600">↓ 5%</span>
            </div>
            <div className="text-[10px] text-slate-400">Overdue / Expired</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative h-12 w-12 flex items-center justify-center">
              <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="4"
                  strokeDasharray="76 24"
                />
              </svg>
              <span className="absolute text-xs font-black text-slate-900">76%</span>
            </div>
            <div>
              <div className="text-xs font-extrabold text-slate-900">Compliance Score</div>
              <div className="text-[10px] font-bold text-emerald-600">↑ 6% Overall</div>
            </div>
          </div>
        </div>
      </div>

      {/* Middle 12-Col Grid: 6 Compliance Categories (5 Cols) + Status by Region Map (4 Cols) + Upcoming Deadlines (3 Cols) */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Left 5 Cols: 6 Compliance Categories */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs xl:col-span-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Compliance Categories</h3>
              <p className="text-[11px] text-slate-500">
                Track compliance status across different regulatory areas
              </p>
            </div>
            <span className="text-xs font-bold text-sky-600">View Details →</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
            {[
              ["Land & Infrastructure", "78% Compliant", "980 / 1,248", 78, "bg-sky-600"],
              ["Faculty & Staff", "72% Compliant", "899 / 1,248", 72, "bg-purple-600"],
              ["Academic Facilities", "70% Compliant", "874 / 1,248", 70, "bg-amber-500"],
              ["Financial Compliance", "68% Compliant", "849 / 1,248", 68, "bg-orange-500"],
              ["Governance & Policies", "82% Compliant", "1,024 / 1,248", 82, "bg-emerald-600"],
              ["Student Welfare", "75% Compliant", "936 / 1,248", 75, "bg-teal-600"],
            ].map(([title, pctLabel, countStr, pct, barCls], idx) => (
              <div key={idx} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <div className="font-extrabold text-slate-800">{title}</div>
                <div className="text-[11px] font-bold text-slate-600 mt-0.5">{pctLabel}</div>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div className={`h-full rounded-full ${barCls}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>{countStr}</span>
                  <span>›</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center 4 Cols: Compliance Status by Region with Uttar Pradesh Tooltip */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs xl:col-span-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-extrabold text-slate-900">Compliance Status by Region</h3>
            <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10.5px] font-bold text-slate-600">
              All Regions ▾
            </span>
          </div>

          <div className="flex items-center gap-3 mt-2">
            <div className="relative w-3/5 flex justify-center">
              <svg viewBox="0 0 200 220" className="h-48 w-auto">
                <path
                  d="M85,12 L112,18 L122,42 L152,65 L178,78 L168,112 L138,132 L115,188 L96,210 L78,185 L58,138 L30,108 L42,72 L68,45 Z"
                  fill="#bbf7d0"
                  stroke="#16a34a"
                  strokeWidth="2"
                />
                <path d="M58,138 L30,108 L42,72 L85,95 Z" fill="#fde68a" />
                <path d="M85,55 L125,65 L120,98 L82,92 Z" fill="#fdba74" stroke="#ea580c" strokeWidth="1.5" />
                <path d="M85,130 L125,145 L105,195 L78,185 Z" fill="#86efac" />
              </svg>
              {/* Uttar Pradesh Floating Callout Tooltip (Matches Image 6) */}
              <div className="absolute top-12 right-1 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-md text-[10px] leading-tight">
                <div className="font-extrabold text-slate-900">Uttar Pradesh</div>
                <div className="text-slate-600">Compliance: <strong>62%</strong></div>
                <div className="text-slate-600">Institutions: <strong>156</strong></div>
                <div className="text-rose-600 font-bold">Non-Compliant: 28</div>
              </div>
            </div>

            <div className="w-2/5 space-y-2 text-[11px]">
              {[
                ["≥ 90%", "6 states", "bg-emerald-600"],
                ["70 – 90%", "12 states", "bg-emerald-400"],
                ["50 – 70%", "8 states", "bg-amber-400"],
                ["< 50%", "6 states", "bg-rose-500"],
              ].map(([lbl, sub, dot], i) => (
                <div key={i}>
                  <div className="flex items-center gap-1.5 font-bold text-slate-700">
                    <span className={`h-2.5 w-2.5 rounded-full ${dot}`} /> {lbl}
                  </div>
                  <div className="pl-4 text-[10px] text-slate-400">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 3 Cols: Upcoming Compliance Deadlines */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs xl:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-extrabold text-slate-900">Upcoming Deadlines</h3>
            <span className="text-xs font-bold text-sky-600">View All →</span>
          </div>
          <div className="space-y-2.5 text-xs">
            {[
              ["Fire Safety NOC Renewal", "ABC Institute of Technology", "15 Oct 2026", "3 days left", "High", "bg-rose-100 text-rose-700"],
              ["Building Plan Approval", "XYZ College of Engineering", "18 Oct 2026", "6 days left", "Medium", "bg-amber-100 text-amber-800"],
              ["Faculty Data Update", "Greenfield Institute", "22 Oct 2026", "10 days left", "Medium", "bg-amber-100 text-amber-800"],
              ["Anti-Ragging Compliance", "Sunrise Technical Campus", "25 Oct 2026", "13 days left", "Low", "bg-emerald-100 text-emerald-700"],
              ["Financial Audit Report", "Pioneer Institute", "28 Oct 2026", "16 days left", "Low", "bg-emerald-100 text-emerald-700"],
            ].map(([title, inst, dt, left, prio, tone], i) => (
              <div key={i} className="flex items-center justify-between border-b border-slate-50 pb-2">
                <div>
                  <div className="font-extrabold text-slate-800">{title}</div>
                  <div className="text-[10.5px] text-slate-500">{inst}</div>
                </div>
                <div className="text-right">
                  <span className={`rounded px-1.5 py-0.5 text-[9.5px] font-bold ${tone}`}>{prio}</span>
                  <div className="text-[10px] font-mono text-rose-600 font-bold mt-0.5">{left}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live 5-State ("Upload != Verified") Interactive Drawer for SIH Jury Testing */}
      <div className="rounded-2xl border-2 border-emerald-500/40 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10.5px] font-extrabold text-emerald-800">
              LIVE SIH JURY INTERACTIVE ENGINE · PS SECTIONS D & E
            </span>
            <h3 className="text-base font-black text-slate-900 mt-1">
              5-State Undertaking & Lease Validity Vault ("Upload ≠ Verified" Enforcement)
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <select
              value={selectedCaseId}
              onChange={(e) => onSelectCaseId(Number(e.target.value))}
              className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 font-bold text-slate-900"
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.case_number} — {c.institution_name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowLiveVaultDrawer(!showLiveVaultDrawer)}
              className="rounded-xl bg-slate-100 px-3 py-1.5 font-bold text-slate-700"
            >
              {showLiveVaultDrawer ? "Minimize Vault ▲" : "Expand Vault ▼"}
            </button>
          </div>
        </div>

        {showLiveVaultDrawer && (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-7">
              {obligations.map((ob: any) => (
                <div key={ob.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sky-800">
                      {ob.obligation_type} · {ob.stage_code}
                    </span>
                    <span
                      className={`rounded-full px-3 py-0.5 font-extrabold ${
                        ob.state === "VERIFIED"
                          ? "bg-emerald-100 text-emerald-800"
                          : ob.state === "SUBMITTED"
                          ? "bg-amber-100 text-amber-900"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      5-State: {ob.state}
                    </span>
                  </div>
                  <div className="mt-1 font-extrabold text-slate-900 text-sm">{ob.title}</div>

                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="font-bold text-slate-800 mb-2">
                        1. Institution Upload (Sets State to SUBMITTED)
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <input
                          type="date"
                          value={issueDate}
                          onChange={(e) => setIssueDate(e.target.value)}
                          className="rounded border border-slate-300 px-2 py-1"
                        />
                        <input
                          type="date"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                          className="rounded border border-slate-300 px-2 py-1"
                        />
                      </div>
                      <button
                        onClick={() =>
                          onUploadEvidence(ob.id, {
                            claimed_issue_date: issueDate,
                            claimed_expiry_date: expiryDate,
                            demo_filename: demoFilename,
                            file: selectedFile,
                          })
                        }
                        className="w-full rounded-lg bg-amber-500 hover:bg-amber-600 py-1.5 font-bold text-white"
                      >
                        Upload Renewed Lease / Affidavit PDF
                      </button>
                    </div>

                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                      <div className="font-bold text-emerald-900 mb-1.5">
                        2. Officer Statutory Verification Gate
                      </div>
                      <label className="flex items-start gap-1.5 text-[11px] text-slate-700 cursor-pointer mb-2">
                        <input
                          type="checkbox"
                          checked={humanConfirmed}
                          onChange={(e) => setHumanConfirmed(e.target.checked)}
                          className="mt-0.5"
                        />
                        <span>Confirm physical deed & OCR expiry date (Unchecked = HTTP 422)</span>
                      </label>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() =>
                            onVerifyEvidence(ob.id, {
                              decision: "ACCEPTED_VERIFIED",
                              human_confirmed_checkbox: humanConfirmed,
                              verifier_remarks: verifierRemarks,
                              confirmed_expiry_date: expiryDate,
                            })
                          }
                          className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 py-1.5 font-bold text-white"
                        >
                          Verify & Accept
                        </button>
                        <button
                          onClick={() =>
                            onVerifyEvidence(ob.id, {
                              decision: "REJECTED_DEFICIENT",
                              human_confirmed_checkbox: false,
                              verifier_remarks: "Deficient stamp paper; resubmit v2.",
                            })
                          }
                          className="rounded-lg bg-rose-600 hover:bg-rose-500 px-2.5 py-1.5 font-bold text-white"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 lg:col-span-5 text-xs">
              <div className="font-extrabold text-slate-900 mb-2">
                Uploaded Document Versions & SHA-256 Vault ({submissions.length})
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {submissions.map((s: any) => (
                  <div key={s.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                    <div className="flex justify-between font-bold">
                      <span className="text-sky-800">v{s.version_no} · {s.original_filename}</span>
                      <span className="text-emerald-700">{s.verification_decision}</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 mt-1">
                      SHA256: {s.file_sha256_hash?.slice(0, 20)}... | OCR Expiry: {s.assistive_ocr_expiry_date} ({s.ocr_match_status})
                    </div>
                    <div className="mt-1.5 flex justify-end">
                      <a
                        href={s.signed_download_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10.5px] font-bold text-sky-600 hover:underline"
                      >
                        ⬇ Download Signed PDF
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Split Matching Image 6: Institution Compliance Table (9 Cols) + Compliance Insights Donut & Quick Actions (3 Cols) */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs xl:col-span-9">
          <div className="flex flex-wrap items-center gap-6 border-b border-slate-200 pb-2.5 mb-3 text-xs font-bold">
            {[
              "Institution Compliance",
              "Document Verification",
              "Deficiency Tracking",
              "Renewals & Payments",
              "Inspection Reports",
            ].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveSubTab(tab)}
                className={`pb-1.5 border-b-2 transition ${
                  activeSubTab === tab
                    ? "border-indigo-600 text-indigo-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10.5px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-2.5 py-2.5">#</th>
                  <th className="px-2.5 py-2.5">Institution Name</th>
                  <th className="px-2.5 py-2.5">Application ID</th>
                  <th className="px-2.5 py-2.5">Region</th>
                  <th className="px-2.5 py-2.5">Compliance Score</th>
                  <th className="px-2.5 py-2.5">Status</th>
                  <th className="px-2.5 py-2.5">Pending Items</th>
                  <th className="px-2.5 py-2.5">Next Deadline</th>
                  <th className="px-2.5 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {complianceTableRows.map((r) => (
                  <tr
                    key={r.no}
                    onClick={() => onSelectCaseId(r.realId)}
                    className="hover:bg-sky-50/50 cursor-pointer"
                  >
                    <td className="px-2.5 py-2.5 font-mono text-slate-400">
                      <input type="checkbox" className="mr-1.5" />
                      {r.no}
                    </td>
                    <td className="px-2.5 py-2.5 font-bold text-slate-900">{r.inst}</td>
                    <td className="px-2.5 py-2.5 font-mono font-bold text-slate-700">{r.appId}</td>
                    <td className="px-2.5 py-2.5 text-slate-600">{r.reg}</td>
                    <td className="px-2.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 rounded-full bg-slate-100 overflow-hidden">
                          <div className={`h-full rounded-full ${r.barColor}`} style={{ width: `${r.score}%` }} />
                        </div>
                        <span className="font-mono font-bold text-slate-800">{r.score}%</span>
                      </div>
                    </td>
                    <td className="px-2.5 py-2.5">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${r.stTone}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-2.5 py-2.5 font-mono font-bold text-rose-600">{r.pending}</td>
                    <td className="px-2.5 py-2.5 font-mono text-slate-700">{r.due}</td>
                    <td className="px-2.5 py-2.5 font-bold text-sky-600">View ⋮</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 3 Cols: Compliance Insights Donut + Quick Actions */}
        <div className="space-y-4 xl:col-span-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-extrabold text-slate-900">Compliance Insights</h4>
              <span className="text-xs font-bold text-sky-600">View All →</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative h-24 w-24 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#10b981" strokeWidth="4.5" strokeDasharray="72 28" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f59e0b" strokeWidth="4.5" strokeDasharray="20 80" strokeDashoffset="-72" />
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#ef4444" strokeWidth="4.5" strokeDasharray="8 92" strokeDashoffset="-92" />
                </svg>
                <div className="absolute text-center">
                  <div className="text-sm font-black text-slate-900">1,248</div>
                  <div className="text-[8px] text-slate-400">Institutions</div>
                </div>
              </div>
              <div className="space-y-1.5 text-[11px] flex-1">
                <div className="flex justify-between">
                  <span className="text-emerald-700 font-bold">● Compliant</span>
                  <strong>892 (72%)</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-700 font-bold">● Partial</span>
                  <strong>256 (21%)</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-rose-600 font-bold">● Non-Comp</span>
                  <strong>100 (8%)</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <h4 className="text-sm font-extrabold text-slate-900 mb-2.5">Quick Actions</h4>
            <div className="grid grid-cols-3 gap-2 text-center text-[10.5px] font-bold">
              {[
                ["Verify Documents", "bg-sky-50 text-sky-800 border-sky-100"],
                ["Send Compliance Notice", "bg-amber-50 text-amber-900 border-amber-100"],
                ["Schedule Inspection", "bg-purple-50 text-purple-800 border-purple-100"],
                ["Generate Report", "bg-emerald-50 text-emerald-800 border-emerald-100"],
                ["Mark as Compliant", "bg-teal-50 text-teal-800 border-teal-100"],
                ["Escalate Case", "bg-rose-50 text-rose-800 border-rose-100"],
              ].map(([lbl, cls], i) => (
                <button
                  key={i}
                  onClick={() => setShowLiveVaultDrawer(true)}
                  className={`rounded-xl border p-2.5 ${cls}`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ==================== SCREEN 7: EXACT MASTER DATA MANAGEMENT VIEW (Matches Image 7) ==================== */
export const MasterDataManagementView: React.FC<{
  onNavigateTab: (tab: string) => void;
}> = ({ onNavigateTab }) => {
  const [activeCategory, setActiveCategory] = useState("Institutions");

  const directoryRows = [
    ["1", "1-4365127890", "ABC Institute of Technology", "Private", "Maharashtra, Mumbai", "Approved", "12", "bg-emerald-100 text-emerald-700"],
    ["2", "1-4365127891", "Global Tech University", "Deemed", "Karnataka, Bengaluru", "Approved", "18", "bg-emerald-100 text-emerald-700"],
    ["3", "1-4365127892", "Aryan College of Engineering", "Private", "Uttar Pradesh, Noida", "Applied", "6", "bg-sky-100 text-sky-700"],
    ["4", "1-4365127893", "Sunrise Technical Campus", "Private", "Tamil Nadu, Chennai", "Under Review", "8", "bg-amber-100 text-amber-800"],
    ["5", "1-4365127894", "Greenfield Institute", "Government", "Madhya Pradesh, Bhopal", "Approved", "14", "bg-emerald-100 text-emerald-700"],
    ["6", "1-4365127895", "Eastern College of Engineering", "Private", "West Bengal, Kolkata", "Deficient", "4", "bg-rose-100 text-rose-700"],
    ["7", "1-4365127896", "Pioneer Institute", "Private", "Rajasthan, Jaipur", "Approved", "10", "bg-emerald-100 text-emerald-700"],
    ["8", "1-4365127897", "Modern Technical Campus", "Private", "Telangana, Hyderabad", "Under Review", "6", "bg-amber-100 text-amber-800"],
    ["9", "1-4365127898", "National Institute of Science", "Government", "Delhi, New Delhi", "Approved", "20", "bg-emerald-100 text-emerald-700"],
    ["10", "1-4365127899", "Sharda Polytechnic", "Private", "Haryana, Gurugram", "Applied", "4", "bg-sky-100 text-sky-700"],
  ];

  return (
    <div className="space-y-4">
      {/* Top Tricolor Campus Hero Banner (Matches Image 7) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0b192c] via-[#1c3d5e] to-[#15803d] text-white p-5 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 border border-white/25">
              <Landmark className="h-6 w-6 text-amber-300" />
            </div>
            <div>
              <h2 className="text-2xl font-black">Master Data Management</h2>
              <p className="text-xs text-slate-200">
                Maintain core data for a standardized and accurate approval process
              </p>
              <p className="text-xs italic text-amber-200 mt-0.5">
                "Clean Data. Better Decisions. Stronger Governance."
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-950/60 px-3.5 py-2 text-[11px] font-bold">
            <span>🏛️ Institutions</span>
            <span>›</span>
            <span>🎓 Programmes</span>
            <span>›</span>
            <span>👥 Experts</span>
            <span>›</span>
            <span>📍 Regions</span>
            <span>›</span>
            <span>⚖️ Norms</span>
            <span>›</span>
            <span>📄 Templates</span>
          </div>
        </div>
      </div>

      {/* 6 KPI Summary Cards (12,486 | 6,284 | 2,156 | 8 Regions | 320 Templates | 124 Norms) */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ["12,486", "Institutions", "↑ 6% this year", "bg-purple-100 text-purple-700"],
          ["6,284", "Programmes/Courses", "↑ 8%", "bg-emerald-100 text-emerald-700"],
          ["2,156", "Experts & EVCs", "↑ 12%", "bg-amber-100 text-amber-800"],
          ["8", "Regions", "36 States/UTs", "bg-sky-100 text-sky-700"],
          ["320", "Document Templates", "↑ 4%", "bg-rose-100 text-rose-700"],
          ["124", "Regulatory Norms", "↑ 3%", "bg-indigo-100 text-indigo-700"],
        ].map(([val, title, sub, tone], i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xl font-black text-slate-900">{val}</span>
              <span className={`h-7 w-7 rounded-lg ${tone} flex items-center justify-center font-bold text-xs`}>
                ★
              </span>
            </div>
            <div className="text-xs font-bold text-slate-700 mt-1">{title}</div>
            <div className="text-[10px] font-bold text-emerald-600 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {[
          "Institutions",
          "Programmes & Courses",
          "Experts & EVCs",
          "States & Regions",
          "Regulatory Norms",
          "Document Templates",
        ].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeCategory === cat
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Split: Institutions Directory Table (8 Cols) + Institution Details Profile Card (4 Cols) */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs xl:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Institutions Directory</h3>
              <p className="text-xs text-slate-500">
                View, add, and manage all AICTE approved and applied institutions
              </p>
            </div>
            <div className="flex gap-2 text-xs">
              <button className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold text-slate-700">
                ↑ Import
              </button>
              <button className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold text-slate-700">
                ↓ Export
              </button>
              <button className="rounded-lg bg-purple-600 hover:bg-purple-500 px-3.5 py-1.5 font-bold text-white">
                + Add Institution
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10.5px] font-bold uppercase text-slate-500">
                <tr>
                  <th className="px-2.5 py-2.5">#</th>
                  <th className="px-2.5 py-2.5">Institution ID</th>
                  <th className="px-2.5 py-2.5">Institution Name</th>
                  <th className="px-2.5 py-2.5">Type</th>
                  <th className="px-2.5 py-2.5">State / City</th>
                  <th className="px-2.5 py-2.5">Approval Status</th>
                  <th className="px-2.5 py-2.5">Programmes</th>
                  <th className="px-2.5 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {directoryRows.map(([no, id, name, tp, city, st, prog, tone]) => (
                  <tr
                    key={no}
                    onClick={() => onNavigateTab("CASE_WORKSPACE")}
                    className="hover:bg-sky-50/50 cursor-pointer"
                  >
                    <td className="px-2.5 py-2.5 font-mono text-slate-400">
                      <input type="checkbox" className="mr-1.5" />
                      {no}
                    </td>
                    <td className="px-2.5 py-2.5 font-mono font-bold text-slate-700">{id}</td>
                    <td className="px-2.5 py-2.5 font-bold text-slate-900">{name}</td>
                    <td className="px-2.5 py-2.5 text-slate-600">{tp}</td>
                    <td className="px-2.5 py-2.5 text-slate-600">{city}</td>
                    <td className="px-2.5 py-2.5">
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${tone}`}>{st}</span>
                    </td>
                    <td className="px-2.5 py-2.5 font-mono font-bold text-slate-800">{prog}</td>
                    <td className="px-2.5 py-2.5 text-slate-500">👁 ✎ ⋮</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 4 Cols: Institution Details Card (Matches Image 7) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs xl:col-span-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="text-sm font-extrabold text-slate-900">Institution Details</h3>
            <button
              onClick={() => onNavigateTab("CASE_WORKSPACE")}
              className="text-xs font-bold text-sky-600 hover:underline"
            >
              View Full Profile →
            </button>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="h-14 w-16 rounded-lg bg-gradient-to-br from-sky-700 to-slate-900 flex items-center justify-center text-white shrink-0">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900 text-sm">ABC Institute of Technology</span>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  Approved
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-500">Institution ID: 1-4365127890</div>
              <div className="text-[10.5px] text-amber-700 font-bold mt-0.5">
                📍 Mumbai, Maharashtra · Private · NAAC A+
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-xs">
            <div>
              <div className="font-black text-slate-900">12</div>
              <div className="text-[9.5px] text-slate-500">Programmes</div>
            </div>
            <div>
              <div className="font-black text-slate-900">850</div>
              <div className="text-[9.5px] text-slate-500">Intake</div>
            </div>
            <div>
              <div className="font-black text-slate-900">65</div>
              <div className="text-[9.5px] text-slate-500">Faculty</div>
            </div>
            <div>
              <div className="font-black text-slate-900">45 Acres</div>
              <div className="text-[9.5px] text-slate-500">Campus</div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-extrabold uppercase text-slate-700 mb-2">Quick Actions</h4>
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button
                onClick={() => onNavigateTab("CASE_WORKSPACE")}
                className="rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 py-1.5 text-slate-700"
              >
                ✎ Edit Details
              </button>
              <button
                onClick={() => onNavigateTab("CASE_WORKSPACE")}
                className="rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 py-1.5 text-slate-700"
              >
                🎓 Manage Programmes
              </button>
              <button
                onClick={() => onNavigateTab("COMPLIANCE_VAULT")}
                className="rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 py-1.5 text-slate-700"
              >
                ↑ Upload Documents
              </button>
              <button
                onClick={() => onNavigateTab("RULES_AND_AUDIT")}
                className="rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 py-1.5 text-rose-700"
              >
                Flag Non-Compliance
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ==================== SCREEN 8: EXACT AUDIT & LOGS + RULE IMPACT SIMULATOR (Matches Image 8) ==================== */
export const RuleSimulatorAndAuditStudio: React.FC<{
  rules: any[];
  simulationResult: any;
  onRunSimulation: (baseId: number, draftId: number) => Promise<void>;
  onActivateDraft: (draftId: number) => Promise<void>;
  auditLedger: any;
  onRefreshAudit: () => Promise<void>;
  onSimulateTamper: () => Promise<void>;
  onRestoreTamper: () => Promise<void>;
}> = ({
  rules,
  simulationResult,
  onRunSimulation,
  onActivateDraft,
  auditLedger,
  onRefreshAudit,
  onSimulateTamper,
  onRestoreTamper,
}) => {
  const v1Rule = rules.find((r) => r.rule_code === "APH_ROUTE_SCRUTINY_EVC" && r.version_num === 1);
  const v2Draft = rules.find((r) => r.rule_code === "APH_ROUTE_SCRUTINY_EVC" && r.version_num === 2);

  const verification = auditLedger?.verification;
  const checkpoint = auditLedger?.latest_anchor_checkpoint;

  return (
    <div className="space-y-4">
      {/* Top Dark-Navy Hero Banner (Exact Match to Image 8) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0b192c] via-[#1c3d5e] to-[#7c2d12] text-white p-5 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/20 border border-sky-400/40 text-sky-300">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black">Audit & Logs</h2>
              <p className="text-xs text-slate-200">
                Complete Transparency. Accountability. Secure Governance.
              </p>
              <p className="text-xs italic text-amber-200 mt-0.5">
                "Every Action. Every Decision. Fully Traceable."
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-slate-950/65 border border-white/15 px-4 py-2.5 text-xs space-y-1">
            <div className="text-emerald-300 font-bold">✓ Track User Activity & Advisory Lock (#26262)</div>
            <div className="text-emerald-300 font-bold">✓ Monitor System Events & SHA-256 Chain</div>
            <div className="text-emerald-300 font-bold">✓ External HMAC Checkpoint Anchor Verified</div>
          </div>
        </div>
      </div>

      {/* 4 KPI Cards (1,28,540 | 482 | 24 | 0 Data Integrity Issues) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-2xl font-black text-slate-900">1,28,540</div>
          <div className="text-xs font-bold text-slate-600">Total Activities</div>
          <div className="text-[11px] font-bold text-emerald-600 mt-0.5">↑ 18% this month</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-2xl font-black text-slate-900">482</div>
          <div className="text-xs font-bold text-slate-600">Active Users</div>
          <div className="text-[11px] font-bold text-emerald-600 mt-0.5">↑ 6% this month</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-2xl font-black text-slate-900">24</div>
          <div className="text-xs font-bold text-slate-600">Security Alerts</div>
          <div className="text-[11px] font-bold text-rose-600 mt-0.5">↓ 40% this month</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-2xl font-black text-emerald-600">
            {verification && !verification.is_valid ? "1 TAMPER!" : "0"}
          </div>
          <div className="text-xs font-bold text-slate-600">Data Integrity Issues</div>
          <div className="text-[11px] font-bold text-emerald-600 mt-0.5">
            {verification && !verification.is_valid ? "🚨 Hash Chain Broken" : "✓ No issues detected"}
          </div>
        </div>
      </div>

      {/* Interactive SIH Jury Verification Bar: SHA-256 Tamper Simulator + Rule v1/v2 Impact Simulator */}
      <div className="rounded-2xl border-2 border-indigo-500/30 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-extrabold text-indigo-800">
              SIH JURY LIVE CRYPTOGRAPHIC & RULE IMPACT CONTROLS
            </span>
            <h3 className="text-sm font-black text-slate-900 mt-0.5">
              3-Layer SHA-256 Tamper Verifier & APH Rule v1 vs. v2 Impact Simulator
            </h3>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <button
              onClick={onRefreshAudit}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 font-bold text-white shadow-2xs"
            >
              ✓ Verify SHA-256 Chain & Anchor
            </button>
            <button
              onClick={onSimulateTamper}
              className="rounded-xl bg-rose-600 hover:bg-rose-500 px-3.5 py-1.5 font-bold text-white shadow-2xs"
            >
              ⚡ Simulate SQL Tamper Attack
            </button>
            <button
              onClick={onRestoreTamper}
              className="rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 font-bold text-slate-700"
            >
              Restore Authentic Row
            </button>
            {v1Rule && v2Draft && (
              <button
                onClick={() => onRunSimulation(v1Rule.id, v2Draft.id)}
                className="rounded-xl bg-amber-500 hover:bg-amber-600 px-3.5 py-1.5 font-bold text-white shadow-2xs"
              >
                Preview Rule v1 → v2 Impact
              </button>
            )}
          </div>
        </div>

        {verification && (
          <div
            className={`rounded-xl border p-3 text-xs ${
              verification.is_valid
                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                : "border-rose-400 bg-rose-50 text-rose-900"
            }`}
          >
            <div className="flex flex-wrap justify-between font-black">
              <span>
                {verification.is_valid
                  ? `✅ SHA-256 HASH CHAIN & EXTERNAL HMAC ANCHOR VERIFIED (${verification.total_events_checked} Events)`
                  : `🚨 TAMPER DETECTED (${verification.status}) AT AUDIT SEQ #${verification.broken_at_seq_id}!`}
              </span>
              {checkpoint && (
                <span className="font-mono text-[10.5px]">
                  Anchor HMAC: {checkpoint.hmac_signature?.slice(0, 18)}...
                </span>
              )}
            </div>
            <div className="mt-0.5">{verification.message}</div>
          </div>
        )}

        {simulationResult && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs">
            <div className="flex items-center justify-between">
              <strong className="text-amber-900">
                Rule v1 vs. v2 Impact Preview ({simulationResult.affected_open_cases_count} Open Cases Affected):
              </strong>
              {v2Draft && !v2Draft.is_active && (
                <button
                  onClick={() => onActivateDraft(v2Draft.id)}
                  className="rounded bg-[#0c1b2e] px-2.5 py-1 text-[10.5px] font-bold text-white"
                >
                  Publish Rule v2
                </button>
              )}
            </div>
            <div className="mt-1 text-slate-700">
              Added Gate: <strong>{simulationResult.structural_diff.added_stages.join(", ")}</strong> |{" "}
              {simulationResult.safety_guardrail}
            </div>
          </div>
        )}
      </div>

      {/* Activity Logs Table (Matches Image 8 Middle Table) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Activity Logs</h3>
            <p className="text-xs text-slate-500">
              Track and monitor all user and system activities across the platform
            </p>
          </div>
          <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
            ↓ Export Logs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10.5px] font-bold uppercase text-slate-500">
              <tr>
                <th className="px-2.5 py-2.5">#</th>
                <th className="px-2.5 py-2.5">Timestamp</th>
                <th className="px-2.5 py-2.5">User</th>
                <th className="px-2.5 py-2.5">Role</th>
                <th className="px-2.5 py-2.5">Case / Module</th>
                <th className="px-2.5 py-2.5">Activity</th>
                <th className="px-2.5 py-2.5">Details</th>
                <th className="px-2.5 py-2.5">SHA-256 Proof</th>
                <th className="px-2.5 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(auditLedger?.events || []).map((ev: any) => {
                const isTampered =
                  verification && !verification.is_valid && verification.broken_at_seq_id === ev.seq_id;
                return (
                  <tr
                    key={ev.seq_id}
                    className={isTampered ? "bg-rose-100 font-bold text-rose-900" : "hover:bg-slate-50"}
                  >
                    <td className="px-2.5 py-2.5 font-mono font-bold text-sky-700">#{ev.seq_id}</td>
                    <td className="px-2.5 py-2.5 font-mono text-[11px] text-slate-500">
                      {ev.timestamp_iso?.slice(0, 19).replace("T", " ")}
                    </td>
                    <td className="px-2.5 py-2.5 font-bold text-slate-900">{ev.actor_name}</td>
                    <td className="px-2.5 py-2.5 text-slate-600">{ev.actor_role}</td>
                    <td className="px-2.5 py-2.5 font-mono text-slate-800">{ev.case_number || "SYSTEM"}</td>
                    <td className="px-2.5 py-2.5 font-semibold text-slate-900">{ev.action_type}</td>
                    <td className="px-2.5 py-2.5 max-w-xs truncate text-slate-600">{ev.remarks}</td>
                    <td className="px-2.5 py-2.5 font-mono text-[10px] text-emerald-700 font-bold">
                      {ev.row_hash?.slice(0, 14)}...
                    </td>
                    <td className="px-2.5 py-2.5">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          isTampered
                            ? "bg-rose-600 text-white"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {isTampered ? "TAMPERED" : "Success"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom 3 Cards Matching Image 8: User Activity Heatmap + Activity Distribution Donut + Security Alerts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Card 1: User Activity Heatmap (5 Cols) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs lg:col-span-5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">User Activity Heatmap</h4>
              <p className="text-[11px] text-slate-500">User activity across modules (Last 30 Days)</p>
            </div>
            <span className="text-[10px] text-slate-400">Low 🟦🟦🟦 High</span>
          </div>
          <div className="space-y-1.5 text-[10.5px] mt-3">
            {[
              "Admin",
              "Regional Officer",
              "SAC Member",
              "SHC Member",
              "EVC Expert",
              "Compliance Officer",
            ].map((role, rIdx) => (
              <div key={role} className="flex items-center gap-2">
                <span className="w-28 text-slate-500 font-medium truncate">{role}</span>
                <div className="flex-1 grid grid-cols-14 gap-1">
                  {Array.from({ length: 14 }, (_, cIdx) => {
                    const v = (rIdx * 3 + cIdx * 5) % 4;
                    const bg =
                      v === 0
                        ? "bg-sky-100"
                        : v === 1
                        ? "bg-sky-300"
                        : v === 2
                        ? "bg-sky-500"
                        : "bg-indigo-700";
                    return <div key={cIdx} className={`h-3.5 rounded-xs ${bg}`} />;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Activity Distribution By Module Donut (4 Cols) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs lg:col-span-4">
          <h4 className="text-sm font-extrabold text-slate-900">Activity Distribution</h4>
          <p className="text-[11px] text-slate-500">By Module (Last 30 Days)</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="relative h-28 w-28 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 36 36" className="h-28 w-28 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#0284c7" strokeWidth="4.5" strokeDasharray="32 68" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#10b981" strokeWidth="4.5" strokeDasharray="18 82" strokeDashoffset="-32" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f59e0b" strokeWidth="4.5" strokeDasharray="14 86" strokeDashoffset="-50" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#8b5cf6" strokeWidth="4.5" strokeDasharray="22 78" strokeDashoffset="-64" />
              </svg>
              <div className="absolute text-center">
                <div className="text-xs font-black text-slate-900">1,28,540</div>
                <div className="text-[8px] text-slate-400">Activities</div>
              </div>
            </div>
            <div className="flex-1 space-y-1 text-[11px]">
              {[
                ["Applications", "32%", "bg-sky-600"],
                ["Compliance", "18%", "bg-emerald-500"],
                ["Master Data", "14%", "bg-amber-500"],
                ["Committees", "12%", "bg-purple-600"],
                ["EVC Mgmt", "10%", "bg-rose-500"],
              ].map(([m, p, dot], i) => (
                <div key={i} className="flex justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600 font-semibold">
                    <span className={`h-2 w-2 rounded-full ${dot}`} /> {m}
                  </span>
                  <strong className="font-mono">{p}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 3: Security & Compliance Alerts (3 Cols) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs lg:col-span-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-extrabold text-slate-900">Security & Alerts</h4>
            <span className="text-xs font-bold text-sky-600">View All →</span>
          </div>
          <div className="space-y-2.5 text-xs">
            {[
              ["Multiple failed login attempts", "10.12.6.77 · 11:40 AM", "High", "bg-rose-100 text-rose-700"],
              ["Unusual data access pattern", "User ID: U-4587", "Medium", "bg-amber-100 text-amber-800"],
              ["Large document bundle export", "2.4 GB - Reports Module", "Low", "bg-emerald-100 text-emerald-700"],
            ].map(([title, sub, sev, tone], i) => (
              <div key={i} className="flex items-center justify-between border-b border-slate-50 pb-2">
                <div>
                  <div className="font-bold text-slate-800">{title}</div>
                  <div className="text-[10.5px] text-slate-400">{sub}</div>
                </div>
                <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${tone}`}>{sev}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};