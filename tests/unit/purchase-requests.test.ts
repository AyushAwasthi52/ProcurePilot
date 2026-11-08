import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/purchase-requests/route";
import { GET } from "@/app/api/purchase-requests/[id]/route";
import { createSessionToken } from "@/src/auth/session";
import { clearInMemoryStore } from "@/src/db/queries/purchase-requests";

describe("Purchase Requests API", () => {
  beforeEach(() => {
    clearInMemoryStore();
  });

  it("creates a purchase request with status DRAFT", async () => {
    const userA = { id: "usr_alice", email: "alice@example.com" };
    const sessionToken = await createSessionToken(userA);

    const req = new NextRequest("http://localhost:3000/api/purchase-requests", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${sessionToken}`,
        "x-test-skip-csrf": "true",
      },
      body: JSON.stringify({
        rawPrompt: "A high performance laptop for ML experiments with 32GB RAM",
        region: "US",
        currency: "USD",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data).toHaveProperty("id");
    expect(data.userId).toBe("usr_alice");
    expect(data.status).toBe("DRAFT");
    expect(data.currency).toBe("USD");
  });

  it("rejects invalid input with VALIDATION_FAILED (400)", async () => {
    const user = { id: "usr_alice", email: "alice@example.com" };
    const sessionToken = await createSessionToken(user);

    const req = new NextRequest("http://localhost:3000/api/purchase-requests", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${sessionToken}`,
        "x-test-skip-csrf": "true",
      },
      body: JSON.stringify({
        rawPrompt: "bad", // Less than 5 characters
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const errorBody = await res.json();
    expect(errorBody.error.code).toBe("VALIDATION_FAILED");
  });

  it("allows owner to fetch their own purchase request", async () => {
    const userAlice = { id: "usr_alice", email: "alice@example.com" };
    const sessionAlice = await createSessionToken(userAlice);

    // Create request
    const createReq = new NextRequest(
      "http://localhost:3000/api/purchase-requests",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${sessionAlice}`,
          "x-test-skip-csrf": "true",
        },
        body: JSON.stringify({
          rawPrompt: "A high performance laptop for ML experiments with 32GB RAM",
        }),
      }
    );
    const createRes = await POST(createReq);
    const created = await createRes.json();

    // Alice fetches her request
    const getReq = new NextRequest(
      `http://localhost:3000/api/purchase-requests/${created.id}`,
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${sessionAlice}`,
        },
      }
    );
    const getRes = await GET(getReq, {
      params: Promise.resolve({ id: created.id }),
    });
    expect(getRes.status).toBe(200);

    const fetched = await getRes.json();
    expect(fetched.id).toBe(created.id);
  });

  it("prevents IDOR: User Bob receives NOT_FOUND (404) when trying to access User Alice's request", async () => {
    const userAlice = { id: "usr_alice", email: "alice@example.com" };
    const sessionAlice = await createSessionToken(userAlice);

    const userBob = { id: "usr_bob", email: "bob@example.com" };
    const sessionBob = await createSessionToken(userBob);

    // Create Alice's request
    const createReq = new NextRequest(
      "http://localhost:3000/api/purchase-requests",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${sessionAlice}`,
          "x-test-skip-csrf": "true",
        },
        body: JSON.stringify({
          rawPrompt: "Confidential procurement requirements for Alice",
        }),
      }
    );
    const createRes = await POST(createReq);
    const created = await createRes.json();

    // Bob tries to fetch Alice's request
    const bobReq = new NextRequest(
      `http://localhost:3000/api/purchase-requests/${created.id}`,
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${sessionBob}`,
        },
      }
    );
    const bobRes = await GET(bobReq, {
      params: Promise.resolve({ id: created.id }),
    });

    // Must return 404 NOT_FOUND (not 403) to prevent resource existence enumeration
    expect(bobRes.status).toBe(404);
    const errorBody = await bobRes.json();
    expect(errorBody.error.code).toBe("NOT_FOUND");
  });

  it("handles clarification submission and updates brief", async () => {
    const userAlice = { id: "usr_alice", email: "alice@example.com" };
    const sessionAlice = await createSessionToken(userAlice);

    // 1. Create request with ML requirement (triggers CUDA clarification)
    const createReq = new NextRequest(
      "http://localhost:3000/api/purchase-requests",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${sessionAlice}`,
          "x-test-skip-csrf": "true",
        },
        body: JSON.stringify({
          rawPrompt: "A laptop for ML experiments with 32GB RAM and 2-year warranty. Max $1,800.",
        }),
      }
    );
    const createRes = await POST(createReq);
    const created = await createRes.json();

    expect(created.clarificationQuestion).not.toBeNull();
    expect(created.clarificationQuestion.attribute).toBe("cudaSupport");

    // 2. Submit clarification answer
    const { POST: postClarification } = await import(
      "@/app/api/purchase-requests/[id]/clarifications/route"
    );
    const clarifyReq = new NextRequest(
      `http://localhost:3000/api/purchase-requests/${created.id}/clarifications`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${sessionAlice}`,
          "x-test-skip-csrf": "true",
        },
        body: JSON.stringify({
          questionId: "clarify_cuda_ml",
          selectedOptionId: "opt_cuda_yes",
        }),
      }
    );

    const clarifyRes = await postClarification(clarifyReq, {
      params: Promise.resolve({ id: created.id }),
    });
    expect(clarifyRes.status).toBe(200);

    const clarifiedData = await clarifyRes.json();
    expect(clarifiedData.clarificationQuestion).toBeNull();
    const cudaConstraint = clarifiedData.brief.mustHave.find(
      (m: { attribute: string }) => m.attribute === "cudaSupport"
    );
    expect(cudaConstraint.confirmed).toBe(true);
    expect(cudaConstraint.provenance).toBe("you-said");
  });

  it("rejects unauthenticated requests with UNAUTHENTICATED (401)", async () => {
    const req = new NextRequest("http://localhost:3000/api/purchase-requests", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-test-no-auth": "true", // Disable dev fallback
        "x-test-skip-csrf": "true",
      },
      body: JSON.stringify({
        rawPrompt: "A laptop request from anonymous user",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });
});

