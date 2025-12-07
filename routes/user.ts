import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get current user profile
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        interests: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

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
        interests: user.interests.map((i: any) => ({
          id: i.id,
          category: i.category,
        })),
      },
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Get user's liked events
router.get('/likes', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const likes = await prisma.eventLike.findMany({
      where: { userId },
      include: {
        event: {
          include: {
            primaryCategory: true,
            additionalCategories: {
              include: {
                category: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                fullName: true,
              },
            },
            _count: {
              select: {
                likes: true,
                registrations: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ events: likes.map((l: any) => l.event) });
  } catch (error) {
    console.error('Get liked events error:', error);
    res.status(500).json({ error: 'Failed to fetch liked events' });
  }
});

// Get user's registered events
router.get('/registrations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const registrations = await prisma.eventRegistration.findMany({
      where: { userId },
      include: {
        event: {
          include: {
            primaryCategory: true,
            additionalCategories: {
              include: {
                category: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                fullName: true,
              },
            },
            _count: {
              select: {
                likes: true,
                registrations: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ events: registrations.map((r: any) => r.event) });
  } catch (error) {
    console.error('Get registered events error:', error);
    res.status(500).json({ error: 'Failed to fetch registered events' });
  }
});

// Get user's created events (for event admins)
router.get('/events', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const events = await prisma.event.findMany({
      where: { createdByUserId: userId },
      include: {
        primaryCategory: true,
        additionalCategories: {
          include: {
            category: true,
          },
        },
        _count: {
          select: {
            likes: true,
            registrations: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ events });
  } catch (error) {
    console.error('Get user events error:', error);
    res.status(500).json({ error: 'Failed to fetch user events' });
  }
});

export default router;
