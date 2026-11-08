import { ProviderSearchInput } from "@/src/providers/types";
import { defaultProviderRegistry, ProviderRegistry } from "@/src/providers/registry";
import {
  normalizeProviderOffer,
  deduplicateOffers,
} from "@/src/domain/catalog/normalizer";
import { NormalizedOffer } from "@/src/domain/catalog/types";

export type SearchRunStatus =
  | "IN_PROGRESS"
  | "COMPLETE"
  | "PARTIAL"
  | "CANCELLED"
  | "FAILED";

export interface ProviderOutcome {
  providerId: string;
  status: "COMPLETED" | "FAILED" | "TIMED_OUT" | "CANCELLED";
  offerCount: number;
  latencyMs: number;
  error?: string;
}

export interface SearchRunResult {
  runId: string;
  requestId: string;
  status: SearchRunStatus;
  offers: NormalizedOffer[];
  providerOutcomes: Record<string, ProviderOutcome>;
  startedAt: Date;
  completedAt?: Date;
  cancelledAt?: Date;
}

export type SearchProgressCallback = (
  event: string,
  data: Record<string, unknown>
) => void;

interface ActiveRun {
  controller: AbortController;
  result?: SearchRunResult;
}

export class SearchOrchestrator {
  private activeRuns: Map<string, ActiveRun> = new Map();
  private completedRuns: Map<string, SearchRunResult> = new Map();

  constructor(private registry: ProviderRegistry = defaultProviderRegistry) {}

  async executeSearch(
    runId: string,
    requestId: string,
    input: ProviderSearchInput,
    onProgress?: SearchProgressCallback,
    timeoutMs?: number
  ): Promise<SearchRunResult> {
    const effectiveTimeoutMs =
      timeoutMs ??
      (typeof process !== "undefined" && process.env.PROVIDER_TIMEOUT_MS
        ? parseInt(process.env.PROVIDER_TIMEOUT_MS, 10)
        : 6000);
    const controller = new AbortController();
    this.activeRuns.set(runId, { controller });

    const startedAt = new Date();
    const providers = this.registry.getAll();
    const providerOutcomes: Record<string, ProviderOutcome> = {};
    const allNormalizedOffers: NormalizedOffer[] = [];

    onProgress?.("run.started", {
      runId,
      providers: providers.map((p) => p.id),
    });

    const searchPromises = providers.map(async (provider) => {
      const providerStart = Date.now();
      onProgress?.("provider.started", { providerId: provider.id });

      // Create bounded timeout per provider
      const timeoutController = new AbortController();
      const combinedAbort = () => timeoutController.abort();
      controller.signal.addEventListener("abort", combinedAbort);

      const timeoutId = setTimeout(() => {
        timeoutController.abort();
      }, effectiveTimeoutMs);

      try {
        const res = await provider.search(input, timeoutController.signal);
        clearTimeout(timeoutId);
        controller.signal.removeEventListener("abort", combinedAbort);

        const latencyMs = Date.now() - providerStart;
        const normalized = res.offers.map((raw, idx) =>
          normalizeProviderOffer(raw, idx)
        );

        allNormalizedOffers.push(...normalized);

        providerOutcomes[provider.id] = {
          providerId: provider.id,
          status: "COMPLETED",
          offerCount: normalized.length,
          latencyMs,
        };

        onProgress?.("provider.completed", {
          providerId: provider.id,
          offerCount: normalized.length,
          latencyMs,
        });
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        controller.signal.removeEventListener("abort", combinedAbort);

        const isCancelled = controller.signal.aborted;
        const isTimeout = timeoutController.signal.aborted && !isCancelled;
        const latencyMs = Date.now() - providerStart;

        const outcomeStatus = isCancelled
          ? "CANCELLED"
          : isTimeout
          ? "TIMED_OUT"
          : "FAILED";

        const errorMessage =
          err instanceof Error ? err.message : "Provider query failed";

        providerOutcomes[provider.id] = {
          providerId: provider.id,
          status: outcomeStatus,
          offerCount: 0,
          latencyMs,
          error: errorMessage,
        };

        onProgress?.("provider.failed", {
          providerId: provider.id,
          code: outcomeStatus,
          retryable: outcomeStatus !== "CANCELLED",
        });
      }
    });

    await Promise.allSettled(searchPromises);

    const completedAt = new Date();
    const isCancelled = controller.signal.aborted;

    let finalStatus: SearchRunStatus = "COMPLETE";
    if (isCancelled) {
      finalStatus = "CANCELLED";
    } else {
      const anySuccess = Object.values(providerOutcomes).some(
        (o) => o.status === "COMPLETED"
      );
      const anyFailed = Object.values(providerOutcomes).some(
        (o) => o.status !== "COMPLETED"
      );

      if (!anySuccess) {
        finalStatus = "FAILED";
      } else if (anyFailed) {
        finalStatus = "PARTIAL";
      }
    }

    const deduplicated = deduplicateOffers(allNormalizedOffers);

    const runResult: SearchRunResult = {
      runId,
      requestId,
      status: finalStatus,
      offers: deduplicated,
      providerOutcomes,
      startedAt,
      completedAt: isCancelled ? undefined : completedAt,
      cancelledAt: isCancelled ? completedAt : undefined,
    };

    onProgress?.("run.completed", {
      status: finalStatus,
      totalOffers: deduplicated.length,
    });

    this.activeRuns.delete(runId);
    this.completedRuns.set(runId, runResult);

    return runResult;
  }

  cancelSearch(runId: string): boolean {
    const active = this.activeRuns.get(runId);
    if (active) {
      active.controller.abort();
      return true;
    }
    return false;
  }

  getRunResult(runId: string): SearchRunResult | null {
    return this.completedRuns.get(runId) ?? null;
  }

  clear(): void {
    this.activeRuns.clear();
    this.completedRuns.clear();
  }
}

export const searchOrchestrator = new SearchOrchestrator();

