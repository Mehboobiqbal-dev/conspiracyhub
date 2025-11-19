import { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  role: 'user' | 'moderator' | 'admin';
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  phoneNumber?: string;
  phoneVerified?: boolean;
  avatar?: string;
  bio?: string;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
    emailNotifications: boolean;
    smsNotifications: boolean;
  };
  oauthProviders: {
    google?: string;
    twitter?: string;
  };
  subscriptionTier: 'free' | 'premium' | 'enterprise';
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  refreshTokens?: string[];
  isActive: boolean;
  auditLog: Array<{
    action: string;
    timestamp: Date;
    ip?: string;
    userAgent?: string;
  }>;
}

export interface UserProfile {
  _id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  bio?: string;
  subscriptionTier: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
}

export function sanitizeUser(user: User): UserProfile {
  return {
    _id: user._id?.toString() || '',
    email: user.email,
    name: user.name,
    role: user.role,
    avatar: user.avatar,
    bio: user.bio,
    subscriptionTier: user.subscriptionTier,
    emailVerified: user.emailVerified,
    twoFactorEnabled: user.twoFactorEnabled,
  };
}











