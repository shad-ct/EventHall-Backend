import { Request, Response, NextFunction } from 'express';
import { auth } from '../lib/firebase-admin';
import { prisma } from '../lib/prisma';
import { UserRole } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    firebaseUid: string;
    email: string;
    role: UserRole;
    fullName: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }

    const token = authHeader.substring(7);
    
    // Handle mock token (development mode)
    if (token === 'mock-dev-token-for-testing') {
      const user = await prisma.user.findUnique({
        where: { email: 'muhammedshad9895@gmail.com' },
        select: {
          id: true,
          firebaseUid: true,
          email: true,
          role: true,
          fullName: true,
        },
      });

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized - User not found' });
      }

      req.user = user;
      return next();
    }
    
    // Verify Firebase token
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (error) {
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      select: {
        id: true,
        firebaseUid: true,
        email: true,
        role: true,
        fullName: true,
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
    }

    next();
  };
};

export const requireEventAdmin = requireRole(UserRole.EVENT_ADMIN, UserRole.ULTIMATE_ADMIN);
export const requireUltimateAdmin = requireRole(UserRole.ULTIMATE_ADMIN);
