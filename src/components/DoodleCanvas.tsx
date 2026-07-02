"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

const STROKE_COLOR = "#15803d";
const DEFAULT_STROKE_WIDTH = 5;

export type DoodleCanvasHandle = {
  clear: () => void;
  hasDrawing: () => boolean;
  toDataUrl: () => string | null;
};

type DoodleCanvasProps = {
  strokeWidth?: number;
  onDrawingChange?: (hasDrawing: boolean) => void;
};

function getPoint(
  canvas: HTMLCanvasElement,
  event: PointerEvent,
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

const DoodleCanvas = forwardRef<DoodleCanvasHandle, DoodleCanvasProps>(
  function DoodleCanvas(
    { strokeWidth = DEFAULT_STROKE_WIDTH, onDrawingChange },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const drawingRef = useRef(false);
    const hasDrawnRef = useRef(false);
    const activePointerRef = useRef<number | null>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const sizeRef = useRef({ width: 0, height: 0, ratio: 1 });
    const strokeWidthRef = useRef(strokeWidth);

    strokeWidthRef.current = strokeWidth;

    const notifyChange = useCallback(
      (hasDrawing: boolean) => {
        onDrawingChange?.(hasDrawing);
      },
      [onDrawingChange],
    );

    const applyStrokeStyle = useCallback((ctx: CanvasRenderingContext2D) => {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = STROKE_COLOR;
      ctx.lineWidth = strokeWidthRef.current;
    }, []);

    const setupCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const ratio = window.devicePixelRatio || 1;
      const width = container.clientWidth;
      const height = container.clientHeight;

      if (width === 0 || height === 0) return;

      sizeRef.current = { width, height, ratio };

      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, width, height);
      applyStrokeStyle(ctx);
      ctxRef.current = ctx;
    }, [applyStrokeStyle]);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      setupCanvas();

      const observer = new ResizeObserver(() => {
        setupCanvas();
      });
      observer.observe(container);

      return () => observer.disconnect();
    }, [setupCanvas]);

    useEffect(() => {
      const ctx = ctxRef.current;
      if (ctx) {
        applyStrokeStyle(ctx);
      }
    }, [strokeWidth, applyStrokeStyle]);

    const markDrawn = useCallback(() => {
      if (!hasDrawnRef.current) {
        hasDrawnRef.current = true;
        notifyChange(true);
      }
    }, [notifyChange]);

    const startStroke = useCallback((x: number, y: number) => {
      const ctx = ctxRef.current;
      if (!ctx) return;

      drawingRef.current = true;
      applyStrokeStyle(ctx);
      ctx.beginPath();
      ctx.moveTo(x, y);
    }, [applyStrokeStyle]);

    const continueStroke = useCallback(
      (x: number, y: number) => {
        const ctx = ctxRef.current;
        if (!ctx || !drawingRef.current) return;

        ctx.lineTo(x, y);
        ctx.stroke();
        markDrawn();
      },
      [markDrawn],
    );

    const endStroke = useCallback(() => {
      drawingRef.current = false;
      activePointerRef.current = null;
    }, []);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const onPointerDown = (event: PointerEvent) => {
        if (activePointerRef.current !== null) return;

        event.preventDefault();
        canvas.setPointerCapture(event.pointerId);
        activePointerRef.current = event.pointerId;

        const point = getPoint(canvas, event);
        startStroke(point.x, point.y);
      };

      const onPointerMove = (event: PointerEvent) => {
        if (activePointerRef.current !== event.pointerId) return;

        event.preventDefault();
        const point = getPoint(canvas, event);
        continueStroke(point.x, point.y);
      };

      const onPointerUp = (event: PointerEvent) => {
        if (activePointerRef.current !== event.pointerId) return;

        event.preventDefault();
        if (canvas.hasPointerCapture(event.pointerId)) {
          canvas.releasePointerCapture(event.pointerId);
        }
        endStroke();
      };

      const onPointerCancel = (event: PointerEvent) => {
        if (activePointerRef.current !== event.pointerId) return;

        if (canvas.hasPointerCapture(event.pointerId)) {
          canvas.releasePointerCapture(event.pointerId);
        }
        endStroke();
      };

      canvas.addEventListener("pointerdown", onPointerDown);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("pointercancel", onPointerCancel);

      return () => {
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerup", onPointerUp);
        canvas.removeEventListener("pointercancel", onPointerCancel);
      };
    }, [continueStroke, endStroke, startStroke]);

    useImperativeHandle(ref, () => ({
      clear: () => {
        const ctx = ctxRef.current;
        const { width, height } = sizeRef.current;
        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);
        hasDrawnRef.current = false;
        notifyChange(false);
      },
      hasDrawing: () => hasDrawnRef.current,
      toDataUrl: () => {
        const canvas = canvasRef.current;
        if (!canvas || !hasDrawnRef.current) return null;
        return canvas.toDataURL("image/png");
      },
    }));

    return (
      <div ref={containerRef} className="doodle-wrap">
        <canvas
          ref={canvasRef}
          className="doodle-canvas"
          aria-label="Draw your feedback with finger or mouse"
        />
      </div>
    );
  },
);

export default DoodleCanvas;
