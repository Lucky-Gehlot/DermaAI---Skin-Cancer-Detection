import path from 'node:path';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import { createApiRouter } from './src/server/routes.ts';
import { appendAuditLog, deleteStoredImageFile, mutateDatabase } from './src/server/store.ts';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

async function sweepExpiredImages() {
  const now = Date.now();
  await mutateDatabase((store) => {
    let purged = 0;
    for (const assessment of store.assessments) {
      if (assessment.imageStored && assessment.imageMetadata.expiresAt) {
        if (new Date(assessment.imageMetadata.expiresAt).getTime() <= now) {
          deleteStoredImageFile(assessment.imageMetadata.id);
          assessment.imageStored = false;
          assessment.imageDeletedAt = new Date().toISOString();
          purged += 1;
        }
      }
    }
    if (purged > 0) {
      appendAuditLog(store, {
        actorId: 'system',
        actorRole: 'system',
        action: 'RETENTION_SWEEP',
        targetType: 'image',
        targetId: 'batch',
        summary: `Automatically deleted ${purged} expired lesion image(s) per user retention policy.`,
        level: 'info',
      });
    }
  });
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows Vite/Google Fonts & AI Studio preview iframe cleanly
      crossOriginEmbedderPolicy: false,
      frameguard: false, // AI Studio preview runs inside an iframe
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use('/api', createApiRouter());

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  // Run initial retention sweep and schedule hourly cleanup
  sweepExpiredImages().catch((err) => console.error('Initial retention sweep error:', err));
  setInterval(() => {
    sweepExpiredImages().catch((err) => console.error('Retention sweep error:', err));
  }, 60 * 60 * 1000).unref();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DermaAI server listening on http://0.0.0.0:${PORT} (${isProduction ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start DermaAI server:', err);
  process.exit(1);
});
