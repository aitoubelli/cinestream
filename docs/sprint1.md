# Sprint 1: Authentication & User Management

> Duration: 5–7 days
> Goal: Implement secure JWT-based authentication and core user profile functionality.
> Version: `v0.1.0`

---

## Deliverables

- [x] **Auth Service**: Registration, login, JWT issuance, token refresh
- [x] **User Service**: Profile CRUD, watchlist management
- [x] MongoDB collections: `users`, `sessions`
- [x] Auth middleware for protected routes (used by other services later)
- [x] OpenAPI/Swagger documentation (`/docs`)
- [x] End-to-end validation via `curl` or Postman

---

## Technical Scope

| Component         | Tech Stack                     | Details |
|-------------------|--------------------------------|--------|
| **Auth Service**  | Node.js, Express, Mongoose, JWT, Bcrypt | Handles login/signup, issues access/refresh tokens |
| **User Service**  | Node.js, Express, Mongoose     | Manages user profile, avatar, watchlist |
| **Database**      | MongoDB (shared cluster, separate DBs) | `cinestream_auth`, `cinestream_users` |
| **Security**      | JWT (HS256), environment secrets, password hashing | 10+ rounds bcrypt |
| **API Docs**      | Swagger UI (via `swagger-jsdoc`) | `/docs` on both services |

> **Inter-service call**:
> `User Service` → `Auth Service` (to validate JWT on profile update)

---

## Task Breakdown

### Auth Service (`services/auth-service`)

- [x] Define Mongoose schema:
  - User: `{ email: String, passwordHash: String, role: ['user', 'admin'], createdAt: Date }`
  - RefreshToken (optional, for session tracking): `{ token: String, userId: ObjectId, expiresAt: Date }`

Endpoints:

- [x] `POST /register`: create user, hash password, respond with tokens
- [x] `POST /login`: validate credentials, issue tokens
- [x] `POST /refresh`: issue new access token using refresh token
- [x] `GET /verify`: validate JWT (used by other services)

JWT config:

- [x] Access token: 15m expiry
- [x] Refresh token: 7d expiry
- [x] Secret from `JWT_SECRET` in `.env`
- [x] Add Swagger docs at `/docs`
- [x] Docker: ensure `MONGO_URI=mongodb://mongodb:27017/cinestream_auth`

### User Service (`services/user-service`)
Mongoose schema:

- [x] `userId`: ObjectId (ref: Auth User)
- [x] `fullName`: String
- [x] `avatar`: String (enum or URL)
- [x] `watchlist`: Array of `{ tmdbId: Number, type: 'movie'|'tv' }`

Endpoints:

- [x] `GET /profile`: return profile (requires valid JWT)
- [x] `PATCH /profile`: update fullName/avatar
- [x] `POST /watchlist`: add item
- [x] `DELETE /watchlist/:tmdbId`: remove item from watchlist

Auth middleware:

- [x] Extract `Authorization: Bearer <token>`
- [x] Call `http://auth-service:4001/verify` (internal Docker network)
- [x] Attach `req.user = { id, role }` if valid

- [x] Swagger docs at `/docs`
- [x] DB: `cinestream_users`

### Shared: Auth Middleware (Reusable Pattern)
Create `middleware/auth.js` in User Service:

```js
const axios = require('axios');

async function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const response = await axios.post('http://auth-service:4001/verify', { token });
    req.user = response.data.user; // { id, role }
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

## API Contract (Examples)

### Register

```
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{ "email": "user@example.com", "password": "strong123" }

→ Returns { accessToken, refreshToken }
```

### Get Profile

```
GET http://localhost:3000/api/user/profile
Authorization: Bearer <accessToken>

→ Returns { id, email, fullName, avatar, watchlist }
```

Note: All requests go through API Gateway (proxy to services)

## Validation Checklist

### Auth Service
- [x] `/register` creates user in MongoDB
- [x] `/login` returns valid JWT
- [x] `/verify` accepts valid token, rejects invalid/expired
- [x] Swagger UI accessible at `http://localhost:4001/docs`

### User Service
- [x] `/profile` returns 401 without token
- [x] With token: returns correct profile
- [x] Can add/remove from watchlist
- [x] Swagger at `http://localhost:4002/docs`

### Integration
- [x] User Service successfully calls `auth-service:4001/verify` (check logs)
- [x] No hardcoded IPs — uses Docker service names

### Security
- [x] Passwords never logged or returned
- [x] `.env` files excluded from Git
- [x] Secrets not in Docker Compose (use `.env` files or Docker secrets in prod)
