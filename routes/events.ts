import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireEventAdmin, AuthRequest } from '../middleware/auth';
import { EventStatus } from '@prisma/client';

const router = Router();

// Get all events with filters (public - only published events for standard users)
router.get('/', async (req, res) => {
  try {
    const {
      category,
      district,
      search,
      dateFrom,
      dateTo,
      isFree,
      status,
      userId,
    } = req.query;

    const where: any = {};

    // Only show published events to public unless specified
    if (status) {
      where.status = status;
    } else if (!userId) {
      where.status = EventStatus.PUBLISHED;
    }

    if (category) {
      where.OR = [
        { primaryCategoryId: category },
        { additionalCategories: { some: { categoryId: category as string } } },
      ];
    }

    if (district) {
      where.district = district;
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { location: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = new Date(dateFrom as string);
      if (dateTo) where.date.lte = new Date(dateTo as string);
    }

    if (isFree !== undefined) {
      where.isFree = isFree === 'true';
    }

    if (userId) {
      where.createdByUserId = userId;
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
          },
        },
        _count: {
          select: {
            likes: true,
            registrations: true,
          },
        },
      },
      orderBy: [
        { date: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    res.json({ events });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get events by category (for personalized home feed)
router.get('/by-categories', async (req, res) => {
  try {
    const { categoryIds } = req.query;

    if (!categoryIds) {
      return res.status(400).json({ error: 'Category IDs are required' });
    }

    const ids = (categoryIds as string).split(',');
    
    const eventsByCategory: any = {};

    for (const categoryId of ids) {
      const events = await prisma.event.findMany({
        where: {
          status: EventStatus.PUBLISHED,
          OR: [
            { primaryCategoryId: categoryId },
            { additionalCategories: { some: { categoryId } } },
          ],
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
            },
          },
          _count: {
            select: {
              likes: true,
              registrations: true,
            },
          },
        },
        orderBy: { date: 'asc' },
        take: 10, // Limit per category for home feed
      });

      if (events.length > 0) {
        const category = await prisma.eventCategory.findUnique({
          where: { id: categoryId },
        });
        eventsByCategory[categoryId] = {
          category,
          events,
        };
      }
    }

    res.json({ eventsByCategory });
  } catch (error) {
    console.error('Get events by categories error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get single event by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
      where: { id },
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
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ event });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Create event (Event Admin only)
router.post('/', authenticate, requireEventAdmin, async (req: AuthRequest, res) => {
  try {
    const {
      title,
      description,
      date,
      time,
      location,
      district,
      googleMapsLink,
      primaryCategoryId,
      additionalCategoryIds,
      entryFee,
      isFree,
      prizeDetails,
      contactEmail,
      contactPhone,
      externalRegistrationLink,
      howToRegisterLink,
      instagramUrl,
      facebookUrl,
      youtubeUrl,
      bannerUrl,
    } = req.body;

    if (!title || !description || !date || !time || !location || !district || !primaryCategoryId || !contactEmail || !contactPhone) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }

    const event = await prisma.event.create({
      data: {
        title,
        description,
        date: new Date(date),
        time,
        location,
        district,
        googleMapsLink,
        primaryCategoryId,
        entryFee: isFree ? null : entryFee,
        isFree: isFree || false,
        prizeDetails,
        contactEmail,
        contactPhone,
        externalRegistrationLink,
        howToRegisterLink,
        instagramUrl,
        facebookUrl,
        youtubeUrl,
        bannerUrl,
        createdByUserId: req.user!.id,
        status: EventStatus.PENDING_APPROVAL,
        additionalCategories: additionalCategoryIds ? {
          create: additionalCategoryIds.map((categoryId: string) => ({
            categoryId,
          })),
        } : undefined,
      },
      include: {
        primaryCategory: true,
        additionalCategories: {
          include: {
            category: true,
          },
        },
      },
    });

    res.status(201).json({ event });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event (Event Admin - own events only, or Ultimate Admin)
router.put('/:id', authenticate, requireEventAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const existingEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check ownership (unless ultimate admin)
    if (userRole !== 'ULTIMATE_ADMIN' && existingEvent.createdByUserId !== userId) {
      return res.status(403).json({ error: 'You can only edit your own events' });
    }

    const {
      title,
      description,
      date,
      time,
      location,
      district,
      googleMapsLink,
      primaryCategoryId,
      additionalCategoryIds,
      entryFee,
      isFree,
      prizeDetails,
      contactEmail,
      contactPhone,
      externalRegistrationLink,
      howToRegisterLink,
      instagramUrl,
      facebookUrl,
      youtubeUrl,
      bannerUrl,
    } = req.body;

    // Remove old additional categories if updating
    if (additionalCategoryIds) {
      await prisma.eventAdditionalCategory.deleteMany({
        where: { eventId: id },
      });
    }

    const event = await prisma.event.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(date && { date: new Date(date) }),
        ...(time && { time }),
        ...(location && { location }),
        ...(district && { district }),
        googleMapsLink,
        ...(primaryCategoryId && { primaryCategoryId }),
        entryFee: isFree ? null : entryFee,
        ...(isFree !== undefined && { isFree }),
        prizeDetails,
        ...(contactEmail && { contactEmail }),
        ...(contactPhone && { contactPhone }),
        externalRegistrationLink,
        howToRegisterLink,
        instagramUrl,
        facebookUrl,
        youtubeUrl,
        bannerUrl,
        ...(additionalCategoryIds && {
          additionalCategories: {
            create: additionalCategoryIds.map((categoryId: string) => ({
              categoryId,
            })),
          },
        }),
        // Reset to pending approval after edit (unless ultimate admin)
        ...(userRole !== 'ULTIMATE_ADMIN' && existingEvent.status === EventStatus.PUBLISHED && {
          status: EventStatus.PENDING_APPROVAL,
        }),
      },
      include: {
        primaryCategory: true,
        additionalCategories: {
          include: {
            category: true,
          },
        },
      },
    });

    res.json({ event });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Like/Unlike event
router.post('/:id/like', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const existingLike = await prisma.eventLike.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId: id,
        },
      },
    });

    if (existingLike) {
      // Unlike
      await prisma.eventLike.delete({
        where: { id: existingLike.id },
      });
      res.json({ liked: false, message: 'Event unliked' });
    } else {
      // Like
      await prisma.eventLike.create({
        data: {
          userId,
          eventId: id,
        },
      });
      res.json({ liked: true, message: 'Event liked' });
    }
  } catch (error) {
    console.error('Like/unlike event error:', error);
    res.status(500).json({ error: 'Failed to like/unlike event' });
  }
});

// Register for event
router.post('/:id/register', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const existingRegistration = await prisma.eventRegistration.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId: id,
        },
      },
    });

    if (existingRegistration) {
      return res.status(400).json({ error: 'Already registered for this event' });
    }

    await prisma.eventRegistration.create({
      data: {
        userId,
        eventId: id,
      },
    });

    res.json({ message: 'Successfully registered for event' });
  } catch (error) {
    console.error('Register for event error:', error);
    res.status(500).json({ error: 'Failed to register for event' });
  }
});

// Check if user has liked or registered for events
router.post('/check-interactions', authenticate, async (req: AuthRequest, res) => {
  try {
    const { eventIds } = req.body;
    const userId = req.user!.id;

    if (!eventIds || !Array.isArray(eventIds)) {
      return res.status(400).json({ error: 'Event IDs array is required' });
    }

    const likes = await prisma.eventLike.findMany({
      where: {
        userId,
        eventId: { in: eventIds },
      },
      select: { eventId: true },
    });

    const registrations = await prisma.eventRegistration.findMany({
      where: {
        userId,
        eventId: { in: eventIds },
      },
      select: { eventId: true },
    });

    res.json({
      likedEventIds: likes.map((l: any) => l.eventId),
      registeredEventIds: registrations.map((r: any) => r.eventId),
    });
  } catch (error) {
    console.error('Check interactions error:', error);
    res.status(500).json({ error: 'Failed to check interactions' });
  }
});

export default router;
