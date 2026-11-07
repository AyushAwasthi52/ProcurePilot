# ADR-003: Typed Product Provider Adapter Interface with AbortSignal

## Status
Accepted

## Context
ProcurePilot discovers offers across heterogeneous sources: seeded demonstration catalogs, affiliate APIs, merchant endpoints, and aggregator feeds. External sources have varying latencies, failure rates, and schema shapes. A failure or timeout in one external provider must never crash or block discovery across remaining providers. Users must also be able to abort in-flight searches.

## Decision
All product sources implement the unified `ProductProvider` adapter interface:
```typescript
interface ProductProvider {
  id: string;
  name: string;
  search(input: ProviderSearchInput, signal: AbortSignal): Promise<ProviderSearchResult>;
  getOffer?(providerOfferId: string, signal: AbortSignal): Promise<ProviderOffer | null>;
  healthCheck(): Promise<ProviderHealth>;
}
```

### Invariants:
1. **Normalized DTOs**: Adapters must map external vendor payloads into canonical `ProviderOffer` objects before passing them to the core pipeline.
2. **Timeouts and Cancellation**: Every provider call receives an `AbortSignal` with a strict bounded timeout (default 6,000ms). If a provider times out, partial results from other healthy providers are preserved and flagged with provenance.
3. **Deterministic Seeded Fallback**: A local seeded catalog adapter is maintained so that core flows, testing, and demonstrations can run deterministically without internet or third-party API dependencies.
4. **Honest Failure Reporting**: Provider timeouts or errors are surfaced as `partial` runs or explicit warnings; the system never invents fake replacement offers.

## Consequences
- Clean separation between provider ingestion mechanics and decision intelligence.
- New providers can be plugged in without changing scoring or purchase workflows.
