// api/analyze/route.ts - Cleaned & Updated for all 13 parameters

import { NextResponse } from "next/server";
import { db } from "../../../../db";
import { analysisLogs } from "../../../../db/schema";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { eq, sql } from "drizzle-orm";


export const maxDuration = 60; // seconds - Vercel max for free tier

// --- Helper to get JWT token from header or cookie ---
async function getAuthToken(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.substring(7);

  const cookieStore = await cookies();
  return cookieStore.get("token")?.value || null;
}

export async function POST(req: Request) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  // --- Authorization ---
  const token = await getAuthToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const secret = process.env.JWT_SECRET!;
  let userId: number;
  try {
    const decoded = jwt.verify(token, secret) as { id: number; role: string };
    userId = decoded.id;
  } catch (e) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // --- Extract transformer info ---
  const transformerId = formData.get("transformer_id") as string;
  const location = formData.get("location") as string;
  const date = formData.get("date") as string;
  const time = formData.get("time") as string;
  const feedback = formData.get("feedback") as string || null;
  const isNewTransformer = formData.get("is_new_transformer") === "true";

  const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
  
  // Add AbortController for timeout
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout


  try {
    
    const res = await fetch(`${backendUrl}/predict`, {
    method: "POST",
    body: formData,
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  if (!res.ok) {
    const errText = await res.text();
    let errData: any = {};
    try { errData = JSON.parse(errText); } catch {}
    throw new Error(errData.detail || "Backend analysis failed");
  }

  const text = await res.text();
  if (!text || text.trim() === '') {
    throw new Error("Empty response from backend");
  }

  const analysisData = JSON.parse(text);

    // --- Health Index & Status Calculation ---
    // Backend returns RAW DEFECT SUM (0-78): Higher score = More defects = Worse health
    // We convert to HEALTH PERCENTAGE (0-100): Higher percentage = Better health
    const rawDefectSum = analysisData.healthIndex || 0;
    const healthPercentage = Math.max(0, 100 - (rawDefectSum / 78.0) * 100);

    // Determine status based on health percentage
    let status: 'Healthy' | 'Moderate' | 'Critical' = 'Critical';
    if (healthPercentage > 80) status = 'Healthy';
    else if (healthPercentage > 40) status = 'Moderate';

    // --- Prepare parameters for logging ---
    // The Python backend returns 'paramsScores' as a dictionary: { "Rust": 4.0, ... }
    const paramsScores = analysisData.paramsScores || {};

    // --- Save log to database only if there are PMT images ---
    const pmtImages = analysisData.providedImages || [];
    let dbAction: 'created' | 'updated' | 'skipped' = 'skipped';
    
    if (pmtImages.length > 0) {
      // Check if transformer_id already exists
      const existingRecord = await db
        .select()
        .from(analysisLogs)
        .where(eq(analysisLogs.transformerId, transformerId))
        .limit(1);

      // If user is trying to create new transformer but ID already exists, reject
      if (isNewTransformer && existingRecord.length > 0) {
        return NextResponse.json({
          error: "Transformer ID already exists",
          message: "This Transformer ID already exists in the database. Please select it from 'Select Existing' to update its data.",
          existingId: transformerId
        }, { status: 409 }); // 409 Conflict
      }

      // For NEW transformers: Check if any image hash is already used by another transformer
      if (isNewTransformer) {
        const imageHashes = pmtImages
          .map((img: any) => img.imageHash)
          .filter((hash: string) => hash && hash.length > 0);

        for (const hash of imageHashes) {
          try {
            // Query for existing record with this hash
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
                message: `This image is already registered with transformer "${existingTransformerId}". Please select that transformer to update, or use different images.`,
                existingTransformerId
              }, { status: 409 });
            }
          } catch (err) {
            console.warn("Hash check failed, continuing:", err);
          }
        }
      }

      if (existingRecord.length > 0) {
        // Update existing record
        await db
          .update(analysisLogs)
          .set({
            userId,
            location,
            inferenceDate: date,
            inferenceTime: time,
            feedback: feedback,
            healthIndexScore: parseFloat(Number(rawDefectSum).toFixed(2)),
            paramsScores,
            providedImages: pmtImages,
            gradCamImages: analysisData.gradCamImages || [],
            status: status,
          })
          .where(eq(analysisLogs.transformerId, transformerId));
        dbAction = 'updated';
      } else {
        // Create new record
        await db.insert(analysisLogs).values({
          userId,
          transformerId,
          location,
          inferenceDate: date,
          inferenceTime: time,
          feedback: feedback,
          healthIndexScore: parseFloat(Number(rawDefectSum).toFixed(2)),
          paramsScores,
          providedImages: pmtImages,
          gradCamImages: analysisData.gradCamImages || [],
          status: status,
        });
        dbAction = 'created';
      }
    }

    // --- Return full results to frontend ---
    return NextResponse.json({
      ...analysisData,
      dbAction, // 'created', 'updated', or 'skipped'
    });
  } catch (error) {
    console.error("Error in /api/analyze:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
