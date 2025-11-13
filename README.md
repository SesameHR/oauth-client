# Sesame OAuth Client

OAuth 2.0 + OpenID Connect client library for Sesame SSO authentication - **Backend only**

[![npm version](https://img.shields.io/npm/v/@sesamehr/oauth-client.svg)](https://www.npmjs.com/package/@sesamehr/oauth-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- ✅ **RFC 6749 Compliant** - Proper OAuth 2.0 implementation with `application/x-www-form-urlencoded` and Basic Auth
- ✅ **CSRF Protection** - Built-in state validation with configurable TTL store
- ✅ **Automatic Cleanup** - Memory-efficient with periodic cleanup of expired states
- ✅ **Pluggable Storage** - Default in-memory store, easily swap for Redis or other distributed stores
- ✅ **Token Management** - Refresh and revoke tokens (RFC 7009)
- ✅ **Flexible API** - Fetch only what you need (tokens, user info, Sesame credentials)
- ✅ **Production Ready** - Proper timeout handling, error formatting, and security best practices

## Installation

```bash
npm install @sesamehr/oauth-client
# or
yarn add @sesamehr/oauth-client
```

## Quick Start

### Basic Usage (Express.js)

```javascript
import express from 'express';
import session from 'express-session';
import { SesameSSO } from '@sesamehr/oauth-client';

const app = express();

// Initialize Sesame SSO client
const sso = new SesameSSO({
  ssoBaseUrl: process.env.SSO_BASE_URL || 'https://sso.sesametime.com',
  clientId: process.env.OAUTH_CLIENT_ID,
  clientSecret: process.env.OAUTH_CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI || 'http://localhost:3000/callback'
});

// Configure session middleware
app.use(session({
  secret: 'your-secret',
  resave: false,
  saveUninitialized: false
}));

// Login route - redirect to SSO
app.get('/login', (req, res) => {
  const { url, state } = sso.getLoginUrl();
  req.session.oauthState = state; // Store state for CSRF validation
  res.redirect(url);
});

// Callback route - handle OAuth callback
app.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  try {
    // Exchange code for tokens and fetch user data
    const result = await sso.exchangeCodeForToken(code, state);

    // Store tokens in session
    req.session.tokens = result;

    res.json({
      message: 'Login successful!',
      user: result.userData,
      sesameCredentials: result.sesameCredentials
    });
  } catch (error) {
    res.status(401).send(`Authentication failed: ${error.message}`);
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

## Response Examples

### Complete Authentication Response

When calling `exchangeCodeForToken()`, you receive a complete object with tokens and user information:

```javascript
{
  // OAuth 2.0 tokens
  accessToken: "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUz...",
  refreshToken: "def50200a1b2c3d4e5f6...",
  expiresIn: 3600,
  tokenType: "Bearer",
  
  // User information (OpenID Connect claims)
  userData: {
    sub: "019a0aee-a55f-73e4-8e88-38f451f69a08",
    name: "John Doe",
    email: "john.doe@example.com",
    email_verified: false,
    sesame_connected: true,
    sesame_user_id: "8cfec462-505d-48bf-8455-30aedb8a72ff",
    region: "EU1",
    employees: [
      {
        sesame_employee_id: "f5700683-b929-4165-bbd5-ec79cb2e009d",
        company_id: "562e4aae-b234-4467-bc8b-7c0ebca5fb54",
        company_name: "Acme Corp",
        full_name: "John Doe"
      }
    ]
  },
  
  // Sesame API credentials (for direct API access)
  sesameCredentials: {
    sesame_private_token: "7d83d7feff2b9dd8165d...",
    sesame_public_token: "a1b2c3d4e5f6...",
    region: "EU1",
    sesame_user_id: "8cfec462-505d-48bf-8455-30aedb8a72ff",
    employees: [
      {
        sesame_employee_id: "f5700683-b929-4165-bbd5-ec79cb2e009d",
        company_id: "562e4aae-b234-4467-bc8b-7c0ebca5fb54",
        company_name: "Acme Corp",
        full_name: "John Doe"
      }
    ]
  }
}
```

### Multi-Company Support

Users can be associated with multiple companies. The `employees` array contains all their employee records:

```javascript
{
  userData: {
    // ... other fields
    employees: [
      {
        sesame_employee_id: "employee-1-uuid",
        company_id: "company-1-uuid",
        company_name: "Company A",
        full_name: "John Doe"
      },
      {
        sesame_employee_id: "employee-2-uuid",
        company_id: "company-2-uuid",
        company_name: "Company B",
        full_name: "John Doe"
      }
    ]
  },
  sesameCredentials: {
    // Same employees array for direct API access
    employees: [/* same structure */]
  }
}
```

**Important:** Your application should handle multi-company scenarios by:
- Letting the user select which company context to use
- Storing the selected `company_id` and `sesame_employee_id` in the session
- Using the appropriate employee context when making Sesame API calls

### Using Sesame Credentials

The `sesameCredentials` object contains everything needed to make direct calls to the Sesame API:

```javascript
const { sesame_private_token, region, employees } = result.sesameCredentials;

// Determine the Sesame API URL based on region
const sesameApiUrl = `https://back-${region.toLowerCase()}.sesametime.com`;

// Make authenticated requests to Sesame API
const response = await axios.get(`${sesameApiUrl}/api/v3/security/me-oauth`, {
  headers: {
    'Authorization': `Bearer ${sesame_private_token}`,
    'Accept': 'application/json'
  }
});
```

## API Reference

### Constructor

```javascript
const sso = new SesameSSO(config, options);
```

#### Config (required)

| Parameter | Type | Description |
|-----------|------|-------------|
| `ssoBaseUrl` | `string` | Base URL of the SSO server |
| `clientId` | `string` | OAuth client ID |
| `clientSecret` | `string` | OAuth client secret |
| `redirectUri` | `string` | OAuth redirect URI |

#### Options (optional)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `defaultScope` | `string` | `''` | Default OAuth scopes |
| `timeout` | `number` | `10000` | HTTP timeout in milliseconds |
| `stateStore` | `object` | `InMemoryTTLStore` | Custom state store implementation |

### Methods

#### `getLoginUrl(params)`

Generate OAuth authorization URL with CSRF protection.

```javascript
const { url, state } = sso.getLoginUrl({
  scope: 'openid profile email',  // Optional
  extraParams: {                   // Optional
    prompt: 'login',
    login_hint: 'user@example.com'
  }
});
```

**Returns:** `{ url: string, state: string }`

---

#### `exchangeCodeForToken(code, state, options)`

Exchange authorization code for tokens and optionally fetch user data.

```javascript
// Fetch everything (default)
const result = await sso.exchangeCodeForToken(code, state);

// Only fetch tokens
const result = await sso.exchangeCodeForToken(code, state, {
  includeUserInfo: false,
  includeSesameCredentials: false
});
```

**Parameters:**
- `code` (string) - Authorization code from callback
- `state` (string) - State parameter for CSRF validation
- `options` (object, optional):
  - `includeUserInfo` (boolean) - Fetch user info (default: `true`)
  - `includeSesameCredentials` (boolean) - Fetch Sesame credentials (default: `true`)

**Returns:**
```javascript
{
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  tokenType: string,
  userData?: object,          // If includeUserInfo is true
  sesameCredentials?: object  // If includeSesameCredentials is true
}
```

---

#### `getUserInfo(accessToken)`

Get user information from userinfo endpoint.

```javascript
const userInfo = await sso.getUserInfo(accessToken);
```

**Returns:** User information object

---

#### `getSesameCredentials(accessToken)`

Get Sesame-specific credentials (private_token, public_token, region).

```javascript
const credentials = await sso.getSesameCredentials(accessToken);
// { sesame_private_token, sesame_public_token, region, ... }
```

**Returns:** Sesame credentials object

---

#### `refreshToken(refreshToken)`

Refresh an access token using a refresh token.

```javascript
const newTokens = await sso.refreshToken(oldRefreshToken);
// { access_token, refresh_token, expires_in, token_type }
```

**Returns:** New token data

---

#### `revokeToken(token, tokenTypeHint)`

Revoke a token (RFC 7009).

```javascript
await sso.revokeToken(accessToken, 'access_token');
await sso.revokeToken(refreshToken, 'refresh_token');
```

**Returns:** `true` if successful

---

#### `destroy()`

Stop the state store cleanup timer (call when shutting down).

```javascript
sso.destroy();
```

## Advanced Usage

### Custom State Store (Redis)

For production environments with multiple instances or serverless deployments, use a distributed store like Redis:

```javascript
import Redis from 'ioredis';

class RedisStateStore {
  constructor(redis, ttlSeconds = 600) {
    this.redis = redis;
    this.ttl = ttlSeconds;
  }

  async set(key, value, expiresAt) {
    const ttl = Math.floor((expiresAt - Date.now()) / 1000);
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async get(key) {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : undefined;
  }

  async has(key) {
    return (await this.redis.exists(key)) === 1;
  }

  async delete(key) {
    await this.redis.del(key);
  }
}

const redis = new Redis();
const sso = new SesameSSO(config, {
  stateStore: new RedisStateStore(redis)
});
```

### Token Refresh Flow

```javascript
app.use(async (req, res, next) => {
  if (!req.session.tokens) {
    return res.redirect('/login');
  }

  // Check if token is expired
  const expiresAt = req.session.tokens.expiresAt;
  if (Date.now() > expiresAt - 60000) { // Refresh 1 minute before expiry
    try {
      const newTokens = await sso.refreshToken(req.session.tokens.refreshToken);
      req.session.tokens = {
        ...newTokens,
        expiresAt: Date.now() + (newTokens.expires_in * 1000)
      };
    } catch (error) {
      return res.redirect('/login');
    }
  }

  next();
});
```

### Logout with Token Revocation

```javascript
app.get('/logout', async (req, res) => {
  if (req.session.tokens?.accessToken) {
    try {
      await sso.revokeToken(req.session.tokens.accessToken);
    } catch (error) {
      console.error('Token revocation failed:', error.message);
    }
  }

  req.session.destroy(() => {
    res.redirect('/');
  });
});
```

## Environment Variables

```env
# SSO Server Configuration
SSO_BASE_URL=http://localhost:8000

# OAuth Client Configuration
OAUTH_CLIENT_ID=your-client-id
OAUTH_CLIENT_SECRET=your-client-secret
REDIRECT_URI=http://localhost:3000/callback

# Application Configuration
APP_PORT=3000
SESSION_SECRET=your-session-secret
```

## Security Best Practices

### ⚠️ Backend Only

This library is designed for **backend use only**. Never expose `clientSecret` in frontend code.

### CSRF Protection

Always validate the `state` parameter:

```javascript
app.get('/login', (req, res) => {
  const { url, state } = sso.getLoginUrl();
  req.session.oauthState = state; // Store in session
  res.redirect(url);
});

app.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  // State is automatically validated in exchangeCodeForToken
  const result = await sso.exchangeCodeForToken(code, state);
});
```

### Secure Session Configuration

```javascript
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
```

### Token Storage

- Store tokens in **server-side sessions** (never in localStorage/cookies on client)
- Use **httpOnly cookies** for session IDs
- Implement **token refresh** before expiry
- **Revoke tokens** on logout

## Error Handling

All methods throw descriptive errors with OAuth error details:

```javascript
try {
  const result = await sso.exchangeCodeForToken(code, state);
} catch (error) {
  // Error format: "OAuth token exchange failed [400] (invalid_grant): The authorization code is invalid"
  console.error(error.message);

  if (error.message.includes('CSRF attack')) {
    // Handle CSRF error
  } else if (error.message.includes('invalid_grant')) {
    // Handle invalid/expired code
  }
}
```

## TypeScript Support

Type definitions are coming soon! For now, use JSDoc:

```javascript
/**
 * @typedef {Object} SesameTokens
 * @property {string} accessToken
 * @property {string} refreshToken
 * @property {number} expiresIn
 * @property {string} tokenType
 * @property {Object} [userData]
 * @property {Object} [sesameCredentials]
 */

/** @type {SesameTokens} */
const result = await sso.exchangeCodeForToken(code, state);
```

## Testing

Example test with Jest:

```javascript
import { SesameSSO, InMemoryTTLStore } from '@sesamehr/oauth-client';

describe('SesameSSO', () => {
  let sso;

  beforeEach(() => {
    sso = new SesameSSO({
      ssoBaseUrl: 'http://localhost:8000',
      clientId: 'test-client',
      clientSecret: 'test-secret',
      redirectUri: 'http://localhost:3000/callback'
    });
  });

  afterEach(() => {
    sso.destroy(); // Cleanup timers
  });

  test('generates login URL with state', () => {
    const { url, state } = sso.getLoginUrl();

    expect(url).toContain('http://localhost:8000/oauth/authorize');
    expect(url).toContain(`client_id=test-client`);
    expect(url).toContain(`state=${state}`);
    expect(state).toHaveLength(64); // 32 bytes hex
  });
});
```

## License

MIT License - see [LICENSE](LICENSE) file for details

## Support

For support and questions, please contact the Sesame team at tech@sesametime.com

---

Made with ❤️ by the Sesame team
