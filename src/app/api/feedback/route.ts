import { NextResponse } from "next/server";
import { getWallItems, submitFeedback } from "@/lib/wall";

const MAX_IMAGE_BYTES = 2_000_000;

export async function GET() {
  try {
    const items = await getWallItems();
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Failed to fetch wall:", error);
    return NextResponse.json(
      { error: "Failed to load feedback wall" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const imageData =
      typeof body.imageData === "string" ? body.imageData.trim() : "";

    if (!imageData) {
      return NextResponse.json(
        { error: "Please doodle something before sending" },
        { status: 400 },
      );
    }

    if (!imageData.startsWith("data:image/png;base64,")) {
      return NextResponse.json(
        { error: "Invalid doodle image format" },
        { status: 400 },
      );
    }

    const base64Length = imageData.length - "data:image/png;base64,".length;
    const approximateBytes = (base64Length * 3) / 4;

    if (approximateBytes > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Doodle is too large. Try a smaller drawing." },
        { status: 400 },
      );
    }

    const item = await submitFeedback(imageData);
    const items = await getWallItems();

    return NextResponse.json({ item, items }, { status: 201 });
  } catch (error) {
    console.error("Failed to submit feedback:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 },
    );
  }
}
