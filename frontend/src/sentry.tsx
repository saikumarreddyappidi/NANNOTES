import React from 'react';

// Temporary Sentry configuration - packages need to be installed first
// To install: npm install @sentry/react @sentry/tracing

export const initSentry = (): void => {
  console.log('⚠️ Sentry not initialized - packages need to be installed');
  console.log('📦 Run: npm install @sentry/react @sentry/tracing');
  console.log('🔧 Then uncomment the imports and configuration in sentry.tsx');
};

// Temporary stub functions
export const captureException = (error: Error, context?: Record<string, any>): void => {
  console.error('Captured error (Sentry not active):', error, context);
};

export const captureMessage = (message: string, level: string = 'info'): void => {
  console.log(`Captured message (${level}):`, message);
};

export const setUserContext = (user: { id: string; email?: string; role?: string }): void => {
  console.log('Set user context (Sentry not active):', user);
};

// Temporary error boundary component with proper React types
interface SentryErrorBoundaryProps {
  children: React.ReactNode;
}

export const SentryErrorBoundary: React.FC<SentryErrorBoundaryProps> = ({ children }) => {
  return <React.Fragment>{children}</React.Fragment>;
};

// Stub functions that match original API
export const useSentryUser = (user: any): void => {
  console.log('Set Sentry user (not active):', user);
};

export const captureSentryException = (error: Error, context?: any): void => {
  console.error('Captured Sentry exception (not active):', error, context);
};

export const captureSentryMessage = (message: string, level: string = 'info'): void => {
  console.log(`Captured Sentry message (${level}):`, message);
};
