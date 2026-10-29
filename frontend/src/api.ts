export interface DemoUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
  jurisdiction_code: string;
  institution_id?: number | null;
  institution_name?: string | null;
}

export interface PriorityTelemetry {
  priority_score: number;
  risk_band: string;
  D_deadline_proximity: number;
  A_stage_ageing: number;
  B_dependency_blocking: number;
  O_overdue_boost: number;
  hours_remaining: number;
  days_overdue: number;
  active_obligation_title?: string;
  due_at_iso?: string;
  weights: { w1: number; w2: number; w3: number };
  label: string;
}

export interface CaseSummaryItem {
  id: number;
  case_number: string;
  institution_id: number;
  institution_name: string;
  jurisdiction_code: string;
  application_type: string;
  programme_name: string;
  route_pattern: string;
  rule_code: string;
  authority_type: string;
  current_stage: string;
  overall_status: string;
  priority: PriorityTelemetry;
  blocker_headline: string;
  blocker_code: string;
  next_owner_role: string;
  evc_queue_status: string;
  submitted_at: string;
  last_action_at: string;
}

export interface EscalationAlertItem {
  id: number;
  application_id: number;
  obligation_id: number;
  case_number: string;
  jurisdiction_code: string;
  alert_band: string;
  severity: string;
  recipient_role: string;
  explanation_text: string;
  next_permitted_action: string;
  rule_citation: string;
  triggered_at: string;
  is_acknowledged: boolean;
  acknowledged_by_name?: string | null;
}

class ApiClient {
  private token: string = "";

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };
    if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const res = await fetch(path, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = data?.detail || `HTTP ${res.status} Error`;
      throw new Error(`[HTTP ${res.status}] ${detail}`);
    }
    return data as T;
  }

  getDemoUsers() {
    return this.request<DemoUser[]>("/api/auth/demo-users");
  }

  quickLogin(email: string) {
    return this.request<{ access_token: string; user: DemoUser }>("/api/auth/quick-login", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  getDashboardOverview(jurisdiction = "ALL", stage = "ALL") {
    const q = new URLSearchParams({ jurisdiction, stage }).toString();
    return this.request<any>(`/api/dashboard/overview?${q}`);
  }

  getApplicationDetail(appId: number) {
    return this.request<any>(`/api/applications/${appId}`);
  }

  createApplication(payload: {
    institution_name: string;
    jurisdiction_code: string;
    application_type: string;
    programme_name: string;
    lease_expiry_days_from_now: number;
  }) {
    return this.request<any>("/api/applications", {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        academic_year: "2026-27",
        include_post_approval_trackers: true,
      }),
    });
  }

  advanceStage(
    appId: number,
    payload: {
      target_stage_code?: string | null;
      remarks: string;
      decision_order_ref?: string | null;
      is_statutory_override?: boolean;
      override_order_ref?: string | null;
    }
  ) {
    return this.request<any>(`/api/applications/${appId}/advance`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  revertStage(appId: number, payload: { deficiency_code: string; officer_observations: string }) {
    return this.request<any>(`/api/applications/${appId}/revert`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  submitClarification(appId: number, clarification_text: string) {
    return this.request<any>(`/api/applications/${appId}/clarification`, {
      method: "POST",
      body: JSON.stringify({ clarification_text }),
    });
  }

  scheduleEvc(
    appId: number,
    payload: { scheduled_visit_date: string; committee_chair_ref: string; inspection_mode: string }
  ) {
    return this.request<any>(`/api/applications/${appId}/evc-schedule`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  uploadEvidence(
    obligationId: number,
    payload: { claimed_issue_date: string; claimed_expiry_date: string; demo_filename: string; file?: File | null }
  ) {
    const fd = new FormData();
    fd.append("claimed_issue_date", payload.claimed_issue_date);
    fd.append("claimed_expiry_date", payload.claimed_expiry_date);
    fd.append("demo_filename", payload.demo_filename);
    if (payload.file) {
      fd.append("file", payload.file);
    }
    return this.request<any>(`/api/obligations/${obligationId}/upload`, {
      method: "POST",
      body: fd,
    });
  }

  verifyEvidence(
    obligationId: number,
    payload: {
      decision: "ACCEPTED_VERIFIED" | "REJECTED_DEFICIENT";
      human_confirmed_checkbox: boolean;
      verifier_remarks: string;
      confirmed_expiry_date?: string | null;
    }
  ) {
    return this.request<any>(`/api/obligations/${obligationId}/verify`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  getCitationEbrief(appId: number) {
    return this.request<any>(`/api/applications/${appId}/ebrief`);
  }

  timeTravel(payload: {
    delta_days?: number;
    reset_to_zero?: boolean;
    w_deadline?: number;
    w_ageing?: number;
    w_blocker?: number;
  }) {
    return this.request<any>("/api/clock/time-travel", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  acknowledgeAlert(alertId: number, note: string) {
    return this.request<any>(`/api/alerts/${alertId}/acknowledge`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
  }

  getRules() {
    return this.request<any[]>("/api/rules");
  }

  simulateRuleImpact(base_rule_id: number, draft_rule_id: number) {
    return this.request<any>("/api/rules/simulate-impact", {
      method: "POST",
      body: JSON.stringify({ base_rule_id, draft_rule_id }),
    });
  }

  activateDraftRule(draft_rule_id: number) {
    return this.request<any>(`/api/rules/${draft_rule_id}/activate`, {
      method: "POST",
    });
  }

  getAuditLedger() {
    return this.request<any>("/api/audit/ledger");
  }

  simulateTamper(seqId?: number) {
    const q = seqId ? `?seq_id=${seqId}` : "";
    return this.request<any>(`/api/audit/simulate-tamper${q}`, { method: "POST" });
  }

  restoreTamper() {
    return this.request<any>("/api/audit/restore-tamper", { method: "POST" });
  }
}

export const api = new ApiClient();