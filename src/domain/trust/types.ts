export type TrustSeverity = "HIGH" | "MEDIUM" | "INFO";

export interface TrustSignal {
  id: string; // e.g. "TR-01", "TR-02"
  name: string;
  severity: TrustSeverity;
  evidence: string;
  treatment: string;
  isExclusionary: boolean; // if true, excludes from eligible ranking into Flagged panel
}

export interface TrustAssessmentResult {
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  isFlagged: boolean;
  flagReason?: string;
  signals: TrustSignal[];
  confidenceDiscount: number; // 0.0 - 0.5
}
