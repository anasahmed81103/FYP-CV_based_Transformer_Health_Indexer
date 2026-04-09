import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import { db } from "../../../../db";
import { analysisLogs } from "../../../../db/schema";
import { eq } from "drizzle-orm";

// --- Helper to get JWT ---
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

  // --- AUTH ---
  const token = await getAuthToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const secret = process.env.JWT_SECRET!;
  let userId: number;

  try {
    const decoded = jwt.verify(token, secret) as { id: number };
    userId = decoded.id;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // --- Extract Data ---
  const transformerId = formData.get("transformer_id") as string;
  const originalScoresStr = formData.get("original_scores") as string;
  const correctedScoresStr = formData.get("corrected_scores") as string;

  const files = formData.getAll("files");

  const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

  try {
    // --- Forward to Python backend (unchanged) ---
    const backendForm = new FormData();
    backendForm.append("transformer_id", transformerId);
    backendForm.append("original_scores", originalScoresStr);
    backendForm.append("corrected_scores", correctedScoresStr);

    files.forEach((file: any) => {
      backendForm.append("files", file);
    });

    const res = await fetch(`${backendUrl}/submit-corrections`, {
      method: "POST",
      body: backendForm,
    });

    if (!res.ok) {
      throw new Error("Backend failed");
    }

    const backendData = await res.json();

    // ================================
    // ✅ NEW: Recalculate Health Index
    // ================================
    const correctedScores = JSON.parse(correctedScoresStr || "[]");

    const newDefectSum = correctedScores.reduce((sum: number, param: any) => {
      return sum + Number(param.score || 0);
    }, 0);

    // ================================
    // OPTIONAL: Update DB
    // ================================
    await db
      .update(analysisLogs)
      .set({
        feedback: backendData.message || "User corrected scores",
        healthIndexScore: parseFloat(newDefectSum.toFixed(2)), // update score
        paramsScores: correctedScores // overwrite with corrected
      })
      .where(eq(analysisLogs.transformerId, transformerId));

    // ================================
    // ✅ FINAL RESPONSE TO FRONTEND
    // ================================
    return NextResponse.json({
      success: true,
      message: "Corrections applied successfully",
      newHealthIndex: parseFloat(newDefectSum.toFixed(2)),
      correctedParameters: correctedScores,
    });

  } catch (err) {
    console.error("Error in /api/submit-corrections:", err);
    return NextResponse.json({ error: "Failed to submit corrections" }, { status: 500 });
  }
}
