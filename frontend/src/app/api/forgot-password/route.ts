import { db } from "../../../../db";
import { users } from "../../../../db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { sendPasswordResetEmail } from "../../../lib/email";

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        const user = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.email, email),
        });

        if (!user) {
            // For security, don't reveal if email exists
            return NextResponse.json({ message: "If an account exists, a reset link has been sent." });
        }

        // Generate token
        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

        // Save to DB
        await db.update(users)
            .set({ resetToken, resetTokenExpiry })
            .where(eq(users.id, user.id));

        // Send Email
        await sendPasswordResetEmail(email, resetToken);

        return NextResponse.json({ message: "If an account exists, a reset link has been sent." });
    } catch (err) {
        console.error("Forgot password error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
