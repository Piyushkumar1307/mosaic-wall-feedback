"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

const STROKE_COLOR = "#15803d";
const STROKE_WIDTH = 6;

export type DoodleCanvasHandle = {
  clear: () => void;
  hasDrawing: () => boolean;
  toDataUrl: () => string | null;
};

type DoodleCanvasProps = {
  onDrawingChange?: (hasDrawing: boolean) => void;
};

function cropCanvasToDataUrl(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const { width, height } = canvas;
  const pixels = ctx.getImageData(0, 0, width, height).data;

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = pixels[(y * width + x) * 4 + 3];
      if (alpha > 0) {
        found = true;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (!found) return null;

  const padding = Math.round(STROKE_WIDTH * 3 * (window.devicePixelRatio || 1));
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(width - 1, maxX + padding);
  maxY = Math.min(height - 1, maxY + padding);

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  const cropped = document.createElement("canvas");
  cropped.width = cropW;
  cropped.height = cropH;

  const cropCtx = cropped.getContext("2d");
  if (!cropCtx) return null;

  cropCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
  return cropped.toDataURL("image/png");
}

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
  function DoodleCanvas({ onDrawingChange }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const drawingRef = useRef(false);
    const hasDrawnRef = useRef(false);
    const activePointerRef = useRef<number | null>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const sizeRef = useRef({ width: 0, height: 0, ratio: 1 });
    const strokeWidthRef = useRef(STROKE_WIDTH);

    strokeWidthRef.current = STROKE_WIDTH;

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
    }, [applyStrokeStyle]);

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
        return cropCanvasToDataUrl(canvas);
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
