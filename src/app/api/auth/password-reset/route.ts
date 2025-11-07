import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/db/mongodb';
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password';
import { User } from '@/lib/models/user';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { z } from 'zod';

const requestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Request password reset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || 'request';

    if (action === 'request') {
      const validated = requestSchema.parse(body);
      const usersCollection = await getCollection<User>('users');
      const user = await usersCollection.findOne({ 
        email: validated.email.toLowerCase() 
      });

      // Don't reveal if user exists for security
      if (user) {
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date();
        resetExpires.setHours(resetExpires.getHours() + 1); // 1 hour expiry

        await usersCollection.updateOne(
          { _id: user._id },
          {
            $set: {
              resetPasswordToken: resetToken,
              resetPasswordExpires: resetExpires,
            },
          }
        );

        // Send email (configure your email service)
        if (process.env.SMTP_HOST && process.env.SMTP_USER) {
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          });

          const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;
          
          await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: user.email,
            subject: 'Password Reset Request - Opinion Arena Network',
            html: `
              <h2>Password Reset Request</h2>
              <p>You requested a password reset. Click the link below to reset your password:</p>
              <a href="${resetUrl}">${resetUrl}</a>
              <p>This link will expire in 1 hour.</p>
              <p>If you didn't request this, please ignore this email.</p>
            `,
          });
        }
      }

      return NextResponse.json({
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    } else if (action === 'reset') {
      const validated = resetSchema.parse(body);
      const usersCollection = await getCollection<User>('users');
      const user = await usersCollection.findOne({
        resetPasswordToken: validated.token,
        resetPasswordExpires: { $gt: new Date() },
      });

      if (!user) {
        return NextResponse.json(
          { error: 'Invalid or expired reset token' },
          { status: 400 }
        );
      }

      // Validate password strength
      const passwordValidation = validatePasswordStrength(validated.password);
      if (!passwordValidation.valid) {
        return NextResponse.json(
          { error: 'Password validation failed', details: passwordValidation.errors },
          { status: 400 }
        );
      }

      // Hash new password
      const passwordHash = await hashPassword(validated.password);

      // Update user
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $set: {
            passwordHash,
            updatedAt: new Date(),
          },
          $unset: {
            resetPasswordToken: '',
            resetPasswordExpires: '',
          },
          $push: {
            auditLog: {
              action: 'password_reset',
              timestamp: new Date(),
              ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
              userAgent: request.headers.get('user-agent') || undefined,
            },
          },
        }
      );

      return NextResponse.json({
        message: 'Password reset successful',
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

