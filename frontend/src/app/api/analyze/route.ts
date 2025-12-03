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
  const decoded = jwt.verify(token, secret) as { id: number; role: string };
  const userId = decoded.id;

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

    // --- Health Index & Status ---
    const healthIndex = analysisData.healthIndex || 0;
    const status =
      healthIndex > 80 ? "Healthy" : healthIndex > 60 ? "Moderate" : "Critical";

    // --- Prepare parameters for logging ---
    const paramsScores: Record<string, number> = {};
    (analysisData.allParameters || []).forEach((p: { name: string; score: number }) => {
      paramsScores[p.name] = p.score;
    });

    // --- Save log to database ---
    await db.insert(analysisLogs).values({
      userId,
      transformerId,
      location,
      inferenceDate: date,
      inferenceTime: time,
      healthIndexScore: healthIndex,
      paramsScores,
      providedImages: analysisData.providedImages || null,
      gradCamImages: analysisData.gradcamImages || null,
      status,
    });

    // --- Return full results to frontend ---
    return NextResponse.json({
      healthIndex,
      allParameters: analysisData.allParameters || [], // all 13 parameters
      gradcamImages: analysisData.gradcamImages || [],
    });
  } catch (error) {
    console.error("Error in /api/analyze:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
