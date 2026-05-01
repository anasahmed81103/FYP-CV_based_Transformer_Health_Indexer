// api/transformers/route.ts - Fetch existing transformer IDs with pagination

import { NextResponse } from "next/server";
import { db } from "../../../../db";
import { analysisLogs } from "../../../../db/schema";
import { sql } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "30");
  const search = (searchParams.get("search") || "").trim();

  const offset = (page - 1) * limit;
  const prefixPattern = `${search}%`;

  try {
    // Count distinct IDs, optionally filtered by typed prefix.
    const countResult = search
      ? await db.execute(sql`
          SELECT COUNT(DISTINCT transformer_id) as count
          FROM analysis_logs
          WHERE transformer_id ILIKE ${prefixPattern}
        `)
      : await db
          .select({ count: sql<number>`count(DISTINCT transformer_id)` })
          .from(analysisLogs);

    const rawCount = Array.isArray(countResult)
      ? Number((countResult[0] as { count?: number | string } | undefined)?.count ?? 0)
      : Number(
          (countResult as { rows?: Array<{ count?: number | string }> })?.rows?.[0]?.count ?? 0
        );
    const totalCount = Number.isFinite(rawCount) ? rawCount : 0;

    // Fetch paginated unique IDs with latest location, with optional prefix filtering.
    const result = search
      ? await db.execute(sql`
          SELECT DISTINCT ON (transformer_id) 
            transformer_id as "transformerId",
            location as "location"
          FROM analysis_logs
          WHERE transformer_id ILIKE ${prefixPattern}
          ORDER BY transformer_id, created_at DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `)
      : await db.execute(sql`
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
      search,
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
