# 🚨 Sentry Error & Issue Tracking Setup

## Overview
Sentry has been integrated into the NANNOTES application for real-time error monitoring and issue tracking. This helps developers identify and fix problems quickly in both development and production environments.

## Features Implemented

### Frontend (React)
- **Error Boundary**: Wraps the entire application to catch React errors
- **Performance Monitoring**: Tracks page loads and user interactions
- **User Context**: Automatically captures user information when available
- **Custom Error Handling**: Provides utilities for manual error reporting
- **Development Filtering**: Filters out common development errors (network issues, hot reload errors)

### Backend (Node.js/Express)
- **Request Tracing**: Tracks all incoming HTTP requests
- **Error Handling**: Captures unhandled exceptions and promise rejections
- **Performance Monitoring**: Monitors API response times and database queries
- **User Context**: Links errors to specific users when authenticated
- **Express Integration**: Seamless integration with Express middleware

## Setup Instructions

### 1. Create a Sentry Account
1. Go to [sentry.io](https://sentry.io) and create a free account
2. Create a new project for your application
3. Choose "React" for frontend and "Node.js" for backend
4. Copy the DSN (Data Source Name) provided

### 2. Configure Environment Variables

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5001/api
REACT_APP_SENTRY_DSN=your_frontend_sentry_dsn_here
```

#### Backend (.env)
```env
PORT=5001
NODE_ENV=development
SENTRY_DSN=your_backend_sentry_dsn_here
```

### 3. Install Dependencies
The packages have been added to package.json:

#### Frontend
```bash
cd frontend
npm install
```

#### Backend
```bash
cd backend
npm install
```

## Files Modified/Created

### Frontend Files
- `src/sentry.ts` - Sentry configuration and utilities
- `src/index.tsx` - Sentry initialization
- `src/App.tsx` - Error boundary wrapper
- `package.json` - Added @sentry/react and @sentry/tracing dependencies

### Backend Files
- `src/sentry.ts` - Sentry configuration for Node.js
- `src/server-simple.ts` - Sentry middleware integration
- `package.json` - Added @sentry/node and @sentry/tracing dependencies

## Usage Examples

### Frontend Error Reporting
```typescript
import { captureException, captureMessage } from './sentry';

// Capture an exception
try {
  // Some risky operation
} catch (error) {
  captureException(error, { context: 'Additional info' });
}

// Capture a message
captureMessage('Something important happened', 'info');
```

### Backend Error Reporting
```typescript
import { captureException, setUserContext } from './sentry';

// Set user context for error tracking
setUserContext({
  id: user.id,
  email: user.email,
  role: user.role
});

// Capture an exception with context
try {
  // Some operation
} catch (error) {
  captureException(error, { userId: user.id, action: 'note_creation' });
}
```

## Benefits

1. **Real-time Error Monitoring**: Get notified immediately when errors occur
2. **Stack Traces**: See exactly where errors happened in your code
3. **User Context**: Know which users are affected by issues
4. **Performance Insights**: Monitor application performance and identify bottlenecks
5. **Release Tracking**: Track errors across different versions of your application
6. **Issue Prioritization**: Focus on the most critical and frequent issues first

## Development vs Production

### Development
- Errors are filtered to reduce noise (CORS, connection errors)
- 100% transaction sampling for detailed debugging
- Console logging remains active

### Production
- All errors are captured and reported
- 10% transaction sampling to reduce overhead
- Sensitive information is automatically scrubbed

## Security Considerations

- Sentry automatically scrubs sensitive data (passwords, credit cards, etc.)
- User PII is only sent if explicitly configured
- All data is transmitted over HTTPS
- Data retention policies can be configured in Sentry dashboard

## Next Steps

1. Set up your Sentry DSN in environment variables
2. Install the dependencies: `npm install` in both frontend and backend directories
3. Test error reporting by triggering a test error
4. Configure Sentry dashboard alerts and notifications
5. Set up release tracking for deployment monitoring

## Testing the Integration

To test if Sentry is working correctly:

1. **Frontend Test**: Add this button to any component:
```tsx
<button onClick={() => { throw new Error('Test Sentry Frontend'); }}>
  Test Sentry
</button>
```

2. **Backend Test**: Add this endpoint to your server:
```typescript
app.get('/api/test-sentry', (req, res) => {
  throw new Error('Test Sentry Backend');
});
```

3. Check your Sentry dashboard for the captured errors

## Support

- [Sentry Documentation](https://docs.sentry.io/)
- [React Integration Guide](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Node.js Integration Guide](https://docs.sentry.io/platforms/node/)
