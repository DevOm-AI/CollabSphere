# CollabSphere

CollabSphere is a full-stack collaboration platform for college students. Students can create project, hackathon, or research posts, apply to join posts, and owners can accept or reject applicants based on skills and fit.

## Tech Stack

- Backend: FastAPI, SQLAlchemy, JWT auth
- Frontend: React with Vite
- Database: PostgreSQL
- Realtime: FastAPI WebSockets for slot updates

## Project Structure

```text
backend/
  app/
    api/              REST routes and dependencies
    core/             config, database, security
    models/           SQLAlchemy database models
    schemas/          Pydantic request/response schemas
    main.py           FastAPI app entrypoint
    realtime.py       WebSocket connection manager
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

## Database Schema

- `users`: account, profile, mobile number, email, department, graduation year, portfolio, notification preference, interests, contributions
- `skills`: normalized skill names used for matching
- `user_skills`: many-to-many links between users and skills
- `collaboration_required_skills`: many-to-many links between collaborations and required skills
- `collaborations`: post title, post type, description, owner, total slots, event date/time, open/archived status
- `applications`: applicant, collaboration, message, offered skills, status

Application statuses are `pending`, `accepted`, and `rejected`. Available slots are computed as `collaboration.slots - accepted_applications`. Posts with an `event_datetime` in the past are automatically marked `Archived` and stop accepting applications.

## Backend Setup

1. Create a PostgreSQL database with Docker:

```bash
docker compose up -d postgres
```

If you see an error like `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine`, Docker Desktop is not running or the Linux engine is unavailable. Start Docker Desktop first, wait until it says it is running, then retry the command. If you do not want to use Docker, install PostgreSQL locally and use the manual option below.

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

On macOS/Linux or MSYS-style shells, activate with `source .venv/bin/activate`. Use a Python distribution that includes `pip`.

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

Update `JWT_SECRET_KEY` in `backend/.env`. The default Docker database URL is:

```text
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5433/collabsphere
```

If you are using a local PostgreSQL service instead of Docker, use port `5432` or whatever port your local server uses.

5. Run the API:

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

## Main API Routes

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/users/me`
- `PUT /api/users/me`
- `GET /api/users/me/portfolio`
- `PUT /api/users/me/password`
- `GET /api/collaborations?limit=20&offset=0`
- `GET /api/collaborations?match_my_skills=true&min_skill_matches=2`
- `POST /api/collaborations`
- `GET /api/collaborations/{id}`
- `PUT /api/collaborations/{id}`
- `DELETE /api/collaborations/{id}`
- `POST /api/collaborations/{id}/apply`
- `GET /api/collaborations/{id}/applications`
- `PATCH /api/collaborations/{id}/applications/{application_id}`
- `GET /api/users/me/collaborations`
- `WS /ws/collaborations/{id}`

## Usage Flow

1. Sign up or log in.
2. Fill in skills, interests, and contributions on your profile.
3. Create a collaboration with required skills and slots.
4. Other students apply from the collaboration detail panel.
5. Applicants can mention the skills they will provide.
6. The owner reviews applicants and accepts or rejects them.
7. Accepted and rejected applicants show final green/red status marks with no further action buttons.
8. Slot counts update immediately for users viewing that collaboration.

## UI Sections

- Open Posts: browse posts, inspect event details, view applicant contact details as the creator, and create posts from a modal.
- Open Posts search: filter by title, creator name, required skill, post type, or event date.
- Skill matching: filter open posts where the signed-in student's skills match at least a chosen number of required skills.
- Student Profile: visual profile page with editable name, mobile number, skills, interests, contributions, and archived collaboration portfolio items.
- Student Profile portfolio: archived accepted or created collaborations become achievement timeline items with a summary such as completed hackathons and research projects.
- Collaborations: application history for the signed-in student.
- Settings: change password, department, graduation year, portfolio link, and email notification preference.

Existing development databases are upgraded on backend startup with the new `mobile_number`, settings, `post_type`, `event_datetime`, `post_status`, `archived_at`, `offered_skills`, and normalized skill matching tables.
