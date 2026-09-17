import { createClient } from "genlayer-js";
import { GENLAYER_CHAIN } from "../genlayer/client";

export interface ClaimRecord {
  assessment_count: number; context: string; nct_id: string; owner: string;
  parent_claim_id: number; revision: number; statement: string;
  status: "PENDING" | "REVIEWED" | "NEEDS_REVIEW" | "SUPERSEDED";
  superseded_by: number;
}

export interface ClaimAssessment {
  brief_title?: string; cited_primary_outcome?: string; evidence_sha256?: string;
  has_results?: boolean; nct_id?: string; outcome_count?: number;
  overall_status?: string; reason_code: string; source?: string;
  verdict: "ALIGNED" | "PARTIAL" | "MISALIGNED" | "INCONCLUSIVE";
}

export class TrialClaimContract {
  private client: ReturnType<typeof createClient>;
  constructor(private address: `0x${string}`, account?: string | null) {
    this.client = createClient({ chain: GENLAYER_CHAIN, ...(account ? { account: account as `0x${string}` } : {}) } as Parameters<typeof createClient>[0]);
  }
  async getCount() { return Number(await this.client.readContract({ address:this.address, functionName:"get_claim_count", args:[] })); }
  async getClaim(id:number) { return JSON.parse(String(await this.client.readContract({ address:this.address, functionName:"get_claim", args:[id] }))) as ClaimRecord; }
  async getAssessment(id:number) { const value=String(await this.client.readContract({ address:this.address, functionName:"get_latest_assessment", args:[id] })); return value ? JSON.parse(value) as ClaimAssessment : null; }
}
