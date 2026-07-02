"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSlotLayout } from "@/lib/wall-layout";

type WallItem = {
  slotIndex: number;
  feedbackId: number;
  imageData: string;
  posX: number;
  posY: number;
  rotation: number;
  scale: number;
  createdAt: string;
};

const ENTER_ANIMATION_MS = 2400;

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

  useEffect(() => {
    if (!isEntering) return;

    const timer = window.setTimeout(() => {
      onEnterComplete(item.feedbackId);
    }, ENTER_ANIMATION_MS);

    return () => window.clearTimeout(timer);
  }, [isEntering, item.feedbackId, onEnterComplete]);

  const travelX = `${50 - layout.posX}%`;
  const travelY = `${50 - layout.posY}%`;

  return (
    <div
      className={`wall-slot ${isEntering ? "wall-slot-enter" : ""}`}
      style={{
        left: `${layout.posX}%`,
        top: `${layout.posY}%`,
        width: `${layout.slotWidthPct}%`,
        height: `${layout.slotHeightPct}%`,
        ["--slot-w" as string]: `${layout.slotWidthPct}%`,
        ["--slot-h" as string]: `${layout.slotHeightPct}%`,
        ["--travel-x" as string]: travelX,
        ["--travel-y" as string]: travelY,
      }}
    >
      <img
        src={item.imageData}
        alt=""
        className={`wall-doodle ${
          isEntering ? "wall-doodle-enter" : "wall-doodle-float"
        }`}
        style={{
          ["--rotation" as string]: `${layout.rotation}deg`,
          ["--scale" as string]: layout.scale,
          ["--float-duration" as string]: `${5.5 + (item.feedbackId % 4)}s`,
          ["--float-delay" as string]: `${(item.feedbackId % 6) * 0.25}s`,
        }}
        draggable={false}
        onError={() => onError(item.feedbackId)}
      />
    </div>
  );
}

export default function WallPage() {
  const [items, setItems] = useState<WallItem[]>([]);
  const [enteringIds, setEnteringIds] = useState<Set<number>>(new Set());
  const [hiddenIds, setHiddenIds] = useState<Set<number>>(new Set());
  const isFirstLoadRef = useRef(true);

  const handleEnterComplete = useCallback((id: number) => {
    setEnteringIds((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  }, []);

  const handleImageError = useCallback((id: number) => {
    setHiddenIds((current) => new Set(current).add(id));
  }, []);

  const applyItems = useCallback((incoming: WallItem[]) => {
    const validItems = incoming.filter((item) => isValidImageData(item.imageData));

    setItems((previous) => {
      const previousIds = new Set(previous.map((item) => item.feedbackId));
      const addedIds = validItems
        .filter((item) => !previousIds.has(item.feedbackId))
        .map((item) => item.feedbackId);

      if (previous.length === 0 && validItems.length > 0 && isFirstLoadRef.current) {
        isFirstLoadRef.current = false;
      } else if (addedIds.length > 0) {
        setEnteringIds((current) => new Set([...current, ...addedIds]));
      }

      return validItems;
    });
  }, []);

  useEffect(() => {
    let source: EventSource | null = null;

    const connect = () => {
      source = new EventSource("/api/feedback/stream");

      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as { items: WallItem[] };
          applyItems(data.items);
        } catch {
          // ignore malformed payloads
        }
      };
      source.onerror = () => {
        source?.close();
        window.setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
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
      <section className="wall-canvas" aria-label="Floating feedback doodles">
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
      </section>
    </main>
  );
}
