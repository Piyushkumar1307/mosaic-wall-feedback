import { WALL_SIZE } from "@/lib/constants";
import { getSlotPlacement } from "@/lib/wall-layout";

export type WallItem = {
  slotIndex: number;
  feedbackId: number;
  imageData: string;
  posX: number;
  posY: number;
  rotation: number;
  scale: number;
  createdAt: string;
};

type SlotRecord = WallItem & { updatedAt: number };

type WallListener = (items: WallItem[]) => void;

const slots = new Map<number, SlotRecord>();
let nextSlot = 0;
let nextFeedbackId = 1;
const listeners = new Set<WallListener>();

function notify() {
  const items = getWallItems();
  for (const listener of listeners) {
    listener(items);
  }
}

export function getWallItems(): WallItem[] {
  return Array.from(slots.values())
    .filter((item) => item.imageData.startsWith("data:image/"))
    .sort((a, b) => a.updatedAt - b.updatedAt)
    .map(({ updatedAt: _updatedAt, ...item }) => item);
}

export function subscribe(listener: WallListener) {
  listeners.add(listener);
  listener(getWallItems());

  return () => {
    listeners.delete(listener);
  };
}

export function submitFeedback(imageData: string): WallItem {
  const targetSlot = nextSlot;
  nextSlot = (nextSlot + 1) % WALL_SIZE;

  const replacing = slots.has(targetSlot);
  const itemCount = replacing ? slots.size : slots.size + 1;
  const placement = getSlotPlacement(targetSlot, itemCount);
  const feedbackId = nextFeedbackId++;
  const createdAt = new Date().toISOString();

  const record: SlotRecord = {
    slotIndex: targetSlot,
    feedbackId,
    imageData,
    ...placement,
    createdAt,
    updatedAt: Date.now(),
  };

  slots.set(targetSlot, record);
  notify();

  const { updatedAt: _updatedAt, ...item } = record;
  return item;
}
