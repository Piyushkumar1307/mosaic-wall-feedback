import { WALL_SIZE } from "@/lib/constants";

export type WallItem = {
  slotIndex: number;
  feedbackId: number;
  imageData: string;
  createdAt: string;
};

type WallRecord = WallItem;

type WallListener = (items: WallItem[]) => void;

const queue: WallRecord[] = [];
let nextFeedbackId = 1;
const listeners = new Set<WallListener>();

function notify() {
  const items = getWallItems();
  for (const listener of listeners) {
    listener(items);
  }
}

export function getWallItems(): WallItem[] {
  return queue.filter((item) => item.imageData.startsWith("data:image/"));
}

export function subscribe(listener: WallListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function submitFeedback(imageData: string): WallItem {
  let slotIndex: number;

  if (queue.length >= WALL_SIZE) {
    const oldest = queue.shift();
    slotIndex = oldest?.slotIndex ?? 0;
  } else {
    slotIndex = queue.length;
  }

  const item: WallRecord = {
    slotIndex,
    feedbackId: nextFeedbackId++,
    imageData,
    createdAt: new Date().toISOString(),
  };

  queue.push(item);
  notify();

  return item;
}
