import { Router } from 'express';
import { auth } from '../lib/firebase-admin';
import { prisma } from '../lib/prisma';
import { UserRole } from '@prisma/client';

const router = Router();

// Get ultimate admin emails from environment
const getUltimateAdminEmails = (): string[] => {
  const emails = process.env.ULTIMATE_ADMIN_EMAILS || '';
  return emails.split(',').map(e => e.trim()).filter(Boolean);
};

// Sync user on login/signup
router.post('/sync-user', async (req, res) => {
  try {
    const { idToken, profile } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'ID token is required' });
    }

    // Verify the Firebase token
    const decodedToken = await auth.verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user should be ultimate admin
    const ultimateAdminEmails = getUltimateAdminEmails();
    const isUltimateAdmin = ultimateAdminEmails.includes(email);

    // Upsert user in database
    const user = await prisma.user.upsert({
      where: { firebaseUid: uid },
      update: {
        email,
        fullName: profile?.fullName || name || email.split('@')[0],
        photoUrl: profile?.photoUrl || picture,
        ...(profile?.isStudent !== undefined && { isStudent: profile.isStudent }),
        ...(profile?.collegeName && { collegeName: profile.collegeName }),
        ...(isUltimateAdmin && { role: UserRole.ULTIMATE_ADMIN }),
      },
      create: {
        firebaseUid: uid,
        email,
        fullName: profile?.fullName || name || email.split('@')[0],
        photoUrl: profile?.photoUrl || picture,
        role: isUltimateAdmin ? UserRole.ULTIMATE_ADMIN : UserRole.STANDARD_USER,
        isStudent: profile?.isStudent ?? true,
        collegeName: profile?.collegeName || null,
      },
      include: {
        interests: {
          include: {
            category: true,
          },
        },
      },
    });

    // Check if user needs to complete profile
    const needsProfileCompletion = !user.interests || user.interests.length === 0;

    res.json({
      user: {
        id: user.id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        fullName: user.fullName,
        photoUrl: user.photoUrl,
        role: user.role,
        isStudent: user.isStudent,
        collegeName: user.collegeName,
        interests: user.interests.map(i => ({
          id: i.id,
          category: i.category,
        })),
      },
      needsProfileCompletion,
    });
  } catch (error) {
    console.error('Sync user error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    const message = error instanceof Error ? error.message : 'Failed to sync user';
    res.status(500).json({ 
      error: 'Failed to sync user',
      details: message,
      errorType: error instanceof Error ? error.name : 'UnknownError',
    });
  }
});

// Update user profile (complete profile or update)
router.post('/update-profile', async (req, res) => {
  try {
    const { idToken, profile } = req.body;

    if (!idToken) {
      return res.status(400).json({ error: 'ID token is required' });
    }

    const decodedToken = await auth.verifyIdToken(idToken);
    const { uid } = decodedToken;

    const user = await prisma.user.findUnique({
      where: { firebaseUid: uid },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        fullName: profile.fullName || user.fullName,
        isStudent: profile.isStudent ?? user.isStudent,
        collegeName: profile.collegeName || user.collegeName,
      },
    });

    // Update interests if provided
    if (profile.interests && Array.isArray(profile.interests)) {
      // Remove old interests
      await prisma.userInterest.deleteMany({
        where: { userId: user.id },
      });

      // Add new interests
      if (profile.interests.length > 0) {
        await prisma.userInterest.createMany({
          data: profile.interests.map((categoryId: string) => ({
            userId: user.id,
            categoryId,
          })),
        });
      }
    }

    // Fetch updated user with interests
    const finalUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        interests: {
          include: {
            category: true,
          },
        },
      },
    });

    res.json({
      user: {
        id: finalUser!.id,
        firebaseUid: finalUser!.firebaseUid,
        email: finalUser!.email,
        fullName: finalUser!.fullName,
        photoUrl: finalUser!.photoUrl,
        role: finalUser!.role,
        isStudent: finalUser!.isStudent,
        collegeName: finalUser!.collegeName,
        interests: finalUser!.interests.map(i => ({
          id: i.id,
          category: i.category,
        })),
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get all event categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.eventCategory.findMany({
      orderBy: { name: 'asc' },
    });

    res.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

export default router;
