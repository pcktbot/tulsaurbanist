# Tulsa Urbanist - Traffic Incident Tracking System

A Ruby on Rails application for tracking and visualizing traffic fatality incidents in Tulsa. The application provides an interactive dashboard with maps and data management capabilities for documenting traffic-related fatalities.

## Features

- Interactive map visualization using Mapbox GL JS with 3D building extrusions
- GeoJSON API endpoints for incident data
- Automatic geocoding of incident locations
- Resizable dashboard panes for flexible layout
- Quick entry workflow for streamlined data input
- Public read access with authenticated write operations
- Verification status tracking (unverified, partially verified, verified)

## Technology Stack

- **Ruby**: 3.2.2
- **Rails**: 8.0
- **Database**: PostgreSQL with PostGIS extension
- **Frontend**: Hotwired (Turbo + Stimulus), TypeScript
- **Build Tools**: Webpack 5, esbuild
- **Mapping**: Mapbox GL JS
- **Styling**: TailwindCSS
- **Package Manager**: Bun

## Prerequisites

- Ruby 3.2.2
- PostgreSQL with PostGIS extension
- Bun (or npm/yarn)
- Bundler

## Local Development Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd tulsaurbanist
```

2. Install dependencies:
```bash
bundle install
bun install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and configure:
- `ADMIN_USERNAME` - Username for HTTP Basic Auth (default: 'admin')
- `ADMIN_PASSWORD` - Password for HTTP Basic Auth (default: 'changeme')
- `DATABASE_URL` - PostgreSQL connection string (optional, will use defaults)
- `MAPBOX_ACCESS_TOKEN` - Your Mapbox access token for maps

4. Create and migrate the database:
```bash
rails db:create
rails db:migrate
```

5. Start the development server:
```bash
foreman start
```

This starts both the Rails server and webpack dev server concurrently.

Visit `http://localhost:3000` to view the application.

## Building Assets

For production or one-time builds:
```bash
bun run webpack
```

For development with watch mode:
```bash
webpack --watch
```

## Running Tests

```bash
rails test
```

## Docker Development

Alternatively, use Docker Compose:

```bash
docker-compose up
```

This will start both the Rails application and PostgreSQL database.

## Deployment

### Railway

The application is configured for deployment on Railway:

1. Connect your GitHub repository to Railway
2. Set environment variables in the Railway dashboard:
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `MAPBOX_ACCESS_TOKEN`
   - Railway will auto-provision PostgreSQL and set `DATABASE_URL`
3. Ensure the PostgreSQL plugin has PostGIS extension enabled
4. Deploy - migrations run automatically via `rails db:prepare` in the Dockerfile

The `railway.toml` configuration includes:
- Dockerfile-based builds
- Automatic restart policy on failure
- Health check configuration

### Other Platforms

The included `Dockerfile` and `nginx.conf` support deployment to any container platform. The application automatically runs `rails db:prepare` before starting to handle migrations.

## Authentication

Write operations (create, edit, update, delete) require HTTP Basic Authentication. Configure credentials via environment variables:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

Read operations (index, show) are publicly accessible.

## API Endpoints

### GeoJSON API

- `GET /api/v1/incidents/geojson` - Returns all incidents as GeoJSON FeatureCollection
- `GET /api/v1/incidents/:id/geojson` - Returns single incident as GeoJSON Feature

### Standard Routes

- `GET /` - Home page
- `GET /dashboard` - Main dashboard interface
- `/incidents` - Standard Rails resource routes
- `GET /incidents/quick_new` - Quick entry form
- `POST /incidents/quick_create` - Quick entry submission

## Project Structure

### Models

- **Incident**: Primary model tracking traffic fatalities with geocoded location, fatality counts by type, verification status, and timestamps
- **AdditionalInformation**: Supplementary information linked to incidents
- **Source**: Optional reference for incident data sources

### Stimulus Controllers

- **DashboardController** (`app/javascript/controllers/dashboard_controller.ts`): Manages dashboard pane system
- **SplitPaneController** (`app/javascript/controllers/split_pane_controller.ts`): Provides resizable pane functionality
- **RedesignMapController** (`app/javascript/controllers/redesign_map_controller.ts`): Handles interactive map visualization

## Configuration Files

- `tsconfig.json` - TypeScript configuration
- `webpack.config.js` - Webpack build configuration
- `postcss.config.js` - PostCSS/TailwindCSS configuration
- `Dockerfile` - Container build configuration
- `docker-compose.yml` - Local Docker setup
- `railway.toml` - Railway deployment configuration
- `Procfile` - Process management (Foreman)

## Contributing

When contributing to this project:

1. Follow Rails MVC conventions
2. Use TypeScript for all new JavaScript
3. Create Stimulus controllers for interactive UI components
4. Leverage the dashboard pane system for new components
5. Maintain strong typing in TypeScript code
6. Do not add code comments unless absolutely necessary

## License

[Add your license information here]

## Contact

[Add contact information here]
