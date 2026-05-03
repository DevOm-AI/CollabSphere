# CollabSphere

CollabSphere is a full-stack collaboration platform for college students. Students sign up under a college community, browse college-scoped or global collaboration posts, create project/hackathon/research opportunities, apply with offered skills, and build a profile portfolio from completed collaborations.

## Features

- JWT authentication with SlowAPI rate limiting on signup and login.
- Searchable college selection during signup from `backend/data/colleges.json`.
- College communities with a default My College collaboration feed and a Global feed toggle.
- Invite-code flow for campus communities: the first user from a college can generate the college invite code and becomes the campus rep.
- Optional invite code on signup. Matching college invite codes mark users as college verified.
- Normalized skills with many-to-many joins for users and collaboration required skills.
- Skill-based collaboration filtering, including minimum match counts.
- AI-powered team match scoring with Groq-generated personalized match reasons for strong matches.
- Collaboration lifecycle with automatic archiving after `event_datetime` passes.
- Archived collaborations stop accepting applications.
- Profile portfolio timeline built from archived collaborations a student created or joined as an accepted collaborator.
- Realtime WebSocket slot updates when applicants are accepted, rejected, or removed.

## Tech Stack

- Backend: FastAPI, SQLAlchemy, PostgreSQL, JWT auth, SlowAPI
- Frontend: React with Vite
- AI: Groq Chat Completions with `llama3-8b-8192`
- Realtime: FastAPI WebSockets
- Database migrations: lightweight startup migrations in `backend/app/main.py`

## Project Structure

```text
backend/
  app/
    api/              REST routes, lifecycle helpers, skill helpers
    core/             config, database, security, colleges, rate limiting
    models/           SQLAlchemy database models
    schemas/          Pydantic request/response schemas
    main.py           FastAPI app entrypoint and startup migrations
    realtime.py       WebSocket connection manager
  data/
    colleges.json     array of college name strings
  requirements.txt
  .env.example
frontend/
  src/
    api/              fetch client and websocket URLs
    components/       UI components
    state/            auth context
    utils/            small helpers
  package.json
  vite.config.js
```

## Data Model

- `users`: account, profile, college, college verification, campus rep flag, skills mirror, interests, contributions, notification settings.
- `invite_codes`: one unique invite code per college, created by the first user from that college.
- `skills`: normalized skill names used for matching.
- `user_skills`: many-to-many links between users and skills.
- `collaboration_required_skills`: many-to-many links between collaborations and required skills.
- `collaborations`: post content, post type, required skills mirror, slots, owner, event date/time, open/archived status.
- `applications`: applicant, collaboration, message, offered skills, and status.

Application statuses are `pending`, `accepted`, and `rejected`. Available slots are computed as `collaboration.slots - accepted_applications`.

Posts with an `event_datetime` in the past are automatically marked `Archived` on startup and when relevant API routes run. Archived posts remain visible in histories and portfolios but no longer accept applications.

## Backend Setup

1. Create a PostgreSQL database with Docker:

```bash
docker compose up -d postgres
```

The Docker setup maps PostgreSQL to host port `5433` to avoid clashing with a local PostgreSQL service on `5432`.

Or create one manually:

```bash
createdb collabsphere
```

2. Create and activate a Python virtual environment:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
```

On macOS/Linux or MSYS-style shells, activate with `source .venv/bin/activate`.

3. Install dependencies:

```bash
pip install -r requirements.txt
```

If signup fails with a bcrypt/passlib password hashing error, reinstall the pinned bcrypt version:

```bash
pip install --force-reinstall bcrypt==4.0.1
```

4. Configure environment variables:

```bash
copy .env.example .env
```

Update `JWT_SECRET_KEY` and `GROQ_API_KEY` in `backend/.env`. The default Docker database URL is:

```text
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5433/collabsphere
GROQ_API_KEY=replace-with-groq-api-key
GROQ_MODEL=llama3-8b-8192
```

If you are using a local PostgreSQL service instead of Docker, use port `5432` or your local server port.

5. Make sure `backend/data/colleges.json` exists.

It should be a JSON array of college name strings:

```json
[
  "Example Institute of Technology",
  "Example Arts and Science College"
]
```

The API trims whitespace, de-duplicates names, and validates signup/profile college values against this file.

6. Run the API:

```bash
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000`. FastAPI docs are available at `http://localhost:8000/docs`.

## Frontend Setup

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Optional frontend environment file:

```bash
copy .env.example .env
```

The default values are:

```text
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_BASE_URL=ws://localhost:8000/ws
```

3. Run the dev server:

```bash
npm run dev
```

Open `http://localhost:5173`.

## API Routes

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`

Signup requires `name`, `email`, `password`, and `college`. It also accepts optional `invite_code`.

Auth endpoints are rate limited:

- Signup: `3/minute`
- Login: `5/minute`

### Colleges And Invites

- `GET /api/colleges?q=college&limit=50`
- `POST /api/invite/generate`

`POST /api/invite/generate` is authenticated. Only the first user from a college can generate that college's invite code. The endpoint rejects duplicate codes for the same college and marks the creator as `campus_rep=true` and `college_verified=true`.

### Users

- `GET /api/users/me`
- `PUT /api/users/me`
- `PUT /api/users/me/password`
- `GET /api/users/me/collaborations`
- `GET /api/users/me/portfolio`

`GET /api/users/me/portfolio` returns a generated achievement headline, type counts, and archived collaboration timeline items. The profile UI uses this for summaries such as completed hackathons and research projects.

### Collaborations

- `GET /api/collaborations?limit=20&offset=0&scope=college`
- `GET /api/collaborations?scope=global`
- `GET /api/collaborations?post_status=Archived`
- `GET /api/collaborations?post_status=All`
- `GET /api/collaborations?match_my_skills=true&min_skill_matches=2`
- `POST /api/collaborations`
- `GET /api/collaborations/{id}`
- `PUT /api/collaborations/{id}`
- `DELETE /api/collaborations/{id}`
- `POST /api/collaborations/{id}/apply`
- `GET /api/collaborations/{id}/applications`
- `PATCH /api/collaborations/{id}/applications/{application_id}`

Feed query defaults:

- `scope=college`: show posts from users in the signed-in user's college.
- `post_status=Open`: hide archived posts from the main feed.

Use `scope=global` to remove the college filter and `post_status=Archived` or `post_status=All` to include archived posts.

Authenticated collaboration responses include `match_score` and `match_reason`. `match_score` is computed from normalized skill overlap. If the score is at least 60, the backend asks Groq for a one-line personalized reason; otherwise `match_reason` is `null`.

### Realtime

- `WS /ws/collaborations/{id}`

Clients receive slot-count payloads when application decisions change.

## Main User Flow

1. Sign up with a selected college. If an invite code is provided, it must match that college.
2. The first student from a college can generate the campus invite code and becomes the campus rep.
3. Fill in profile skills, interests, contributions, department, graduation year, and portfolio link.
4. Browse Open Posts in My College by default or switch to Global.
5. Filter posts by title, creator, required skill, post type, date, or minimum matching skills.
6. Create collaboration posts with required skills, slots, post type, and event date/time.
7. Other students apply with a message and offered skills.
8. Owners accept, reject, or remove applicants.
9. Slot counts update through WebSockets.
10. After the event date passes, posts archive automatically.
11. Archived accepted or created collaborations become profile portfolio timeline items.

## UI Sections

- Auth: login/signup, searchable college dropdown, optional invite code.
- Open Posts: My College and Global feed toggle, search, skill match filter, match score badges, pagination, create-post modal.
- Collaboration Detail: event details, required skills, application form, owner applicant review, archived badge/state.
- Student Profile: profile summary, college, Campus Rep badge, skill counts, completed portfolio count, achievement timeline, editable profile form.
- Collaborations: application history with accepted/rejected/pending and archived state.
- Settings: password, department, graduation year, portfolio link, and email notification preference.

## Startup Migrations

Existing development databases are upgraded on backend startup with:

- User profile fields: `mobile_number`, `department`, `graduation_year`, `portfolio_url`, `email_notifications`
- College community fields: `college`, `college_verified`, `campus_rep`
- Collaboration fields: `post_type`, `event_datetime`, `post_status`, `archived_at`
- Application field: `offered_skills`
- Normalized skill tables: `skills`, `user_skills`, `collaboration_required_skills`
- Invite-code table: `invite_codes`

Startup also backfills normalized skill rows from existing array columns and archives expired collaborations.
