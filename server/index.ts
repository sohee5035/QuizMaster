import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { logEnvironmentStatus } from "./environment";

const app = express();

// Trust proxy to get real IP addresses in production
app.set('trust proxy', true);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Perform comprehensive environment validation
  const envValidation = await logEnvironmentStatus();
  
  // In production, fail fast only if there are actual errors (not warnings)
  if (process.env.NODE_ENV === 'production' && !envValidation.isValid) {
    console.error('\n💥 Production deployment cannot start due to configuration errors');
    console.error('Please fix the above issues and redeploy');
    process.exit(1);
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  
  // Validate port number
  if (isNaN(port) || port <= 0 || port > 65535) {
    const errorMsg = `Invalid port number: ${process.env.PORT}. Using default port 5000.`;
    log(errorMsg);
    console.warn(`⚠️  ${errorMsg}`);
  }
  
  const serverPort = isNaN(port) || port <= 0 || port > 65535 ? 5000 : port;
  
  server.listen({
    port: serverPort,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`✅ Server started successfully on port ${serverPort}`);
    if (process.env.NODE_ENV === 'production') {
      log(`🚀 Production deployment ready at http://0.0.0.0:${serverPort}`);
    } else {
      log(`🛠️  Development server ready at http://localhost:${serverPort}`);
    }
  }).on('error', (error: any) => {
    console.error('❌ Server failed to start:', error);
    
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${serverPort} is already in use. Please:
        1. Choose a different port by setting the PORT environment variable
        2. Stop the process using this port
        3. Wait a moment and try again`);
    } else if (error.code === 'EACCES') {
      console.error(`❌ Permission denied to bind to port ${serverPort}. Please:
        1. Use a port number above 1024
        2. Run with appropriate permissions
        3. Check firewall settings`);
    } else if (error.code === 'ENOTFOUND') {
      console.error(`❌ Network interface not found. Please check network configuration.`);
    } else {
      console.error(`❌ Server startup failed with error code: ${error.code}`);
      console.error(`   Error message: ${error.message}`);
    }
    
    console.log('\n📋 Troubleshooting tips:');
    console.log('   • Ensure PORT environment variable is set correctly');
    console.log('   • Check that no other process is using the port');
    console.log('   • Verify network configuration and firewall settings');
    console.log('   • For production deployments, ensure all secrets are configured');
    
    // In production, exit with error code
    if (process.env.NODE_ENV === 'production') {
      console.error('💥 Exiting due to server startup failure in production');
      process.exit(1);
    } else {
      console.warn('⚠️  Development mode: Server startup failed but process continues');
    }
  });
})();
