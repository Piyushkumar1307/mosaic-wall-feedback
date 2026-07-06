import { WALL_SIZE } from "@/lib/constants";

const COLS = 5;
const ROWS = 6;
const PAD_X = 3;
const PAD_Y = 2;
const GAP = 0.8;
const VERTICAL_SHIFT = -5;

export type SlotLayout = {
  posX: number;
  posY: number;
  slotWidthPct: number;
  slotHeightPct: number;
  rotation: number;
  scale: number;
};

function densityScale(itemCount: number) {
  if (itemCount <= 6) return 1.2;
  if (itemCount <= 12) return 1.1;
  if (itemCount <= 20) return 1;
  if (itemCount <= 26) return 0.92;
  return 0.85;
}

export function getSlotLayout(
  slotIndex: number,
  itemCount: number,
): SlotLayout {
  const safeCount = Math.min(Math.max(itemCount, 1), WALL_SIZE);
  const col = slotIndex % COLS;
  const row = Math.floor(slotIndex / COLS);

  const cellW = (100 - PAD_X * 2 - GAP * (COLS - 1)) / COLS;
  const cellH = (100 - PAD_Y * 2 - GAP * (ROWS - 1)) / ROWS;

  const posX = PAD_X + col * (cellW + GAP) + cellW / 2;
  const posY =
    PAD_Y + row * (cellH + GAP) + cellH / 2 + VERTICAL_SHIFT;

  return {
    posX,
    posY,
    slotWidthPct: cellW * 0.98,
    slotHeightPct: cellH * 0.98,
    rotation: ((slotIndex * 13) % 15) - 7,
    scale: densityScale(safeCount),
  };
}

export function getSlotPlacement(slotIndex: number, itemCount: number) {
  const layout = getSlotLayout(slotIndex, itemCount);

  return {
    posX: layout.posX,
    posY: layout.posY,
    rotation: layout.rotation,
    scale: layout.scale,
  };
}
