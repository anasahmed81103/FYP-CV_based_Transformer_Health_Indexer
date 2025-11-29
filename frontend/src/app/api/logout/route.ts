import { NextResponse } from "next/server";

export async function POST() {
    const response = NextResponse.json({ message: "Logged out successfully" });

    // Clear the token cookie by setting maxAge to 0 and expiring it immediately
    response.cookies.set("token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        expires: new Date(0),
        path: "/",
    });

    return response;
}
