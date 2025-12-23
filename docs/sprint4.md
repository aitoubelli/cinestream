# Sprint 4: Frontend Implementation & Real-Time UX with SSE

> Duration: 7–10 days
> Goal: Build a responsive, real-time frontend in **Next.js (App Router)** that consumes microservices via the API Gateway and displays live notifications using **Server-Sent Events (SSE)**.
> Version: `v0.4.0`

---

## Deliverables

- [x] **Next.js App Router** structure with protected routes
- [x] **Auth flow**: login, register, JWT storage (`httpOnly` cookies or secure localStorage)
- [x] **Dashboard**: trending movies/TV, user watchlist
- [x] **Content detail page**: ratings, comments, add to watchlist
- [x] **Real-time notifications** via SSE (`EventSource`)
- [x] **SSE endpoint secured** with JWT (no plain `?userId=`)
- [x] **UI components**: notification badge, toast alerts
- [x] **Responsive design** with `shadcn/ui` + Tailwind
- [x] End-to-end user journey: register → add to watchlist → receive rating notification

---

## Technical Scope

| Area               | Tech Stack                                      | Details |
|--------------------|-------------------------------------------------|--------|
| **Frontend**       | Next.js 14 (App Router), TypeScript, React      | Server + client components |
| **Styling**        | Tailwind CSS + `shadcn/ui`                      | Buttons, cards, modals, alerts |
| **Auth Storage**   | **`httpOnly` cookies** (recommended)            | Set by API Gateway or Auth Service on login |
| **API Calls**      | `fetch` to `http://localhost:3000/api/...`       | Via API Gateway |
| **Real-Time**      | **SSE** (`EventSource`)                         | Secure stream at `/api/notifications/stream` |
| **State Mgmt**     | React Context + `useReducer` or `useState`      | No Redux needed |
| **Environment**    | `.env.local`                                    | `NEXT_PUBLIC_API_BASE=http://localhost:3000/api` |

> **Security**:
> - Frontend **never sees JWT** if using `httpOnly` cookies
> - SSE stream **validates session**, not raw `userId`

---

## Task Breakdown

### Secure Auth Flow (Frontend + Backend Alignment)

- [x] Backend update (Auth Service): On login, set httpOnly cookie
  ```js
  res.cookie('auth', accessToken, { httpOnly: true, secure: false, sameSite: 'lax' });
  ```
- [ ] API Gateway configuration: Enable credentials in proxy to pass cookies to services
- [x] Frontend auth implementation: Use fetch with credentials: 'include'
  ```ts
  await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  ```

> This prevents XSS token theft.

---

### SSE Stream — Now Secure!

- [x] Notification Service update: Remove ?userId parameter, validate session from cookie
  ```js
  // In /notifications/stream route
  const token = req.cookies.auth;
  if (!token) return res.status(401).end();

  // Verify JWT (reuse /verify logic from Auth Service)
  const user = await verifyJWT(token); // returns { id, role }
  const userId = user.id;
  ```
- [x] Frontend SSE implementation: Create useNotifications hook with EventSource
  ```ts
  // hooks/useNotifications.ts
  useEffect(() => {
    const eventSource = new EventSource(
      `${process.env.NEXT_PUBLIC_API_BASE}/notifications/stream`,
      { withCredentials: true } // ← sends cookies!
    );

    eventSource.onmessage = (e) => {
      const notification = JSON.parse(e.data);
      // Update context or show toast
    };

    return () => eventSource.close();
  }, []);
  ```

### Core Pages & Components

- [x] Layout component (`app/layout.tsx`): Top navigation with avatar and notification badge, implement protected routes
- [x] Auth pages (`app/(auth)/login/page.tsx`, `/register`): Login and register forms
- [x] Dashboard page (`app/dashboard/page.tsx`): Display trending movies/TV and user watchlist
- [x] Content detail page (`app/content/[type]/[id]/page.tsx`): Fetch and display content metadata, show ratings and comments, provide forms for submitting rating/comment and adding to watchlist
- [x] Notification UI components: Notification badge in navigation, toast alerts for new notifications, notification center modal

### Frontend Project Structure

- [x] Set up the following project structure:
  ```
  frontend/
  ├── app/
  │   ├── layout.tsx
  │   ├── page.tsx → redirect to /dashboard
  │   ├── (auth)/
  │   │   ├── login/page.tsx
  │   │   └── register/page.tsx
  │   ├── dashboard/page.tsx
  │   └── content/
  │       └── [type]/[id]/page.tsx
  ├── hooks/
  │   ├── useAuth.ts
  │   └── useNotifications.ts
  ├── lib/
  │   └── api.ts → reusable fetch wrappers
  ├── components/
  │   ├── ui/ → shadcn
  │   ├── NotificationToast.tsx
  │   └── WatchlistItem.tsx
  ├── .env.local
  └── next.config.js
  ```

### API Integration Examples

- [x] Implement API functions in `lib/api.ts`:
  #### Get Profile
  ```ts
  export async function getProfile() {
    const res = await fetch(`${API_BASE}/user/profile`, { credentials: 'include' });
    return res.json();
  }
  ```
  #### Post Rating
  ```ts
  export async function postRating(contentId: number, contentType: string, score: number) {
    await fetch(`${API_BASE}/interactions/ratings`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentId, contentType, score })
    });
  }
  ```

## Validation Checklist

#### Auth

- [x] Register → login → redirected to dashboard
- [x] JWT stored in httpOnly cookie (visible in DevTools Application tab)

#### Content & Interactions

- [ ] Trending content loads
- [x] Can add movie to watchlist
- [x] Can submit rating/comment

#### Real-Time Notifications

- [ ] Open two browsers: User A and User B
- [ ] User A adds movie X to watchlist
- [ ] User B rates movie X → User A sees toast+badge update without reload
- [x] SSE reconnects if you toggle WiFi

#### Security

- [x] SSE endpoint returns 401 if not logged in
- [x] No JWT in localStorage or logs

#### UI/UX

- [x] Mobile-responsive
- [x] Loading states on async actions
- [x] Error handling (e.g., duplicate rating)
