// Sentry stub implementation for NANNOTES
// This provides temporary functionality until real Sentry packages are installed

export const initSentry = (): void => {
  console.log('⚠️ Sentry stub - not fully initialized');
  console.log('📦 To enable: npm install @sentry/react @sentry/tracing');
};

export const captureException = (error: Error, context?: any): void => {
  console.error('Captured error (stub):', error, context);
};

export const captureMessage = (message: string, level: string = 'info'): void => {
  console.log(`Captured message (${level}):`, message);
};

export const setUserContext = (user: { id: string; email?: string; role?: string }): void => {
  console.log('Set user context (stub):', user);
};

// Simple error boundary stub that just passes through children
export const SentryErrorBoundary = ({ children }: { children: any }) => {
  return children;
};

export const useSentryUser = (user: any): void => {
  console.log('Sentry user (stub):', user);
};

export const captureSentryException = (error: Error, context?: any): void => {
  console.error('Sentry exception (stub):', error, context);
};

export const captureSentryMessage = (message: string, level: string = 'info'): void => {
  console.log(`Sentry message (${level}):`, message);
};
