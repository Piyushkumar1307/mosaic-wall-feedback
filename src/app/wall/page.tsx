"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WALL_SIZE } from "@/lib/constants";
import { getSlotLayout } from "@/lib/wall-layout";

const IDLE_REPLAY_DELAY_MS = 10 * 60 * 1000;
const ENTRY_ANIMATION_MS = 2_000;
const REPLAY_INTERVAL_MS = ENTRY_ANIMATION_MS + 450;
type WallItem = {
  slotIndex: number;
  feedbackId: string;
  name: string;
  imageData: string;
  createdAt: string;
};

function isValidImageData(value: string) {
  return (
    value.startsWith("data:image/") ||
    value.startsWith("https://res.cloudinary.com/")
  );
}

type WallDoodleProps = {
  item: WallItem;
  itemCount: number;
  isEntering: boolean;
  onEnterComplete: (id: string) => void;
  onError: (id: string) => void;
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
        ["--card-scale" as string]: layout.scale,
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
  const [enteringIds, setEnteringIds] = useState<Set<string>>(new Set());
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [lastActivityAt, setLastActivityAt] = useState<number | null>(null);
  const wallArtboardRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<WallItem[]>([]);
  const initialFetchDoneRef = useRef(false);
  const hasCapturedFullWallRef = useRef(false);

  const handleEnterComplete = useCallback((id: string) => {
    setEnteringIds((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }, []);

  const handleImageError = useCallback((id: string) => {
    setHiddenIds((current) => new Set(current).add(id));
  }, []);

  const triggerEntrance = useCallback((id: string) => {
    setEnteringIds((current) => new Set(current).add(id));
  }, []);

  const downloadFullWallSnapshot = useCallback(async () => {
    const artboard = wallArtboardRef.current;
    if (!artboard) return;

    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(artboard, {
        backgroundColor: "#000000",
        scale: 2,
        useCORS: true,
        logging: false,
      });

      canvas.toBlob((blob) => {
        if (!blob) return;

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const timestamp = new Date()
          .toISOString()
          .replace(/[:.]/g, "-");
        link.href = url;
        link.download = `signature-wall-${timestamp}.png`;
        link.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    } catch {
      // The wall remains usable if a browser blocks an automatic download.
    }
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
        for (const id of addedIds) triggerEntrance(id);
      }

      itemsRef.current = validItems;
      setItems(validItems);

      if (options?.fromInitialFetch) {
        const latestSavedAt = Math.max(
          ...validItems.map((item) => Date.parse(item.createdAt) || 0),
        );
        setLastActivityAt(latestSavedAt || Date.now());
      } else if (addedIds.length > 0) {
        // A new signature pauses any idle replay for another ten minutes.
        setLastActivityAt(Date.now());
      }
    },
    [triggerEntrance],
  );

  useEffect(() => {
    if (items.length < WALL_SIZE || lastActivityAt === null) return;

    let replayInterval: number | undefined;
    let replayCursor = 0;
    const delay = Math.max(
      0,
      lastActivityAt + IDLE_REPLAY_DELAY_MS - Date.now(),
    );

    const startReplay = () => {
      const replayNext = () => {
        const wallItems = [...itemsRef.current].sort(
          (a, b) => a.slotIndex - b.slotIndex,
        );
        const item = wallItems[replayCursor % wallItems.length];
        if (!item) return;

        triggerEntrance(item.feedbackId);
        replayCursor += 1;
      };

      replayNext();
      replayInterval = window.setInterval(replayNext, REPLAY_INTERVAL_MS);
    };

    const replayTimeout = window.setTimeout(startReplay, delay);

    return () => {
      window.clearTimeout(replayTimeout);
      if (replayInterval !== undefined) window.clearInterval(replayInterval);
    };
  }, [items.length, lastActivityAt, triggerEntrance]);

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

  useEffect(() => {
    if (itemCount < WALL_SIZE) {
      hasCapturedFullWallRef.current = false;
      return;
    }

    if (hasCapturedFullWallRef.current) return;
    hasCapturedFullWallRef.current = true;

    // Wait until the signature that completes the wall has reached its slot.
    const snapshotTimer = window.setTimeout(
      () => void downloadFullWallSnapshot(),
      ENTRY_ANIMATION_MS + 200,
    );

    return () => window.clearTimeout(snapshotTimer);
  }, [downloadFullWallSnapshot, itemCount]);

  return (
    <main className="wall-shell">
      <section className="wall-canvas" aria-label="Signed feedback">
        <h1 className="sr-only">Signature Wall</h1>
        <div ref={wallArtboardRef} className="wall-artboard">
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
        </div>
      </section>
    </main>
  );
}
