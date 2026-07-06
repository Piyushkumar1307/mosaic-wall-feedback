"use client";

import { FormEvent, useRef, useState } from "react";
import DoodleCanvas, { type DoodleCanvasHandle } from "@/components/DoodleCanvas";

export default function SubmitPage() {
  const canvasRef = useRef<DoodleCanvasHandle>(null);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const imageData = canvasRef.current?.toDataUrl();

    if (!imageData) {
      setErrorMessage("Please doodle something before sending.");
      setStatus("error");
      return;
    }

    setStatus("sending");
    setErrorMessage("");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to send feedback");
      }

      canvasRef.current?.clear();
      setHasDrawing(false);
      setStatus("sent");
      setTimeout(() => setStatus("idle"), 1500);
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong",
      );
    }
  }

  return (
    <main className="submit-shell">
      <aside className="submit-sidebar">
        <p className="submit-sidebar-label">Share your feedback</p>
      </aside>

      <section className="submit-panel">
        <header className="submit-header">
          <span className="submit-brand">Feedback Wall</span>
        </header>

        <form onSubmit={handleSubmit} className="submit-form">
          <DoodleCanvas ref={canvasRef} onDrawingChange={setHasDrawing} />

          <div className="submit-controls">
            <div className="submit-footer">
              <button
                type="button"
                className="submit-clear-button"
                onClick={() => canvasRef.current?.clear()}
                disabled={!hasDrawing || status === "sending"}
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={status === "sending" || !hasDrawing}
                className="submit-button"
              >
                {status === "sending" ? "Sending…" : "Send"}
              </button>
            </div>
          </div>

          {status === "sent" && (
            <p className="submit-message success" role="status">
              Thanks! Your doodle is on the wall.
            </p>
          )}
          {status === "error" && errorMessage && (
            <p className="submit-message error" role="alert">
              {errorMessage}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
