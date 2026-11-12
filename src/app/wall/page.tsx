"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSlotLayout } from "@/lib/wall-layout";
type WallItem = {
  slotIndex: number;
  feedbackId: number;
  name: string;
  imageData: string;
  createdAt: string;
};

function isValidImageData(value: string) {
  return value.startsWith("data:image/");
}

type WallDoodleProps = {
  item: WallItem;
  itemCount: number;
  isEntering: boolean;
  onEnterComplete: (id: number) => void;
  onError: (id: number) => void;
};

function WallDoodle({
  item,
  itemCount,
  isEntering,
  onEnterComplete,
  onError,
}: WallDoodleProps) {
  const layout = getSlotLayout(item.slotIndex, itemCount);

  return (
    <div
      className={`signature-card ${isEntering ? "signature-card-enter" : ""}`}
      style={{
        left: `${layout.posX}%`,
        top: `${layout.posY}%`,
        width: `${layout.slotWidthPct}%`,
        height: `${layout.slotHeightPct}%`,
        ["--final-left" as string]: `${layout.posX}%`,
        ["--final-top" as string]: `${layout.posY}%`,
      }}
      onAnimationEnd={(event) => {
        if (
          isEntering &&
          event.animationName === "signature-card-enter"
        ) {
          onEnterComplete(item.feedbackId);
        }
      }}
    >
      <img
        src={item.imageData}
        alt={`Signature of ${item.name || "guest"}`}
        className="signature-card-image"
        draggable={false}
        onError={() => onError(item.feedbackId)}
      />
      <p className="signature-card-name">{item.name || "Guest"}</p>
    </div>
  );
}

export default function WallPage() {
  const [items, setItems] = useState<WallItem[]>([]);
  const [enteringIds, setEnteringIds] = useState<Set<number>>(new Set());
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());
  const itemsRef = useRef<WallItem[]>([]);
  const initialFetchDoneRef = useRef(false);

  const handleEnterComplete = useCallback((id: number) => {
    setEnteringIds((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }, []);

  const handleImageError = useCallback((id: number) => {
    setHiddenIds((current) => new Set(current).add(id));
  }, []);

  const applyItems = useCallback(
    (incoming: WallItem[], options?: { fromInitialFetch?: boolean }) => {
      const validItems = incoming.filter((item) =>
        isValidImageData(item.imageData),
      );
      const previousIds = new Set(
        itemsRef.current.map((item) => item.feedbackId),
      );
      const addedIds = validItems
        .filter((item) => !previousIds.has(item.feedbackId))
        .map((item) => item.feedbackId);

      if (options?.fromInitialFetch) {
        // Existing doodles on page load — show without entry animation.
      } else if (addedIds.length > 0 && initialFetchDoneRef.current) {
        setEnteringIds((current) => new Set([...current, ...addedIds]));
      }

      itemsRef.current = validItems;
      setItems(validItems);
    },
    [],
  );

  useEffect(() => {
    let source: EventSource | null = null;
    let cancelled = false;

    const connect = () => {
      source = new EventSource("/api/feedback/stream");

      source.onmessage = (event) => {
        if (!event.data?.trim()) return;

        try {
          const data = JSON.parse(event.data) as { items: WallItem[] };
          applyItems(data.items);
        } catch {
          // ignore malformed payloads
        }
      };
      source.onerror = () => {
        source?.close();
        window.setTimeout(() => {
          if (!cancelled) connect();
        }, 1000);
      };
    };

    fetch("/api/feedback")
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to load feedback");
        const text = await response.text();
        if (!text.trim()) return { items: [] as WallItem[] };
        return JSON.parse(text) as { items: WallItem[] };
      })
      .then((data: { items: WallItem[] }) =>
        applyItems(data.items, { fromInitialFetch: true }),
      )
      .catch(() => {
        // ignore initial fetch errors; SSE will still connect
      })
      .finally(() => {
        if (cancelled) return;
        initialFetchDoneRef.current = true;
        connect();
      });

    return () => {
      cancelled = true;
      source?.close();
    };
  }, [applyItems]);

  const visibleItems = useMemo(
    () => items.filter((item) => !hiddenIds.has(item.feedbackId)),
    [items, hiddenIds],
  );

  const itemCount = visibleItems.length;

  return (
    <main className="wall-shell">
      <header className="wall-header" aria-label="Feedback Wall">
        <img
          src="/arc-logo.png"
          alt="Arc"
          className="wall-logo"
        />
        <h1 className="sr-only">Feedback Wall</h1>
      </header>
      <section className="wall-canvas" aria-label="Signed feedback">
        <div className="signature-card-list">
          {visibleItems.map((item) => (
            <WallDoodle
              key={item.feedbackId}
              item={item}
              itemCount={itemCount}
              isEntering={enteringIds.has(item.feedbackId)}
              onEnterComplete={handleEnterComplete}
              onError={handleImageError}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
