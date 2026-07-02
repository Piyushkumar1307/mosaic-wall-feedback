import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { feedback, wallSlots, wallState } from "@/db/schema";
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

async function getWallItemCount(db: ReturnType<typeof getDb>) {
  const slots = await db.query.wallSlots.findMany();
  return slots.length;
}

export async function ensureWallState() {
  const db = getDb();
  const existing = await db.query.wallState.findFirst({
    where: eq(wallState.id, 1),
  });

  if (!existing) {
    await db.insert(wallState).values({ id: 1, nextSlot: 0, totalSubmitted: 0 });
  }
}

export async function submitFeedback(imageData: string): Promise<WallItem> {
  const db = getDb();
  await ensureWallState();

  const [newFeedback] = await db
    .insert(feedback)
    .values({ content: imageData })
    .returning();

  const state = await db.query.wallState.findFirst({
    where: eq(wallState.id, 1),
  });

  if (!state) {
    throw new Error("Wall state missing");
  }

  const targetSlot = state.nextSlot;
  const nextSlot = (targetSlot + 1) % WALL_SIZE;

  const existingAtSlot = await db.query.wallSlots.findFirst({
    where: eq(wallSlots.slotIndex, targetSlot),
  });

  const currentCount = await getWallItemCount(db);
  const itemCount = existingAtSlot ? currentCount : currentCount + 1;
  const placement = getSlotPlacement(targetSlot, itemCount);

  if (existingAtSlot) {
    await db
      .update(wallSlots)
      .set({
        feedbackId: newFeedback.id,
        updatedAt: new Date(),
        ...placement,
      })
      .where(eq(wallSlots.slotIndex, targetSlot));
  } else {
    await db.insert(wallSlots).values({
      slotIndex: targetSlot,
      feedbackId: newFeedback.id,
      ...placement,
    });
  }

  await db
    .update(wallState)
    .set({
      nextSlot,
      totalSubmitted: state.totalSubmitted + 1,
    })
    .where(eq(wallState.id, 1));

  return {
    slotIndex: targetSlot,
    feedbackId: newFeedback.id,
    imageData: newFeedback.content,
    ...placement,
    createdAt: newFeedback.createdAt.toISOString(),
  };
}

export async function getWallItems(): Promise<WallItem[]> {
  const db = getDb();
  const rows = await db
    .select({
      slotIndex: wallSlots.slotIndex,
      feedbackId: feedback.id,
      imageData: feedback.content,
      posX: wallSlots.posX,
      posY: wallSlots.posY,
      rotation: wallSlots.rotation,
      scale: wallSlots.scale,
      createdAt: feedback.createdAt,
    })
    .from(wallSlots)
    .innerJoin(feedback, eq(wallSlots.feedbackId, feedback.id))
    .orderBy(wallSlots.updatedAt);

  return rows
    .filter((row) => row.imageData.startsWith("data:image/"))
    .map((row) => ({
    slotIndex: row.slotIndex,
    feedbackId: row.feedbackId,
    imageData: row.imageData,
    posX: row.posX,
    posY: row.posY,
    rotation: row.rotation,
    scale: row.scale,
    createdAt: row.createdAt.toISOString(),
  }));
}
