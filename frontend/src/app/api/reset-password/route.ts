import { db } from "../../../../db";
import { users } from "../../../../db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    try {
        const { token, newPassword } = await req.json();

        // Find user with valid token and expiry > now
        const user = await db.query.users.findFirst({
            where: (users, { eq, and, gt }) => and(
                eq(users.resetToken, token),
                gt(users.resetTokenExpiry, new Date())
            ),
        });

        if (!user) {
            return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user
        await db.update(users)
            .set({
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null
            })
            .where(eq(users.id, user.id));

        return NextResponse.json({ message: "Password reset successful" });
    } catch (err) {
        console.error("Reset password error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
