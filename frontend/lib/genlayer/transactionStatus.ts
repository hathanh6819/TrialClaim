import type { TrackedStatus } from "@genlayer/transaction-kit";

export function isConfirmedSuccess(status: TrackedStatus): boolean {
  const statusName = status.statusName?.toUpperCase();
  const execution = status.executionResultName?.toUpperCase();
  return status.successful === true
    && (statusName === "ACCEPTED" || statusName === "FINALIZED")
    && execution === "FINISHED_WITH_RETURN";
}

export function transactionFailureLabel(status: TrackedStatus): string {
  if (status.executionResultName?.toUpperCase() === "FINISHED_WITH_ERROR") return "Contract execution failed";
  if (status.statusName?.toUpperCase() === "UNDETERMINED") return "Validator result is undetermined";
  if (status.statusName?.toUpperCase().includes("TIMEOUT")) return "Consensus timed out";
  if (status.statusName?.toUpperCase() === "CANCELED") return "Transaction was canceled";
  return "Transaction did not finish successfully";
}
