import React from "react";
import {
  ShieldCheck,
  Clock,
  FastForward,
  RotateCcw,
  UserCheck,
  LayoutDashboard,
  GitBranch,
  CalendarClock,
  FileCheck2,
  Scale,
  PlusCircle,
} from "lucide-react";
import { DemoUser } from "../api";

interface TopControlBarProps {
  demoUsers: DemoUser[];
  currentUser: DemoUser | null;
  onSwitchRole: (email: string) => void;
  simulatedNowUtc: string;
  clockOffsetDays: number;
  onTimeTravel: (deltaDays?: number, reset?: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenNewCaseModal: () => void;
  unacknowledgedAlertsCount: number;
}

const ROLE_SHORT_LABELS: Record<string, string> = {
  INSTITUTION: "1. Institution Nodal",
  SCRUTINY_OFFICER: "2. Scrutiny Officer",
  EVC_COMMITTEE: "3. EVC Chair",
  SAC_SHC_COMMITTEE: "4. SAC/SHC Appeal",
  REGIONAL_OFFICER: "5. Regional Officer (NRO)",
  COMPETENT_AUTHORITY: "6. Competent Authority",
  BUREAU_ADMIN: "7. Bureau HQ Director",
};

export const TopControlBar: React.FC<TopControlBarProps> = ({
  demoUsers,
  currentUser,
  onSwitchRole,
  simulatedNowUtc,
  clockOffsetDays,
  onTimeTravel,
  activeTab,
  setActiveTab,
  onOpenNewCaseModal,
  unacknowledgedAlertsCount,
}) => {
  const formattedDate = simulatedNowUtc
    ? new Date(simulatedNowUtc).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Loading...";

  const tabs = [
    { id: "CONTROL_TOWER", label: "1. Control Tower & Bottlenecks", icon: LayoutDashboard },
    { id: "CASE_WORKSPACE", label: "2. Case Intelligence & DAG", icon: GitBranch },
    { id: "EVC_QUEUE", label: "3. EVC Queue & SLA Board", icon: CalendarClock },
    { id: "COMPLIANCE_VAULT", label: "4. 5-State Undertaking & Lease Vault", icon: FileCheck2 },
    { id: "RULES_AND_AUDIT", label: "5. Rule Simulator & SHA-256 Audit", icon: Scale },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      {/* Top Tier: Brand Identity + Time-Travel Simulator + New Case Action */}
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 shadow-lg shadow-amber-500/20">
            <ShieldCheck className="h-6 w-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-white">
                AICTE-NIYANTRAN
              </span>
              <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-400 border border-amber-500/30">
                SIH PS 26262 · Regulation Bureau
              </span>
              <span className="hidden md:inline-block rounded bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/30">
                Statutory Human-in-the-Loop Safeguard Active
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Unified Rule-Driven Obligation State Machine · Dependency Recovery · 5-State Compliance & Cryptographic Audit
            </p>
          </div>
        </div>

        {/* Live Time-Travel SLA & Lease Expiry Simulator Bar */}
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-950/30 px-3 py-1.5">
          <div className="flex items-center gap-1.5 pr-2 border-r border-indigo-500/30">
            <Clock className="h-4 w-4 text-indigo-400" />
            <div className="text-xs">
              <span className="text-slate-400">Simulated Clock: </span>
              <span className="font-mono font-semibold text-white">{formattedDate}</span>
              {clockOffsetDays > 0 && (
                <span className="ml-1.5 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-slate-950">
                  +{clockOffsetDays}d Ahead
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {[7, 15, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => onTimeTravel(d, false)}
                className="flex items-center gap-1 rounded bg-indigo-600/80 hover:bg-indigo-500 px-2 py-1 text-[11px] font-semibold text-white transition"
                title={`Advance system clock by +${d} days and run deterministic SLA & Lease Expiry sweep`}
              >
                <FastForward className="h-3 w-3" />+{d}d
              </button>
            ))}
            <button
              onClick={() => onTimeTravel(0, true)}
              className="flex items-center gap-1 rounded bg-slate-800 hover:bg-slate-700 px-2 py-1 text-[11px] font-medium text-slate-300 transition"
              title="Reset simulated clock offset to 0 days"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </div>
        </div>

        <button
          onClick={onOpenNewCaseModal}
          className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 px-3 py-2 text-xs font-bold text-slate-950 shadow transition"
        >
          <PlusCircle className="h-4 w-4" />
          New Application (Test APH Routing)
        </button>
      </div>

      {/* Middle Tier: 1-Click Real JWT Role Switcher Bar */}
      <div className="border-t border-slate-800/80 bg-slate-900/70 px-4 py-1.5">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1">
              <UserCheck className="h-3.5 w-3.5 text-amber-400" />
              Real JWT Role Switcher:
            </span>
            {demoUsers.map((u) => {
              const active = currentUser?.email === u.email;
              return (
                <button
                  key={u.id}
                  onClick={() => onSwitchRole(u.email)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    active
                      ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                      : "bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  {ROLE_SHORT_LABELS[u.role] || u.role}
                  <span className={`ml-1 text-[10px] ${active ? "text-slate-900" : "text-slate-400"}`}>
                    [{u.jurisdiction_code}]
                  </span>
                </button>
              );
            })}
          </div>

          {currentUser && (
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-amber-300 border border-slate-700">
                Active JWT: {currentUser.role} · Scope: {currentUser.jurisdiction_code}
              </span>
              <span className="hidden xl:inline text-slate-400">{currentUser.full_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Tier: 5 Workspace Navigation Tabs */}
      <div className="border-t border-slate-800 bg-slate-950 px-4">
        <div className="mx-auto flex max-w-[1600px] items-center gap-1 overflow-x-auto py-1.5">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3.5 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? "bg-slate-800 text-amber-400 border border-amber-500/40 shadow-sm"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
                {t.id === "CONTROL_TOWER" && unacknowledgedAlertsCount > 0 && (
                  <span className="ml-1 rounded-full bg-rose-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                    {unacknowledgedAlertsCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};