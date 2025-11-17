// api/signup/route.ts - REFINED

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

// Import paths adjusted for a deeply nested file (assuming 5 levels up to root)
import { db } from "../../../../db"; 
// Import tables directly if your db/schema file exports them individually
import { users } from "../../../../db/schema"; 

export async function POST(req: Request) {
  try {
    // CHANGE: Destructure firstName and lastName instead of name
    const { firstName, lastName, email, password } = await req.json();

    // --- 1. CHECK EXISTING USER ---
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email),
    });

    if (existingUser)
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });

    // --- 2. HASH PASSWORD & INSERT USER ---
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // INSERT: firstName, lastName, email, and hashedPassword
    await db.insert(users).values({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });

    return NextResponse.json({ message: "Signup successful" }, { status: 201 });
  } catch (err) {
    console.error("Signup error:", err);
    // Important: Check that the database migration was run successfully before assuming a "Server error."
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}