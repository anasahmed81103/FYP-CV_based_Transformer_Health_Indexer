// api/transformers/[id]/features/route.ts - Fetch stored features for a transformer

import { NextResponse } from "next/server";
import { db } from "../../../../../../db";
import { analysisLogs } from "../../../../../../db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: transformerId } = await params;

    if (!transformerId) {
      return NextResponse.json({ error: "Transformer ID required" }, { status: 400 });
    }

    // Fetch the transformer record with its stored features
    const result = await db
      .select({
        transformerId: analysisLogs.transformerId,
        providedImages: analysisLogs.providedImages,
      })
      .from(analysisLogs)
      .where(eq(analysisLogs.transformerId, transformerId))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({ 
        features: [], 
        message: "No stored features found for this transformer" 
      });
    }

    // providedImages contains array of feature objects
    const storedFeatures = result[0].providedImages || [];

    return NextResponse.json({
      transformerId: result[0].transformerId,
      features: storedFeatures,
    });
  } catch (error) {
    console.error("Error fetching transformer features:", error);
    return NextResponse.json({ error: "Failed to fetch features" }, { status: 500 });
  }
}
