# Sprint 3: Interaction Service + Real-Time Notifications via SSE

> Duration: 7 days
> Goal: Implement user interactions (comments, ratings) and deliver real-time updates via **Server-Sent Events (SSE)** triggered by RabbitMQ events.
> Version: `v0.3.0`

---

## Deliverables

- [ ] **Interaction Service**: Handle comments and ratings for movies/TV shows
- [ ] **Notification Service**:
  - Consume RabbitMQ events (`content.rated`, `comment.posted`)
  - Maintain in-memory or Redis-backed SSE connections per user
  - Stream notifications via `/notifications/stream`
- [ ] **RabbitMQ integration**: Publish events from Interaction → Notification Service
- [ ] **SSE endpoint**: `GET /notifications/stream` (text/event-stream)
- [ ] OpenAPI/Swagger docs on both services
- [ ] Frontend-ready event format (JSON in `data:` field)

---

## Technical Scope

| Component             | Tech Stack                                      | Details |
|-----------------------|-------------------------------------------------|--------|
| **Interaction Service** | Node.js, Express, Mongoose, RabbitMQ (amqplib) | Stores comments/ratings, publishes events |
| **Notification Service**| Node.js, Express, RabbitMQ, SSE (`text/event-stream`) | Listens to events, pushes to connected users via SSE |
| **Message Broker**    | RabbitMQ (via `amqplib`)                        | Exchange: `cinestream.events`, routing keys: `content.rated`, `comment.posted` |
| **Real-Time Transport**| **SSE** (not WebSockets)                        | Simpler, HTTP-based, auto-reconnect |
| **Data Storage**      | MongoDB (`cinestream_interactions`)             | Collections: `comments`, `ratings` |

> **Why SSE?**
> - Built on HTTP (no upgrade handshake)
> - Automatic reconnection
> - Simpler than WebSockets for one-way server → client updates
> - Perfect for notifications

---

## Task Breakdown

### Interaction Service (`services/interaction-service`)

- [ ] Mongoose schemas:
  ```js
  // Comment schema
  const commentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    contentId: { type: Number, required: true },
    contentType: { type: String, enum: ['movie', 'tv'], required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  });

  // Rating schema
  const ratingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    contentId: { type: Number, required: true },
    contentType: { type: String, enum: ['movie', 'tv'], required: true },
    score: { type: Number, min: 1, max: 10, required: true },
    createdAt: { type: Date, default: Date.now }
  });
  ```

- [ ] Endpoints:
  - `POST /comments` → create comment, publish `comment.posted`
  - `POST /ratings` → create/update rating, publish `content.rated`

- [ ] RabbitMQ publisher setup:
  ```js
  const amqp = require('amqplib');
  let channel;

  async function connectRabbit() {
    const conn = await amqp.connect('amqp://rabbitmq');
    channel = await conn.createChannel();
    await channel.assertExchange('cinestream.events', 'topic', { durable: true });
  }

  function publishEvent(routingKey, payload) {
    channel.publish('cinestream.events', routingKey, Buffer.from(JSON.stringify(payload)));
  }
  ```

- [ ] Events published:
  - `comment.posted`: `{ userId, contentId, contentType, commentId }`
  - `content.rated`: `{ userId, contentId, contentType, score }`

- [ ] Swagger docs at `/docs`
### Notification Service (`services/notification-service`)

- [ ] RabbitMQ consumer setup:
  - Bind to `cinestream.events` exchange
  - Listen to `comment.posted` and `content.rated` routing keys

- [ ] SSE endpoint implementation:
  ```js
  const sseConnections = new Map(); // userId → [response1, response2, ...]

  app.get('/notifications/stream', (req, res) => {
    const userId = req.query.userId; // TODO: validate via auth middleware
    if (!userId) return res.status(400).end();

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Track connections per user
    if (!sseConnections.has(userId)) sseConnections.set(userId, []);
    sseConnections.get(userId).push(res);

    // Cleanup on disconnect
    req.on('close', () => {
      const conns = sseConnections.get(userId);
      const idx = conns.indexOf(res);
      if (idx > -1) conns.splice(idx, 1);
      if (conns.length === 0) sseConnections.delete(userId);
    });
  });
  ```

- [ ] Event handler (RabbitMQ consumer):
  ```js
  channel.consume('notification-queue', async (msg) => {
    const event = JSON.parse(msg.content.toString());

    // Determine target users (e.g., users who have this content in watchlist)
    const targetUsers = await getWatchlistUsers(event.contentId, event.contentType);

    // Push notification to all connected SSE clients for each target user
    targetUsers.forEach(userId => {
      const connections = sseConnections.get(userId);
      if (connections) {
        const notification = {
          id: Date.now(),
          type: event.routingKey,
          message: `New activity on ${event.contentType} #${event.contentId}`,
          timestamp: new Date().toISOString()
        };
        connections.forEach(res => {
          res.write(`data: ${JSON.stringify(notification)}\n\n`);
        });
      }
    });

    channel.ack(msg);
  });
  ```

- [ ] Additional features:
  - (Optional) Add Redis to persist recent notifications for offline users
  - No database required (unless adding persistence later)
  - Swagger: document `/notifications/stream` as SSE endpoint (note: non-standard OpenAPI)

### API Contract

#### Post a Rating

```
POST http://localhost:3000/api/interactions/ratings
Content-Type: application/json
Authorization: Bearer <accessToken>

{
  "contentId": 550,
  "contentType": "movie",
  "score": 9
}
```

→ Response: `{ "message": "Rating submitted" }`

#### Post a Comment

```
POST http://localhost:3000/api/interactions/comments
Content-Type: application/json
Authorization: Bearer <accessToken>

{
  "contentId": 550,
  "contentType": "movie",
  "text": "Great movie!"
}
```

→ Response: `{ "message": "Comment posted", "commentId": "..." }`

#### SSE Stream (Client-Side)

```js
// Frontend (React/Vue/etc.)
const eventSource = new EventSource(
  `http://localhost:3000/api/notifications/stream?userId=${userId}`
);

eventSource.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  console.log('New notification:', notification);
  // Update UI: show toast, increment badge count, etc.
};

// Handle connection errors/reconnection
eventSource.onerror = (err) => {
  console.error('SSE connection error:', err);
};
```

## Validation Checklist

#### Interaction Service

- [ ] POST /ratings saves to MongoDB
- [ ] Publishes content.rated to RabbitMQ (check RabbitMQ UI at http://localhost:15672)
- [ ] Same for comments

#### Notification Service

- [ ] Consumes events from RabbitMQ
- [ ] GET /notifications/stream?userId=123 opens SSE connection
- [ ] When a rating is posted, connected clients receive event within 1s
- [ ] Multiple tabs = multiple connections (handled correctly)

#### Integration

- [ ] User A rates a movie → User B (who has it in watchlist) receives notification
- [ ] No memory leaks on SSE disconnect

#### Reliability

- [ ] SSE reconnects automatically if connection drops
- [ ] Server sends : heartbeat every 15s (prevent proxy timeouts)
