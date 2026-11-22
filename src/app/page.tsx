"use client";

import { FormEvent, useRef, useState } from "react";
import DoodleCanvas, { type DoodleCanvasHandle } from "@/components/DoodleCanvas";

export default function SubmitPage() {
  const canvasRef = useRef<DoodleCanvasHandle>(null);
  const [name, setName] = useState("");
  const [hasDrawing, setHasDrawing] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Please enter your name before signing.");
      setStatus("error");
      return;
    }

    const imageData = canvasRef.current?.toDataUrl();

    if (!imageData) {
      setErrorMessage("Please add your signature before sending.");
      setStatus("error");
      return;
    }

    setStatus("sending");
    setErrorMessage("");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, imageData }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to send feedback");
      }

      canvasRef.current?.clear();
      setName("");
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
      <section className="submit-panel" aria-label="Sign the wall">
        <form onSubmit={handleSubmit} className="submit-form">
          <label className="name-field">
            <span className="sr-only">Your name</span>
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (status === "error") setStatus("idle");
              }}
              className="name-input"
              type="text"
              name="name"
              autoComplete="name"
              maxLength={80}
              placeholder="Enter your name"
              disabled={status === "sending"}
              required
            />
          </label>

          <div className="signature-field">
            <span className="sr-only">Draw your signature</span>
            <DoodleCanvas
              ref={canvasRef}
              onDrawingChange={setHasDrawing}
              disabled={!name.trim() || status === "sending"}
            />
          </div>

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
                disabled={status === "sending" || !name.trim() || !hasDrawing}
                className="submit-button"
              >
                {status === "sending" ? "Sending…" : "Send"}
              </button>
            </div>
          </div>

          {status === "sent" && (
            <p className="submit-message success" role="status">
              Your signature is on the wall.
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
