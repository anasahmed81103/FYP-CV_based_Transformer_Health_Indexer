// api/transformers/route.ts - Fetch existing transformer IDs with pagination

import { NextResponse } from "next/server";
import { db } from "../../../../db";
import { analysisLogs } from "../../../../db/schema";
import { sql } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "30");

  const offset = (page - 1) * limit;

  try {
    // Get total count of DISTINCT transformer IDs
    const countResult = await db
      .select({ count: sql<number>`count(DISTINCT transformer_id)` })
      .from(analysisLogs);
    const totalCount = Number(countResult[0]?.count || 0);

    // Fetch paginated DISTINCT transformer IDs with their latest location
    // Using PostgreSQL DISTINCT ON to get unique transformers
    const result = await db.execute(sql`
      SELECT DISTINCT ON (transformer_id) 
        transformer_id as "transformerId",
        location as "location"
      FROM analysis_logs
      ORDER BY transformer_id, created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `);

    const transformers = result.rows || result;

    return NextResponse.json({
      transformers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: offset + (Array.isArray(transformers) ? transformers.length : 0) < totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching transformers:", error);
    return NextResponse.json({ error: "Failed to fetch transformers" }, { status: 500 });
  }
}
