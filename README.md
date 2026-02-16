<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally with **database backend** (no localStorage).

View your app in AI Studio: https://ai.studio/apps/drive/1q2va8WM1fIHfrFH3Y-6yKOPDhDmIPlCm

## Architecture Changes

**✅ Database Connected:** The application now uses a backend server with SQL.js database instead of localStorage.

### What Changed:
- **Authentication:** User sessions are stored in `sessionStorage` (cleared on browser close) instead of `localStorage`
- **Data Storage:** All users, files, and stats are stored in a SQLite database (`repocerti.db`) via the backend API
- **Draft Saving:** Report drafts are only saved to the database when you click "Sync to Repository"
- **Demo Users:** Automatically seeded by the backend server on first run

### Backend API Endpoints:
- `GET /api/health` - Check database connection
- `GET /api/users/email/:email` - Fetch user by email
- `POST /api/users` - Create new user
- `POST /api/files` - Save new file
- `GET /api/files/user/:userId` - Get files for user (role-based access)
- `GET /api/stats/:userId` - Get user statistics
- `POST /api/files/:fileId/download` - Track file downloads

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key

3. **Start the backend server (required):**
   ```bash
   npm run server
   ```

4. **In a separate terminal, run the frontend:**
   ```bash
   npm run dev
   ```

   **Or run both simultaneously:**
   ```bash
   npm run dev:all
   ```

5. Open your browser to `http://localhost:5173`

## Demo Credentials

The backend automatically seeds demo users:

- **Student:** `student@demo.com` / `password123`
- **Faculty:** `faculty@demo.com` / `password123`
- **HOD:** `hod@demo.com` / `password123`
- **Dean:** `dean@demo.com` / `password123`
- **Principal:** `principal@demo.com` / `password123`

## Database File

The SQLite database is stored at: `repocerti.db`

To reset the database, simply delete this file and restart the server.

