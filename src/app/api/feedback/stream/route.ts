import { getWallItems } from "@/lib/wall";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastPayload = "";
      let closed = false;

      const push = async () => {
        if (closed) return;

        try {
          const items = await getWallItems();
          const payload = JSON.stringify({ items });

          if (payload !== lastPayload) {
            lastPayload = payload;
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
          }
        } catch (error) {
          console.error("SSE poll error:", error);
        }
      };

      await push();
      const interval = setInterval(push, 2000);
      const keepAlive = setInterval(() => {
        if (!closed) {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        }
      }, 15000);

      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        clearInterval(keepAlive);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
