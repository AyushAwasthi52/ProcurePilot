---
name: verify-feature
description: Verifies ProcurePilot features through unit, integration,
  API and browser-level tests. Use before declaring features complete.
---

# ProcurePilot Verification

## 1. Establish expected behavior

Read acceptance criteria and identify the real user journey.

## 2. Inspect existing tests

Identify:
- Unit tests
- Integration tests
- API tests
- End-to-end tests
- Golden/regression tests

Do not assume test names prove behavior.

## 3. Test functional paths

For purchase requests, test:

- Laptop request
- Headphones request
- Smartphone request
- Monitor request
- Furniture request
- Unrecognized category
- Multiple independent requests
- Edited prompt followed by immediate search
- Clarification followed by search

## 4. Test failure paths

- Empty provider results
- Provider timeout
- Provider returns malformed data
- Provider returns duplicate offers
- Partial provider failure
- Invalid currency
- Invalid budget
- Missing shipping information
- Expired purchase plan
- Unauthorized purchase request
- Invalid approval
- Duplicate payment/webhook event

## 5. Test data integrity

Ensure:
- Demo offers are labelled as demo.
- Live offers have genuine source provenance.
- No fake prices or stock availability.
- Unknown costs remain unknown.
- Scores are calculated from actual normalized offers.

## 6. Test the full journey

Request
  -> Brief
  -> Clarification
  -> Discovery
  -> Evaluation
  -> Comparison
  -> Purchase plan
  -> Human approval
  -> Checkout
  -> Reconciliation

## 7. Report

Classify results:
- PASS
- FAIL
- BLOCKED
- NOT TESTED

Include reproduction steps and actual command output.

Never weaken tests to obtain a passing result.
