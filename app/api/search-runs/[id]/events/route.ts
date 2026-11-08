import { NextRequest } from "next/server";
import { searchOrchestrator } from "@/src/discovery/search-orchestrator";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (event: string, data: Record<string, unknown>) => {
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Stream closed
        }
      };

      // Check if run already completed
      const existing = searchOrchestrator.getRunResult(id);
      if (existing) {
        sendEvent("run.completed", {
          status: existing.status,
          totalOffers: existing.offers.length,
        });
        controller.close();
        return;
      }

      // Progress stream placeholder: emit immediate status and close when done
      sendEvent("run.started", { runId: id });
      
      const checkInterval = setInterval(() => {
        const result = searchOrchestrator.getRunResult(id);
        if (result) {
          clearInterval(checkInterval);
          sendEvent("run.completed", {
            status: result.status,
            totalOffers: result.offers.length,
          });
          controller.close();
        }
      }, 50);

      // Clean up on client disconnect
      req.signal.addEventListener("abort", () => {
        clearInterval(checkInterval);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
