import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { Express } from 'express';

export const initSentry = (app: Express) => {
  Sentry.init({
    dsn: process.env.SENTRY_DSN || '', // You'll need to add your Sentry DSN to environment variables
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Tracing.Integrations.Express({ app }),
    ],
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event) {
      // Filter out certain errors in development
      if (process.env.NODE_ENV === 'development') {
        // Don't send CORS errors or connection errors in development
        if (event.exception?.values?.[0]?.value?.includes('CORS') ||
            event.exception?.values?.[0]?.value?.includes('ECONNREFUSED')) {
          return null;
        }
      }
      return event;
    },
  });

  // Request handler must be the first middleware on the app
  app.use(Sentry.Handlers.requestHandler());
  
  // TracingHandler creates a trace for every incoming request
  app.use(Sentry.Handlers.tracingHandler());
};

export const setupSentryErrorHandler = (app: Express) => {
  // Error handler must be before any other error middleware and after all controllers
  app.use(Sentry.Handlers.errorHandler());
};

export const captureException = (error: Error, context?: Record<string, any>) => {
  if (context) {
    Sentry.withScope((scope) => {
      Object.keys(context).forEach(key => {
        scope.setContext(key, context[key]);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
};

export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  Sentry.captureMessage(message, level);
};

export const setUserContext = (user: { id: string; email?: string; role?: string }) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role,
  });
};

export { Sentry };
