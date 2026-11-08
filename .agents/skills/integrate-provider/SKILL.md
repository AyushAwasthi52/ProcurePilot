---
name: integrate-provider
description: Designs and implements genuine external product
  discovery provider integrations for ProcurePilot. Use when
  connecting catalog APIs, marketplaces or merchant data sources.
---

# ProcurePilot Provider Integration

## 1. Provider research

Before coding, establish:

- Official API documentation
- Authentication method
- API availability and access requirements
- Rate limits
- Pricing and quotas
- Permitted use cases
- Product search capabilities
- Offer and merchant fields
- Regional and currency support
- Attribution requirements
- Commercial restrictions

Never assume an API exists or that an endpoint is accessible.

## 2. Capability assessment

Determine whether the provider supports:

- Product search
- Product details
- Current price
- Historical price
- Availability
- Shipping
- Merchant identity
- Ratings
- Product images
- Checkout or merchant handoff

Clearly document unsupported capabilities.

## 3. Adapter design

Reuse the existing ProductProvider interface and registry.

Implement:
- Authentication
- Request construction
- Response validation
- Normalization
- Currency handling
- Timeouts
- Cancellation
- Retry/backoff where appropriate
- Rate limiting
- Error mapping
- Provenance
- Observed timestamps

## 4. Data integrity

Never:
- Invent missing fields
- Treat unknown costs as zero
- Fabricate stock status
- Claim a seller is verified without evidence
- Present fixtures as real API responses

Keep demo and live provider identities distinct.

## 5. Security

- Store API credentials server-side.
- Validate external responses.
- Avoid leaking provider secrets.
- Respect provider terms.
- Never bypass CAPTCHA or anti-bot controls.
- Avoid unauthorized scraping.

## 6. Testing

Add:
- Normal response tests
- Empty response tests
- Malformed response tests
- Timeout tests
- Rate limit tests
- Authentication failure tests
- Currency conversion tests
- Normalization tests

Use mocked HTTP responses in automated tests.
Do not make CI depend on a live third-party API.

## 7. Completion criteria

A provider is not production-ready merely because its adapter compiles.

Require:
- Valid credentials/configuration
- Successful real API request
- Correct normalized output
- Error handling
- Provenance
- Tests
- Documentation
- Honest capability labels
