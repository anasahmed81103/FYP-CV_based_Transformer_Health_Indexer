// api/analyze/route.ts - Cleaned & Updated for all 13 parameters

import { NextResponse } from "next/server";
import { db } from "../../../../db";
import { analysisLogs } from "../../../../db/schema";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

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

  const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

  try {
    // --- Call backend model API ---
    const res = await fetch(`${backendUrl}/predict`, { method: "POST", body: formData });
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || "Backend analysis failed");
    }

    const analysisData = await res.json();

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

    // --- Save log to database ---
    await db.insert(analysisLogs).values({
      userId,
      transformerId,
      location,
      inferenceDate: date,
      inferenceTime: time,
      healthIndexScore: parseFloat(Number(rawDefectSum).toFixed(2)), // Store RAW DEFECT SUM (0-78) to match dashboard display
      paramsScores, // JSONB field
      providedImages: analysisData.providedImages || [],
      gradCamImages: analysisData.gradCamImages || [],
      status: status,
    });

    // --- Return full results to frontend ---
    return NextResponse.json(analysisData);
  } catch (error) {
    console.error("Error in /api/analyze:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
