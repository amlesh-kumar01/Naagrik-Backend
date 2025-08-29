# Authentication API Documentation

## Overview

The Naagrik backend uses a JWT-based authentication system with Redis-backed session management and refresh token rotation for enhanced security.

## Table of Contents

1. [Authentication Flow](#authentication-flow)
2. [Session Management](#session-management)
3. [API Endpoints](#api-endpoints)
4. [Rate Limiting](#rate-limiting)
5. [Security Features](#security-features)
6. [Code Examples](#code-examples)
7. [Error Handling](#error-handling)

---

## Authentication Flow

### 1. Registration/Login Process
```
Client → POST /api/auth/register → Server
Client ← JWT Token + Refresh Token ← Server
```

### 2. Token Usage
```
Client → API Request with JWT in Authorization Header → Server
Server → Validates JWT → Processes Request
```

### 3. Token Refresh
```
Client → POST /api/auth/refresh with Refresh Token → Server
Client ← New JWT Token + New Refresh Token ← Server
```

---

## Session Management

### How Sessions Work

1. **Session Creation**: When a user logs in, a session is stored in Redis with user metadata
2. **Session Storage**: Sessions are stored with a 7-day TTL (Time To Live)
3. **Session Updates**: Last activity and refresh times are tracked
4. **Session Cleanup**: Sessions are automatically cleaned up when they expire

### Session Data Structure
```javascript
{
  userId: "uuid",
  loginTime: "2024-01-01T00:00:00.000Z",
  lastActivity: "2024-01-01T00:00:00.000Z",
  lastRefreshAt: "2024-01-01T00:00:00.000Z",
  userAgent: "Mozilla/5.0...",
  ip: "192.168.1.1"
}
```

### Refresh Token System

- **Refresh Tokens**: UUID-based tokens with 30-day expiration
- **Token Families**: Tracks token lineage for security
- **Rotation**: Each refresh generates a new token and invalidates the old one
- **Family Tracking**: Detects token reuse attacks

---

## API Endpoints

### POST /api/auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "fullName": "John Doe"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "role": "CITIZEN",
      "reputation_score": 0,
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "uuid"
  },
  "message": "User registered successfully"
}
```

**Validation Rules:**
- Email: Valid email format
- Password: Min 6 chars, must contain uppercase, lowercase, and number
- Full Name: 2-100 chars, letters and spaces only

**Rate Limit:** 5 requests per 15 minutes per IP

---

### POST /api/auth/login

Authenticate an existing user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "role": "CITIZEN",
      "reputation_score": 100
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "uuid"
  },
  "message": "Login successful"
}
```

**Error Responses:**
- `401`: Invalid email or password
- `429`: Rate limit exceeded

**Rate Limit:** 5 requests per 15 minutes per IP

---

### GET /api/auth/me

Get current user profile (requires authentication).

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "John Doe",
      "role": "CITIZEN",
      "reputation_score": 100,
      "created_at": "2024-01-01T00:00:00.000Z",
      "stats": {
        "issuesCreated": 5,
        "commentsPosted": 12,
        "votesGiven": 25
      },
      "badges": [
        {
          "id": 1,
          "name": "First Issue",
          "description": "Created your first issue",
          "earned_at": "2024-01-01T00:00:00.000Z"
        }
      ]
    }
  },
  "message": "Profile retrieved successfully"
}
```

**Error Responses:**
- `401`: Authentication required
- `404`: User not found

---

### POST /api/auth/refresh

Refresh JWT token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "new-uuid"
  },
  "message": "Token refreshed successfully"
}
```

**Error Responses:**
- `400`: Refresh token is required
- `401`: Invalid or expired refresh token
- `404`: User not found

**Rate Limit:** 5 requests per 15 minutes per IP

---

### POST /api/auth/logout

Logout user and invalidate session.

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body (Optional):**
```json
{
  "refreshToken": "uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": null,
  "message": "Logged out successfully"
}
```

---

## Rate Limiting

Authentication endpoints are protected with rate limiting:

### Rate Limit Headers
Every response includes rate limit information:
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 2024-01-01T00:15:00.000Z
```

### Rate Limit Rules
- **Auth endpoints**: 5 requests per 15 minutes per IP
- **General API**: 100 requests per hour per user/IP
- **Upload**: 10 requests per hour per user/IP
- **Comments**: 50 requests per hour per user

### Rate Limit Exceeded Response
```json
{
  "success": false,
  "message": "Rate limit exceeded",
  "data": {
    "limit": 5,
    "resetTime": 1704067200000
  }
}
```

---

## Security Features

### 1. JWT Tokens
- **Algorithm**: HS256
- **Expiration**: 7 days (configurable via `JWT_EXPIRES_IN`)
- **Secret**: Stored in environment variable `JWT_SECRET`

### 2. Refresh Token Security
- **UUID-based**: Cryptographically secure random tokens
- **Family tracking**: Detects and prevents token reuse attacks
- **Automatic rotation**: New token issued on each refresh
- **Expiration**: 30 days

### 3. Session Security
- **IP tracking**: Sessions track user IP for security monitoring
- **User-Agent tracking**: Detect suspicious session usage
- **Activity tracking**: Last activity timestamps
- **Automatic cleanup**: Expired sessions are automatically removed

### 4. Password Security
- **bcrypt hashing**: Passwords are hashed with bcrypt
- **Strong password requirements**: Uppercase, lowercase, and numbers required
- **No password storage**: Only hashes are stored

---

## Code Examples

### Frontend Integration (JavaScript)

#### 1. User Registration
```javascript
async function register(email, password, fullName) {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, fullName })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Store tokens
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      return data.data.user;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
}
```

#### 2. User Login
```javascript
async function login(email, password) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      return data.data.user;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}
```

#### 3. Making Authenticated Requests
```javascript
async function makeAuthenticatedRequest(url, options = {}) {
  const token = localStorage.getItem('token');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  });
  
  if (response.status === 401) {
    // Token might be expired, try to refresh
    const refreshed = await refreshToken();
    if (refreshed) {
      // Retry the request with new token
      return makeAuthenticatedRequest(url, options);
    } else {
      // Refresh failed, redirect to login
      window.location.href = '/login';
      return;
    }
  }
  
  return response.json();
}
```

#### 4. Token Refresh
```javascript
async function refreshToken() {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      return false;
    }
    
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken })
    });
    
    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      return true;
    } else {
      // Refresh failed, clear tokens
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      return false;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
    return false;
  }
}
```

#### 5. Logout
```javascript
async function logout() {
  try {
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken })
    });
    
    // Clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    
    // Redirect to login
    window.location.href = '/login';
  } catch (error) {
    console.error('Logout failed:', error);
    // Clear tokens anyway
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }
}
```

### React Hook Example
```javascript
import { useState, useEffect, createContext, useContext } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on app start
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.data.user);
      } else if (response.status === 401) {
        // Try to refresh token
        const refreshed = await refreshToken();
        if (refreshed) {
          await checkAuthStatus();
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const userData = await loginUser(email, password);
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

---

## Error Handling

### Common Error Responses

#### Validation Errors (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    },
    {
      "field": "password",
      "message": "Password must contain at least one uppercase letter"
    }
  ]
}
```

#### Authentication Errors (401)
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

#### User Already Exists (409)
```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

#### Rate Limit Exceeded (429)
```json
{
  "success": false,
  "message": "Rate limit exceeded",
  "data": {
    "limit": 5,
    "resetTime": 1704067200000
  }
}
```

#### Server Errors (500)
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Environment Variables

Required environment variables for authentication:

```env
# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Redis Configuration (optional, but recommended)
REDIS_URL=redis://localhost:6379
# or for Upstash Redis
REDIS_URL=rediss://username:password@host:port

# Database Configuration
DATABASE_URL=postgresql://user:password@host:port/database

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

---

## Testing

### Testing with cURL

#### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123",
    "fullName": "Test User"
  }'
```

#### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123"
  }'
```

#### Get Profile
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Refresh Token
```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your-refresh-token-uuid"
  }'
```

---

## Best Practices

### For Frontend Developers

1. **Store tokens securely**: Use httpOnly cookies for production apps
2. **Implement automatic token refresh**: Handle 401 responses gracefully
3. **Clear tokens on logout**: Always clear local storage/cookies
4. **Handle rate limits**: Implement exponential backoff for retry logic
5. **Validate responses**: Always check the `success` field in responses

### For Backend Integration

1. **Use middleware**: Protect routes with `authenticateToken` middleware
2. **Handle Redis gracefully**: App should work even if Redis is down
3. **Monitor rate limits**: Track rate limit violations
4. **Log security events**: Monitor login attempts and token usage
5. **Validate all inputs**: Use express-validator for all endpoints

---

## Troubleshooting

### Common Issues

#### "Cannot find module '../config/redis'"
- Create the missing `config/redis.js` file
- Or disable Redis features if not needed

#### Rate limit errors in development
- Use different IPs or reset rate limits manually
- Consider increasing limits for development

#### JWT token expired quickly
- Check `JWT_EXPIRES_IN` environment variable
- Implement proper token refresh logic

#### Session not persisting
- Verify Redis connection
- Check Redis TTL settings
- Ensure proper session creation

### Debug Mode

Set `NODE_ENV=development` to see detailed error messages in API responses.

---

This documentation covers the complete authentication system. For additional questions or issues, refer to the source code or contact the development team.
