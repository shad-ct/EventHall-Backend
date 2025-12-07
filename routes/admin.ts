import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireUltimateAdmin, AuthRequest } from '../middleware/auth';
import { ApplicationStatus, EventStatus, UserRole } from '@prisma/client';

const router = Router();

// Apply for admin role
router.post('/apply', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { motivationText } = req.body;

    if (!motivationText || motivationText.length < 50) {
      return res.status(400).json({ error: 'Motivation text must be at least 50 characters' });
    }

    // Check if user already has an admin role
    if (req.user!.role !== UserRole.STANDARD_USER) {
      return res.status(400).json({ error: 'You already have admin privileges' });
    }

    // Check if user has a pending application
    const existingApplication = await prisma.adminApplication.findFirst({
      where: {
        userId,
        status: ApplicationStatus.PENDING,
      },
    });

    if (existingApplication) {
      return res.status(400).json({ error: 'You already have a pending application' });
    }

    const application = await prisma.adminApplication.create({
      data: {
        userId,
        motivationText,
        status: ApplicationStatus.PENDING,
      },
    });

    res.status(201).json({
      application,
      message: 'Application submitted successfully',
    });
  } catch (error) {
    console.error('Apply for admin error:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// Get all admin applications (Ultimate Admin only)
router.get('/applications', authenticate, requireUltimateAdmin, async (req: AuthRequest, res) => {
  try {
    const { status } = req.query;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const applications = await prisma.adminApplication.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            photoUrl: true,
            isStudent: true,
            collegeName: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ applications });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Approve or reject admin application (Ultimate Admin only)
router.patch('/applications/:id', authenticate, requireUltimateAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'APPROVED' or 'REJECTED'
    const reviewerId = req.user!.id;

    if (!status || ![ApplicationStatus.APPROVED, ApplicationStatus.REJECTED].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const application = await prisma.adminApplication.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.status !== ApplicationStatus.PENDING) {
      return res.status(400).json({ error: 'Application has already been reviewed' });
    }

    // Update application
    const updatedApplication = await prisma.adminApplication.update({
      where: { id },
      data: {
        status,
        reviewedByUserId: reviewerId,
        reviewedAt: new Date(),
      },
    });

    // If approved, upgrade user role
    if (status === ApplicationStatus.APPROVED) {
      await prisma.user.update({
        where: { id: application.userId },
        data: { role: UserRole.EVENT_ADMIN },
      });
    }

    res.json({
      application: updatedApplication,
      message: status === ApplicationStatus.APPROVED
        ? 'Application approved and user upgraded to Event Admin'
        : 'Application rejected',
    });
  } catch (error) {
    console.error('Review application error:', error);
    res.status(500).json({ error: 'Failed to review application' });
  }
});

// Get all events pending approval (Ultimate Admin only)
router.get('/events/pending', authenticate, requireUltimateAdmin, async (req: AuthRequest, res) => {
  try {
    const events = await prisma.event.findMany({
      where: { status: EventStatus.PENDING_APPROVAL },
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
            email: true,
            photoUrl: true,
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
    console.error('Get pending events error:', error);
    res.status(500).json({ error: 'Failed to fetch pending events' });
  }
});

// Get all events (with any status) for admin management
router.get('/events/all', authenticate, requireUltimateAdmin, async (req: AuthRequest, res) => {
  try {
    const { status } = req.query;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const events = await prisma.event.findMany({
      where,
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
            email: true,
            photoUrl: true,
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
    console.error('Get all events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Update event status (Ultimate Admin only)
router.patch('/events/:id/status', authenticate, requireUltimateAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!status || !Object.values(EventStatus).includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        status,
        ...(status === EventStatus.REJECTED && rejectionReason && { rejectionReason }),
      },
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
            email: true,
          },
        },
      },
    });

    res.json({
      event: updatedEvent,
      message: `Event status updated to ${status}`,
    });
  } catch (error) {
    console.error('Update event status error:', error);
    res.status(500).json({ error: 'Failed to update event status' });
  }
});

// Get all users (Ultimate Admin only)
router.get('/users', authenticate, requireUltimateAdmin, async (req: AuthRequest, res) => {
  try {
    const { role } = req.query;

    const where: any = {};
    if (role) {
      where.role = role;
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        interests: {
          include: {
            category: true,
          },
        },
        _count: {
          select: {
            createdEvents: true,
            likedEvents: true,
            registrations: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
