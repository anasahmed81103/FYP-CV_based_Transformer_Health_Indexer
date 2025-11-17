// api/analyze/route.ts - MODIFIED TO SAVE LOGS

import { NextResponse } from "next/server";
import { db } from "../../../../db"; // Assuming 4 levels up
import { analysisLogs } from "../../../../db/schema";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export async function POST(req: Request) {
    let rawFormData: FormData;
    try {
        rawFormData = await req.formData();
    } catch (e) {
        return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }
    
    // 1. EXTRACT DATA AND AUTHORIZATION
    const token = cookies().get("token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const secret = process.env.JWT_SECRET!;
    const decoded = jwt.verify(token, secret) as { id: number, role: string }; // Get user ID from token
    const userId = decoded.id;

    const transformerId = rawFormData.get('transformer_id') as string;
    const location = rawFormData.get('location') as string;
    const date = rawFormData.get('date') as string;
    const time = rawFormData.get('time') as string;
    
    // Extract images paths/data if needed, but for analysis, we pass the file objects.

    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

    try {
        // 2. CALL EXTERNAL ANALYSIS API
        const res = await fetch(`${backendUrl}/predict`, {
            method: "POST",
            body: rawFormData,
        });

        if (!res.ok) {
             const errorData = await res.json();
             throw new Error(errorData.detail || "Analysis backend error");
        }

        const analysisData = await res.json();
        
        // 3. PROCESS ANALYSIS RESULTS
        const healthIndexScore = analysisData.healthIndex || 0;
        const status = healthIndexScore > 80 ? 'Healthy' : healthIndexScore > 60 ? 'Moderate' : 'Critical';
        
        // Simple conversion of array to object for paramsScores based on expected format
        const paramsScores = (analysisData.topParameters || []).reduce((acc: Record<string, number>, p: { name: string, score: number }) => {
            acc[p.name] = p.score;
            return acc;
        }, {});


        // 4. SAVE LOG TO DATABASE
        await db.insert(analysisLogs).values({
            userId: userId,
            transformerId: transformerId,
            location: location,
            inferenceDate: date,
            inferenceTime: time,
            healthIndexScore: healthIndexScore,
            paramsScores: paramsScores,
            providedImages: analysisData.providedImages || null,
            gradCamImages: analysisData.gradcamImages || null,
            status: status,
        });


        // 5. RETURN SUCCESS RESPONSE
        return NextResponse.json(analysisData);
    } catch (error) {
        console.error("Error in /api/analyze:", error);
        return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
    }
}