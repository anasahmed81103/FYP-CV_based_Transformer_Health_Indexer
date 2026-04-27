// api/analyze/route.ts - Cleaned & Updated for all 13 parameters

import { NextResponse } from "next/server";
import { db } from "../../../../db";
import { analysisLogs } from "../../../../db/schema";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { eq, sql } from "drizzle-orm";




// --- Helper to get JWT token from header or cookie ---
async function getAuthToken(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.substring(7);

  const cookieStore = await cookies();
  return cookieStore.get("token")?.value || null;
}

export async function POST(req: Request) {
  const token = await getAuthToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const secret = process.env.JWT_SECRET!;
  let userId: number;
  try {
    const decoded = jwt.verify(token, secret) as { id: number; role: string };
    userId = decoded.id;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      transformer_id: transformerId,
      location,
      date,
      time,
      feedback,
      is_new_transformer: isNewTransformer,
      analysisData,
    } = body;

    const rawDefectSum = analysisData.healthIndex || 0;
    const healthPercentage = Math.max(0, 100 - (rawDefectSum / 78.0) * 100);
    let status: 'Healthy' | 'Moderate' | 'Critical' = 'Critical';
    if (healthPercentage > 80) status = 'Healthy';
    else if (healthPercentage > 40) status = 'Moderate';

    const paramsScores = analysisData.paramsScores || {};
    const pmtImages = analysisData.providedImages || [];
    let dbAction: 'created' | 'updated' | 'skipped' = 'skipped';

    if (pmtImages.length > 0) {
      const existingRecord = await db
        .select()
        .from(analysisLogs)
        .where(eq(analysisLogs.transformerId, transformerId))
        .limit(1);

      if (isNewTransformer && existingRecord.length > 0) {
        return NextResponse.json({
          error: "Transformer ID already exists",
          message: "This Transformer ID already exists. Please select it from 'Select Existing'.",
          existingId: transformerId,
        }, { status: 409 });
      }

      if (isNewTransformer) {
        const imageHashes = pmtImages
          .map((img: any) => img.imageHash)
          .filter((hash: string) => hash && hash.length > 0);

        for (const hash of imageHashes) {
          try {
            const duplicateCheck = await db.execute(sql`
              SELECT transformer_id 
              FROM analysis_logs 
              WHERE provided_images @> ${JSON.stringify([{ imageHash: hash }])}::jsonb
              LIMIT 1
            `);
            const rows = duplicateCheck.rows || duplicateCheck;
            if (rows && rows.length > 0) {
              const existingTransformerId = (rows[0] as any).transformer_id;
              return NextResponse.json({
                error: "Duplicate image detected",
                message: `This image is already registered with transformer "${existingTransformerId}".`,
                existingTransformerId,
              }, { status: 409 });
            }
          } catch (err) {
            console.warn("Hash check failed, continuing:", err);
          }
        }
      }

      if (existingRecord.length > 0) {
        await db.update(analysisLogs).set({
          userId, location,
          inferenceDate: date, inferenceTime: time, feedback,
          healthIndexScore: parseFloat(Number(rawDefectSum).toFixed(2)),
          paramsScores,
          providedImages: pmtImages,
          gradCamImages: analysisData.gradCamImages || [],
          status,
        }).where(eq(analysisLogs.transformerId, transformerId));
        dbAction = 'updated';
      } else {
        await db.insert(analysisLogs).values({
          userId, transformerId, location,
          inferenceDate: date, inferenceTime: time, feedback,
          healthIndexScore: parseFloat(Number(rawDefectSum).toFixed(2)),
          paramsScores,
          providedImages: pmtImages,
          gradCamImages: analysisData.gradCamImages || [],
          status,
        });
        dbAction = 'created';
      }
    }

    return NextResponse.json({ dbAction });
  }catch (error) {
    console.error("Error in /api/analyze:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
