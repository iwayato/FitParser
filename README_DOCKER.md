# FitParser Docker Setup

This setup runs the FitParser React app and the Garmin sidecar in Docker containers using Docker Compose.

## Prerequisites
- Docker and Docker Compose installed
- Garmin credentials in a `.env` file

## Structure
- `fitparser-app/`: React app container (served via nginx)
- `garmin-sidecar/`: Python sidecar container (runs the sync script)
- Shared volume: `fit-files` for FIT file storage

## Setup Steps

1. Clone the repository and navigate to the project root.

2. Create a `.env` file in the project root with your Garmin credentials:
   ```
   GARMIN_EMAIL=your_email@example.com
   GARMIN_PASSWORD=your_password
   ```

3. Build and run with Docker Compose:
   ```bash
   docker-compose up --build
   ```

4. Access the app at http://localhost:3000

## Services

### fitparser-app
- Builds the React app using Vite
- Serves static files via nginx
- Exposes port 3000
- Mounts shared volume at `/app/files` (but nginx serves from `/usr/share/nginx/html/files`)

### garmin-sidecar
- Runs the Python sync script
- Mounts shared volume at `/app/files`
- Runs continuously, syncing FIT files every hour
- Uses environment variables from `.env`

## Volumes
- `fit-files`: Named Docker volume for persistent FIT file storage
- Data persists across container restarts

## TrueNAS Scale / Dockge Setup

1. In Dockge, create a new stack
2. Copy the `docker-compose.yml` content
3. Ensure the `.env` file is in the same directory as `docker-compose.yml`
4. Set up the named volume `fit-files` if needed
5. Start the stack

## Environment Variables

- `GARMIN_EMAIL`: Your Garmin Connect email
- `GARMIN_PASSWORD`: Your Garmin Connect password
- `FIT_FILE_FOLDER_PATH`: Path to store FIT files (defaults to `/app/files` in container)

## Troubleshooting

- Check container logs: `docker-compose logs`
- Ensure `.env` file exists and has correct credentials
- Verify shared volume permissions
- FIT files should appear in the `files/` directory and be accessible via the app