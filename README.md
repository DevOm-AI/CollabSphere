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

- `users`: account, profile, skills, interests, contributions
- `collaborations`: post title, description, required skills, owner, total slots
- `applications`: applicant, collaboration, message, status

Application statuses are `pending`, `accepted`, and `rejected`. Available slots are computed as `collaboration.slots - accepted_applications`.

## Backend Setup

1. Create a PostgreSQL database with Docker:

```bash
docker compose up -d postgres
```

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

4. Configure environment variables:

```bash
copy .env.example .env
```

Update `DATABASE_URL` and `JWT_SECRET_KEY` in `backend/.env`.

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
- `GET /api/collaborations`
- `POST /api/collaborations`
- `GET /api/collaborations/{id}`
- `POST /api/collaborations/{id}/apply`
- `GET /api/collaborations/{id}/applications`
- `PATCH /api/collaborations/{id}/applications/{application_id}`
- `WS /ws/collaborations/{id}`

## Usage Flow

1. Sign up or log in.
2. Fill in skills, interests, and contributions on your profile.
3. Create a collaboration with required skills and slots.
4. Other students apply from the collaboration detail panel.
5. The owner reviews applicants and accepts or rejects them.
6. Slot counts update immediately for users viewing that collaboration.
