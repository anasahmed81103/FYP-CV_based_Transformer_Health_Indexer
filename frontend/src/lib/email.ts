import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
    },
});

export async function sendPasswordResetEmail(to: string, token: string) {
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    console.log("DEBUG: Checking SMTP Credentials...");
    console.log("DEBUG: SMTP_USER:", process.env.SMTP_USER ? "Loaded" : "Missing");
    console.log("DEBUG: SMTP_PASSWORD:", process.env.SMTP_PASSWORD ? "Loaded" : "Missing");

    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        console.warn("⚠️ SMTP credentials not found. Logging email to console instead.");
        console.log(`[MOCK EMAIL] To: ${to}`);
        console.log(`[MOCK EMAIL] Link: ${resetLink}`);
        return;
    }

    try {
        const info = await transporter.sendMail({
            from: `"Health Indexer" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
            to,
            subject: 'Password Reset Request',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #1f2937; margin-top: 0;">Reset Your Password</h2>
            <p style="color: #4b5563; line-height: 1.6;">You requested a password reset for your Health Indexer account.</p>
            
            <div style="margin: 30px 0;">
              <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 10px;">For Web Users:</h3>
              <p style="color: #4b5563; margin-bottom: 15px;">Click the button below to reset your password:</p>
              <a href="${resetLink}" style="display: inline-block; background-color: #6366F1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
            </div>

            <div style="margin: 30px 0; padding: 20px; background-color: #f3f4f6; border-radius: 6px; border-left: 4px solid #6366F1;">
              <h3 style="color: #1f2937; font-size: 16px; margin-top: 0;">For Mobile App Users:</h3>
              <p style="color: #4b5563; margin-bottom: 10px;">Copy and paste this token into the app:</p>
              <div style="background-color: white; padding: 15px; border-radius: 4px; border: 1px solid #d1d5db; font-family: monospace; font-size: 14px; word-break: break-all; color: #1f2937;">
                ${token}
              </div>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">If you didn't request this, you can safely ignore this email.</p>
            <p style="color: #6b7280; font-size: 14px;">This link and token will expire in 1 hour.</p>
          </div>
        </div>
      `,
        });

        console.log("✅ Message sent: %s", info.messageId);
    } catch (error) {
        console.error("❌ Error sending email:", error);
        // Re-throw the original error so we can see what went wrong
        throw error;
    }
}

export async function sendVerificationEmail(to: string, token: string, firstName: string) {
    const verificationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

    console.log("DEBUG: Sending verification email...");
    console.log("DEBUG: SMTP_USER:", process.env.SMTP_USER ? "Loaded" : "Missing");
    console.log("DEBUG: SMTP_PASSWORD:", process.env.SMTP_PASSWORD ? "Loaded" : "Missing");

    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        console.warn("⚠️ SMTP credentials not found. Logging email to console instead.");
        console.log(`[MOCK EMAIL] To: ${to}`);
        console.log(`[MOCK EMAIL] Link: ${verificationLink}`);
        console.log(`[MOCK EMAIL] Token: ${token}`);
        return;
    }

    try {
        const info = await transporter.sendMail({
            from: `"Health Indexer" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
            to,
            subject: 'Verify Your Email Address',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #1f2937; margin-top: 0;">Welcome to Health Indexer!</h2>
            <p style="color: #4b5563; line-height: 1.6;">Hi ${firstName},</p>
            <p style="color: #4b5563; line-height: 1.6;">Thank you for signing up! Please verify your email address to activate your account.</p>
            
            <div style="margin: 30px 0;">
              <h3 style="color: #1f2937; font-size: 16px; margin-bottom: 10px;">For Web Users:</h3>
              <p style="color: #4b5563; margin-bottom: 15px;">Click the button below to verify your email:</p>
              <a href="${verificationLink}" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Email</a>
            </div>

            <div style="margin: 30px 0; padding: 20px; background-color: #f3f4f6; border-radius: 6px; border-left: 4px solid #10b981;">
              <h3 style="color: #1f2937; font-size: 16px; margin-top: 0;">For Mobile App Users:</h3>
              <p style="color: #4b5563; margin-bottom: 10px;">Copy and paste this verification code into the app:</p>
              <div style="background-color: white; padding: 15px; border-radius: 4px; border: 1px solid #d1d5db; font-family: monospace; font-size: 14px; word-break: break-all; color: #1f2937;">
                ${token}
              </div>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">If you didn't create an account, you can safely ignore this email.</p>
            <p style="color: #6b7280; font-size: 14px;">This verification link will expire in 24 hours.</p>
          </div>
        </div>
      `,
        });

        console.log("✅ Verification email sent: %s", info.messageId);
    } catch (error) {
        console.error("❌ Error sending verification email:", error);
        throw error;
    }
}
