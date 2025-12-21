# Sprint 1: Authentication & User Management

> Duration: 5–7 days
> Goal: Implement secure JWT-based authentication and core user profile functionality.
> Version: `v0.1.0`

---

## Deliverables

- [ ] **Auth Service**: Registration, login, JWT issuance, token refresh
- [ ] **User Service**: Profile CRUD, watchlist management
- [ ] MongoDB collections: `users`, `sessions`
- [ ] Auth middleware for protected routes (used by other services later)
- [ ] OpenAPI/Swagger documentation (`/docs`)
- [ ] End-to-end validation via `curl` or Postman
- [ ] Tag final commit as `v0.1.0`

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

- [ ] Define Mongoose schema:
  - User: `{ email: String, passwordHash: String, role: ['user', 'admin'], createdAt: Date }`
  - RefreshToken (optional, for session tracking): `{ token: String, userId: ObjectId, expiresAt: Date }`

Endpoints:

- `POST /register`: create user, hash password, respond with tokens
- `POST /login`: validate credentials, issue tokens
- `POST /refresh`: issue new access token using refresh token
- `GET /verify`: validate JWT (used by other services)

JWT config:

- Access token: 15m expiry
- Refresh token: 7d expiry
- Secret from `JWT_SECRET` in `.env`
- Add Swagger docs at `/docs`
- Docker: ensure `MONGO_URI=mongodb://mongodb:27017/cinestream_auth`

### User Service (`services/user-service`)
Mongoose schema:

- `userId`: ObjectId (ref: Auth User)
- `fullName`: String
- `avatar`: String (enum or URL)
- `watchlist`: Array of `{ tmdbId: Number, type: 'movie'|'tv' }`

Endpoints:

- `GET /profile`: return profile (requires valid JWT)
- `PATCH /profile`: update fullName/avatar
- `POST /watchlist`: add item
- `DELETE /watchlist/:tmdbId`: remove item from watchlist

Auth middleware:

- Extract `Authorization: Bearer <token>`
- Call `http://auth-service:4001/verify` (internal Docker network)
- Attach `req.user = { id, role }` if valid

- Swagger docs at `/docs`
- DB: `cinestream_users`

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
- [ ] `/register` creates user in MongoDB
- [ ] `/login` returns valid JWT
- [ ] `/verify` accepts valid token, rejects invalid/expired
- [ ] Swagger UI accessible at `http://localhost:4001/docs`

### User Service
- [ ] `/profile` returns 401 without token
- [ ] With token: returns correct profile
- [ ] Can add/remove from watchlist
- [ ] Swagger at `http://localhost:4002/docs`

### Integration
- [ ] User Service successfully calls `auth-service:4001/verify` (check logs)
- [ ] No hardcoded IPs — uses Docker service names

### Security
- [ ] Passwords never logged or returned
- [ ] `.env` files excluded from Git
- [ ] Secrets not in Docker Compose (use `.env` files or Docker secrets in prod)
