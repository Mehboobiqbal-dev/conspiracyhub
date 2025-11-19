import { ObjectId } from 'mongodb';

export interface AuditLog {
  _id?: ObjectId;
  userId?: ObjectId;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  complianceFlags?: string[];
}

export async function createAuditLog(
  collection: any,
  log: Omit<AuditLog, '_id' | 'timestamp'>
): Promise<void> {
  await collection.insertOne({
    ...log,
    timestamp: new Date(),
  });
}











