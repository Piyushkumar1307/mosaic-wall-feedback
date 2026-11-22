import { WALL_SIZE } from "@/lib/constants";

const COLS = 5;
const ROWS = 6;
const PAD_X = 1.75;
const PAD_TOP = 8;
const PAD_BOTTOM = 2;
const GAP = 0;

export type SlotLayout = {
  posX: number;
  posY: number;
  slotWidthPct: number;
  slotHeightPct: number;
  rotation: number;
  scale: number;
};

function densityScale(itemCount: number) {
  if (itemCount <= 6) return 1.24;
  if (itemCount <= 12) return 1.2;
  if (itemCount <= 20) return 1.16;
  if (itemCount <= 26) return 1.12;
  return 1.08;
}

export function getSlotLayout(
  slotIndex: number,
  itemCount: number,
): SlotLayout {
  const safeCount = Math.min(Math.max(itemCount, 1), WALL_SIZE);
  const col = slotIndex % COLS;
  const row = Math.floor(slotIndex / COLS);

  const cellW = (100 - PAD_X * 2 - GAP * (COLS - 1)) / COLS;
  const cellH = (100 - PAD_TOP - PAD_BOTTOM - GAP * (ROWS - 1)) / ROWS;

  const posX = PAD_X + col * (cellW + GAP) + cellW / 2;
  const posY = PAD_TOP + row * (cellH + GAP) + cellH / 2;

  return {
    posX,
    posY,
    slotWidthPct: cellW,
    slotHeightPct: cellH,
    rotation: ((slotIndex * 13) % 15) - 7,
    scale: densityScale(safeCount),
  };
}
