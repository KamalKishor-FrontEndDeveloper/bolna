import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Process-level handlers: log unhandled errors and avoid crashing in production.
process.on('unhandledRejection', (reason, promise) => {
  console.error('[unhandledRejection] reason:', reason, 'promise:', promise);
  if (process.env.NODE_ENV !== 'production' && process.env.CRASH_ON_ERROR === 'true') {
    // Allow crashing in dev when explicitly requested for debugging
    throw reason as any;
  }
});

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
  if (process.env.NODE_ENV !== 'production' && process.env.CRASH_ON_ERROR === 'true') {
    // In dev allow exit so you see stack traces; in production keep running to avoid 502s
    process.exit(1);
  }
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  // app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  //   const status = err.status || err.statusCode || 500;
  //   const message = err.message || "Internal Server Error";

  //   res.status(status).json({ message });
  //   throw err;
  // });


  app.use((err:any, _req:any, res:any, _next:any) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error('[ERROR HANDLER]', err); // log full error with prefix
  res.status(status).json({ message });
  // Only crash in dev when explicitly requested
  if (process.env.NODE_ENV !== 'production' && process.env.CRASH_ON_ERROR === 'true') {
    throw err;
  }
});
  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // Health check endpoint for load balancers / readiness probes
  app.get('/_health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
