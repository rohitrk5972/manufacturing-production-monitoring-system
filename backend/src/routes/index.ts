import { Router } from 'express';
import { metadataRouter } from './metadata.routes.js';
import { productionRouter } from './production.routes.js';
import { analyticsRouter } from './analytics.routes.js';

export const apiRouter = Router();

apiRouter.use('/metadata', metadataRouter);
apiRouter.use('/production-records', productionRouter);
apiRouter.use('/analytics', analyticsRouter);

// Root health check endpoint
apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Manufacturing Production Monitoring API',
    uptime: process.uptime(),
  });
});
