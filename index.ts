import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import eventRoutes from './routes/events';
import userRoutes from './routes/user';
import adminRoutes from './routes/admin';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'https://parivadi.netlify.app',
  'https://eventhall.onrender.com',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allow any localhost origin for development
    if (origin && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
      return callback(null, true);
    }
    
    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Firebase health check
app.get('/api/health/firebase', (req, res) => {
  const hasProjectId = !!process.env.FIREBASE_PROJECT_ID;
  const hasClientEmail = !!process.env.FIREBASE_CLIENT_EMAIL;
  const hasPrivateKey = !!process.env.FIREBASE_PRIVATE_KEY;
  const privateKeyLength = process.env.FIREBASE_PRIVATE_KEY?.length || 0;
  
  res.json({
    firebase: {
      configured: hasProjectId && hasClientEmail && hasPrivateKey,
      projectId: hasProjectId ? 'set' : 'missing',
      clientEmail: hasClientEmail ? 'set' : 'missing',
      privateKey: hasPrivateKey ? `set (${privateKeyLength} chars)` : 'missing',
      privateKeyPreview: hasPrivateKey 
        ? process.env.FIREBASE_PRIVATE_KEY?.substring(0, 50) + '...' 
        : 'N/A'
    }
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/me', userRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});
