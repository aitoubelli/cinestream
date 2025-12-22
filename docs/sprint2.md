# Sprint 2: API Gateway & Content Service (TMDB + Redis Cache)

> Duration: 5–7 days
> Goal: Implement the API Gateway to route requests and build the Content Service that fetches, caches, and serves movie/series data from TMDB using Redis.
> Version: `v0.2.0`

---

## Deliverables

- [x] **API Gateway** routes `/api/auth/**`, `/api/user/**`, `/api/content/**` to respective services
- [x] **Content Service** fetches data from TMDB API
- [x] **Redis caching layer** for TMDB responses (TTL: 1 hour)
- [ ] MongoDB storage for enriched content metadata (optional but recommended)
- [x] OpenAPI/Swagger docs on Content Service (`/docs`)
- [x] End-to-end test: `GET /api/content/movies/trending` → returns cached or fresh TMDB data

---

## Technical Scope

| Component          | Tech Stack                                    | Details |
|--------------------|-----------------------------------------------|--------|
| **API Gateway**    | Node.js, Express, `http-proxy-middleware`     | Routes based on path prefixes |
| **Content Service**| Node.js, Express, Axios, Mongoose, Redis      | Fetches from TMDB, caches in Redis, stores in MongoDB |
| **External API**   | [TMDB API](https://developer.themoviedb.org)  | Use `v3` endpoints (`/trending`, `/search`, etc.) |
| **Cache**          | Redis (TTL = 3600s)                           | Key format: `tmdb:trending:movie:page:1` |
| **Database**       | MongoDB (`cinestream_content`)                 | Store enriched items (e.g., with local ratings) |

> All services communicate via Docker service names (e.g., `content-service:4003`)

---

## Task Breakdown

### API Gateway (`services/api-gateway`)

- [ ] Install dependencies: `npm install express http-proxy-middleware`

- [ ] Proxy configuration:
  ```js
  // routes.js
  const { createProxyMiddleware } = require('http-proxy-middleware');

  module.exports = (app) => {
    app.use('/api/auth', createProxyMiddleware({
      target: 'http://auth-service:4001',
      changeOrigin: true
    }));
    app.use('/api/user', createProxyMiddleware({
      target: 'http://user-service:4002',
      changeOrigin: true
    }));
    app.use('/api/content', createProxyMiddleware({
      target: 'http://content-service:4003',
      changeOrigin: true
    }));
  };
  ```

- [ ] Server setup:
  - Expose on port 3000
  - Add health check: `GET /health` → `{ status: 'API Gateway OK' }`
  - No authentication logic — pure routing

### Content Service (`services/content-service`)

- [ ] Environment configuration:
  ```env
  PORT=4003
  MONGO_URI=mongodb://mongodb:27017/cinestream_content
  REDIS_URL=redis://redis:6379
  TMDB_API_KEY=your_tmdb_v3_api_key_here
  ```

- [ ] Redis client setup:
  ```js
  const redis = require('redis');
  const client = redis.createClient({ url: process.env.REDIS_URL });
  client.connect();
  ```

- [ ] TMDB API helper:
  ```js
  async function fetchFromTMDB(endpoint) {
    const url = `https://api.themoviedb.org/3${endpoint}?api_key=${process.env.TMDB_API_KEY}&language=en-US`;
    const res = await axios.get(url);
    return res.data;
  }
  ```

- [ ] Caching logic:
  ```js
  async function getCachedOrFetch(key, fetchFn, ttl = 3600) {
    const cached = await client.get(key);
    if (cached) return JSON.parse(cached);
    const data = await fetchFn();
    await client.setEx(key, ttl, JSON.stringify(data));
    return data;
  }
  ```

- [ ] Endpoints:
  - `GET /movies/trending` → fetch and cache `/trending/movie/week` from TMDB
  - `GET /tv/trending` → fetch and cache `/trending/tv/week` from TMDB
  - `GET /search?q=:query` → fetch and cache `/search/multi` from TMDB

- [ ] Caching strategy:
  - Use Redis keys like: `tmdb:trending:movie:week`
  - TTL: 3600 seconds (1 hour)

- [ ] (Optional) MongoDB storage:
  - Save enriched content metadata for future features (e.g., local ratings)

- [ ] Swagger docs at `/docs`

### API Contract (Examples)

#### Get Trending Movies

```
GET http://localhost:3000/api/content/movies/trending
```

→ Returns TMDB-formatted list (cached after first call)

#### Search Content

```
GET http://localhost:3000/api/content/search?q=spider
```

→ Returns mixed movies/TV from TMDB

> All responses should include `id`, `title`/`name`, `poster_path`, `media_type`

> **Note**: Search endpoint requires TMDB v4 Access Token (Bearer authentication). Update `TMDB_API_KEY` in `.env` to your v4 access token for search functionality.

## Validation Checklist

#### API Gateway

- [x] GET http://localhost:3000/api/auth/health → Auth Service response
- [x] GET http://localhost:3000/api/user/health → User Service
- [x] GET http://localhost:3000/api/content/movies/trending → Content data

#### Content Service

- [x] First call to /movies/trending → hits TMDB
- [x] Second call (within 1h) → served from Redis (check logs or add cache hit/miss header)
- [x] Swagger UI at http://localhost:4003/docs
- [ ] Works without internet after first cache (optional test)

#### Infrastructure

- [x] redis-cli shows keys like `tmdb:trending:movie:week`
- [x] TMDB API key not hardcoded — loaded from .env
- [x] No CORS issues (handled by frontend or gateway if needed)

#### Security

- [x] TMDB API key not committed (add .env to .gitignore)
- [x] Rate limiting not required yet (TMDB allows ~40 req/10s)
