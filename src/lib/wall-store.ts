import "server-only";

import { v2 as cloudinary } from "cloudinary";
import { WALL_SIZE } from "@/lib/constants";

const SIGNATURE_FOLDER = "mosaicwall-feedback/signatures";

export type WallItem = {
  slotIndex: number;
  feedbackId: string;
  name: string;
  imageData: string;
  createdAt: string;
};

type WallListener = (items: WallItem[]) => void;

type CloudinaryAsset = {
  public_id: string;
  secure_url: string;
  created_at: string;
  context?: {
    custom?: Record<string, string>;
  };
};

const listeners = new Set<WallListener>();
let isConfigured = false;

function getCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
    );
  }

  if (!isConfigured) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    isConfigured = true;
  }

  return cloudinary;
}

function toWallItem(asset: CloudinaryAsset, fallbackSlotIndex: number): WallItem {
  const context = asset.context?.custom ?? {};
  const parsedSlotIndex = Number.parseInt(context.slotIndex ?? "", 10);
  const slotIndex =
    Number.isInteger(parsedSlotIndex) &&
    parsedSlotIndex >= 0 &&
    parsedSlotIndex < WALL_SIZE
      ? parsedSlotIndex
      : fallbackSlotIndex;

  return {
    slotIndex,
    feedbackId: asset.public_id,
    name: context.name || "Guest",
    imageData: asset.secure_url,
    createdAt: asset.created_at,
  };
}

async function getStoredItems(): Promise<WallItem[]> {
  const result = await getCloudinary().api.resources({
    resource_type: "image",
    type: "upload",
    prefix: `${SIGNATURE_FOLDER}/`,
    max_results: 100,
    context: true,
  });

  const assets = (result.resources as CloudinaryAsset[])
    .sort(
      (a, b) =>
        Date.parse(a.created_at || "") - Date.parse(b.created_at || ""),
    )
    .slice(-WALL_SIZE);

  return assets.map((asset, index) => toWallItem(asset, index));
}

function notify(items: WallItem[]) {
  for (const listener of listeners) {
    listener(items);
  }
}

export async function getWallItems(): Promise<WallItem[]> {
  return getStoredItems();
}

export function subscribe(listener: WallListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export async function submitFeedback({
  name,
  imageData,
}: Pick<WallItem, "name" | "imageData">): Promise<WallItem> {
  const client = getCloudinary();
  const existingItems = await getStoredItems();
  const oldestItem =
    existingItems.length >= WALL_SIZE ? existingItems[0] : undefined;
  const usedSlots = new Set(existingItems.map((item) => item.slotIndex));
  const slotIndex =
    oldestItem?.slotIndex ??
    Array.from({ length: WALL_SIZE }, (_, index) => index).find(
      (index) => !usedSlots.has(index),
    ) ?? 0;

  const upload = await client.uploader.upload(imageData, {
    folder: SIGNATURE_FOLDER,
    public_id: `signature-${Date.now()}-${crypto.randomUUID()}`,
    resource_type: "image",
    overwrite: false,
    context: {
      name,
      slotIndex: String(slotIndex),
    },
  });

  if (oldestItem) {
    await client.uploader.destroy(oldestItem.feedbackId, {
      resource_type: "image",
      invalidate: true,
    });
  }

  const item = toWallItem(
    {
      public_id: upload.public_id,
      secure_url: upload.secure_url,
      created_at: upload.created_at,
      context: {
        custom: { name, slotIndex: String(slotIndex) },
      },
    },
    slotIndex,
  );
  const wallItems = await getStoredItems();
  notify(wallItems);

  return item;
}
