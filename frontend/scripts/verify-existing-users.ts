import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

dotenv.config({ path: ".env.local" });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
});

const db = drizzle(pool);

async function main() {
    console.log("🔄 Marking all existing users as verified...");

    try {
        // Update all users where isEmailVerified is null or "false" to "true"
        const result = await db.update(users)
            .set({
                isEmailVerified: "true",
                verificationToken: null,
                verificationTokenExpiry: null
            })
            .where(eq(users.isEmailVerified, "false"));

        console.log("✅ All existing users have been marked as verified!");
        console.log("📝 They can now log in without email verification.");
        console.log("📧 New signups from now on will require email verification.");
    } catch (error) {
        console.error("❌ Error updating users:", error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
