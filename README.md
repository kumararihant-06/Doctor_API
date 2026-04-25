# Doctor-Patient Appointment API

Backend API for a doctor-patient appointment system. Built with Node.js 20+, Express 5, PostgreSQL 16. Cookie-based authentication, role-based access control, transactional booking with race-condition-proof conflict prevention at the database layer.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ (ESM) |
| Framework | Express 5 |
| Database | PostgreSQL 16 |
| Auth | Cookie-based sessions, bcrypt for passwords, SHA-256 for session tokens |
| Validation | Zod |
| Security | Helmet, CORS with explicit credentials whitelist |

---

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 16 (running locally)
- A Postgres database created (e.g., `createdb doctor_api`)

### Install

```bash
npm install
```

### Configure

Copy `.env.example` to `.env` and adjust:

```bash
cp .env.example .env
```

Set `DATABASE_URL` to point at your Postgres instance. On macOS via Homebrew, the default user has no password:

```
DATABASE_URL=postgres://yourusername@localhost:5432/doctor_api
```

### Run Migrations

```bash
npm run migrate
```

### (Optional) Seed Sample Data

```bash
npm run seed
```

Creates a doctor and a patient with password `password123`, plus 4 sample slots tomorrow at 10:00 UTC.

### Start the Server

```bash
npm start        # production-style
npm run dev      # nodemon, auto-reload
```

Server runs on **http://localhost:3000**.

---

## API Reference

All authenticated routes require the session cookie set by `POST /auth/login`. Use `-c cookies.txt` to save and `-b cookies.txt` to send with `curl`.

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Create user `{name, email, password, role}` |
| POST | `/auth/login` | — | Login `{email, password}`; sets session cookie |
| POST | `/auth/logout` | required | Clear session |
| GET | `/auth/verify` | optional | Returns `{authenticated: bool, user?}` |

### Doctor `(role: doctor)`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/doctor/availability/manual` | Create one slot `{startTime}` |
| POST | `/doctor/availability/bulk` | Create N slots `{date, startTime, slots, slotDurationMinutes}` |
| GET | `/doctor/availability` | List own slots `?date=YYYY-MM-DD&status=...` |
| PATCH | `/doctor/availability/:id` | Update slot start time |
| DELETE | `/doctor/availability/:id` | Cancel slot (soft delete) |

### Patient `(role: patient)`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/patient/slots/open` | List bookable slots `?date=...&doctorId=...` |
| POST | `/patient/appointments` | Book a slot `{slotId}` |
| GET | `/patient/appointments` | List own appointments |
| GET | `/patient/appointments/:id` | Get one (own only) |
| PATCH | `/patient/appointments/:id/cancel` | Cancel own appointment |

### Status Codes

| Code | Meaning |
|---|---|
| 200 | OK — successful read or update |
| 201 | Created — new resource |
| 400 | Bad Request — validation failure (with `details`) |
| 401 | Unauthorized — no/invalid session |
| 403 | Forbidden — wrong role or not the resource owner |
| 404 | Not Found — resource missing |
| 409 | Conflict — overlap, double-book, or business rule conflict |

---

## Design Decisions

### Single `users` Table for Both Roles

Doctors and patients share one table distinguished by a `role` enum. Auth is identical for both; permissions diverge only at the route/middleware layer. Keeps email uniqueness system-wide and avoids duplicating auth logic.

### Cookie-Based Sessions, Server-Side Stored

- Session token is 32 random bytes (256 bits of entropy), hex-encoded.
- The **raw token** lives only in the browser's HttpOnly cookie.
- Only a **SHA-256 hash** of the token is stored in the DB.
- A DB leak alone cannot be used to impersonate users.
- SHA-256 (fast) for tokens, bcrypt (slow) for passwords — different threat models.

### Cookie Attributes

`HttpOnly` (always), `Secure` (production only), `SameSite=Lax`. Lax balances CSRF protection with normal app navigation flows.

### Slot Overlap Prevention — at the Database Layer

A GiST exclusion constraint on `availability_slots`:

```sql
EXCLUDE USING gist (
  doctor_id WITH =,
  tstzrange(start_time, end_time, '[)') WITH &&
) WHERE (status <> 'cancelled')
```

For any two non-cancelled slots with the same doctor, overlapping time ranges are rejected by the database atomically on every insert. App-level checks alone have a race window between check and insert; this constraint closes it. The `[)` boundary makes consecutive slots (10:00–10:30 + 10:30–11:00) not flagged as overlap.

### Double-Booking Prevention — at the Database Layer

A partial unique index on `appointments`:

```sql
CREATE UNIQUE INDEX appointments_active_per_slot_idx
  ON appointments (slot_id) WHERE status = 'booked';
```

Only one active booking per slot can exist at a time. Cancellation history is preserved (multiple cancelled rows allowed). Combined with `SELECT ... FOR UPDATE` in the booking transaction, two concurrent bookings cannot both succeed.

### Booking Transaction — Two-Layer Defense

1. `BEGIN`
2. `SELECT slot FOR UPDATE` — row-level lock; concurrent transactions wait
3. Validate state under the lock (status, past-date, patient overlap)
4. `INSERT appointment`
5. `UPDATE slot SET status = 'booked'`
6. `COMMIT`

If anything fails, `ROLLBACK`. If the partial unique index rejects the insert (SQLSTATE `23505`), the service translates to `409`.

### `TIMESTAMPTZ` Everywhere

All timestamps use `TIMESTAMPTZ`, stored as UTC internally, rendered in any timezone on read. Plain `TIMESTAMP` is ambiguous about timezone and unsafe for an appointment system.

### Layered Structure

```
routes/ → controllers/ → services/ → models/
```

Routes wire URLs to controllers; controllers translate HTTP to service calls; services hold business logic; models are thin SQL wrappers. Validators and middleware are separate concerns.

### Raw SQL Over ORM

The assignment evaluates database design — exclusion constraints, partial indexes, transactional locking. An ORM would obscure these. Used the `pg` driver directly with parameterized queries (SQL injection impossible by construction).

---

## Validation

- Required-field validation on every create/login endpoint
- Email format and case-insensitive uniqueness (functional `LOWER(email)` index)
- Password 8–72 chars (72 is bcrypt's hard limit)
- Role must be `doctor` or `patient` (DB enum + Zod)
- Slot duration exactly 30 minutes (DB `CHECK` + Zod)
- `startTime` must be a valid ISO-8601 with timezone, must be in the future
- All UUIDs validated via Zod before DB calls

---

## Security Notes

- Passwords hashed with bcrypt cost 10
- Session tokens SHA-256 hashed before storage
- Cookies are HttpOnly, Secure in production, SameSite=Lax
- Helmet sets ~10 HTTP security headers (CSP, HSTS, X-Frame-Options, etc.)
- CORS uses explicit origin whitelist — required when `credentials: true`
- All SQL is parameterized (no string concatenation)
- User enumeration prevention on login: same generic error and constant timing for "no user" and "wrong password"
- `findById` deliberately omits `password_hash` to limit accidental serialization

---

## Scope and Tradeoffs

### What I Focused On

- **Required scope, rock solid.** Every endpoint, every validation rule, every conflict prevention requirement.
- **Database-layer guarantees.** GiST exclusion constraint, partial unique index, transactional booking with row locks.
- **Security depth.** Cookie hardening, token hashing, user-enumeration prevention.

### What I De-scoped and Why

| Feature | Reason |
|---|---|
| Docker | Listed as bonus; working with unfamiliar tooling under deadline would have eaten time better spent on correctness |
| Tests | Listed as bonus; with more time I'd add Jest + Supertest covering auth flows, slot CRUD, and booking conflicts |
| OpenAPI/Swagger | Postman collection covers the documentation requirement; OpenAPI would be next |
| Pagination | `LIMIT 200` cap on open-slots query as a stop-gap; production would use cursor-based pagination |
| Soft delete cleanup | Sessions and cancelled rows accumulate; production needs a cron job to purge expired sessions |
| Slot duration flexibility | Hard-coded 30 min per spec; easy to make configurable |

---

## What I'd Add with More Time

1. Jest + Supertest integration tests
2. Multi-stage Dockerfile + docker-compose
3. OpenAPI 3.0 spec
4. Cursor-based pagination on list endpoints
5. Audit logging
6. Sliding-expiration sessions with refresh on activity
7. Email verification flow

---

## Project Structure

```
.
├── migrations/
│   └── 001_init.sql          # full schema with constraints and indexes
├── src/
│   ├── config/index.js       # env loading + validation
│   ├── controllers/          # HTTP layer (thin)
│   ├── db/
│   │   ├── pool.js           # shared pg pool
│   │   ├── migrate.js        # migration runner
│   │   └── seed.js           # demo data
│   ├── middleware/
│   │   ├── auth.js           # requireAuth, requireRole
│   │   ├── validate.js       # Zod schema runner
│   │   └── error.js          # central error handler
│   ├── models/               # SQL wrappers       
│   ├── routes/               # URL → controller mappings
│   ├── services/             # business logic
│   ├── utils/
│   │   ├── errors.js         # typed error classes
│   │   └── asyncHandler.js
│   ├── validators/           # Zod schemas
│   ├── app.js                # builds Express app
│   └── server.js             # starts HTTP listener
└── package.json
```

---

## License

ISC