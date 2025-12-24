# Tulsa Urbanist - Traffic Incident Tracking System

## Project Overview

This is a Rails application for tracking and visualizing traffic fatality incidents in Tulsa. The application provides a dashboard interface with interactive maps and data management capabilities for documenting traffic-related fatalities.

## Technology Stack

### Backend
- **Framework**: Ruby on Rails 8.0
- **Database**: PostgreSQL (with PostGIS for geospatial data)
- **Geocoding**: Geocoder gem for address-to-coordinates conversion

### Frontend
- **JavaScript Framework**: Hotwired (Turbo + Stimulus)
- **TypeScript**: Full TypeScript support for frontend code
- **Build Tools**: Webpack 5, esbuild
- **Mapping**: Mapbox GL JS
- **Styling**: TailwindCSS (via PostCSS)

### Development
- **Ruby Version**: 3.3.6
- **Package Manager**: Bun (lockfile present)
- **Containerization**: Docker + Docker Compose available

### Security
- **Authentication**: HTTP Basic Authentication for write operations
- Protected actions: create, edit, update, delete incidents
- Public access: index and show pages (read-only)
- Credentials configured via environment variables

## Core Models

### Incident
Primary model for tracking traffic fatalities with:
- Date/time of incident
- Location (geocoded from description)
- Fatality counts by type (pedestrian, cyclist, motorcyclist, vehicle occupant, other)
- Verification status (unverified, partially verified, verified)
- Information source
- Additional information through `AdditionalInformation` model
- Optional source reference through `Source` model

Key features:
- Automatic geocoding when location description is provided
- Validation for required fields and numeric constraints
- Helper methods for verification status display
- Geospatial coordinates (latitude/longitude)

### AdditionalInformation
Supplementary information related to incidents (dependent destroy)

### Source
Optional reference for incident data sources

## Application Structure

### Controllers
- `HomeController`: Landing page
- `DashboardController`: Main dashboard interface
- `IncidentsController`: CRUD operations for incidents, including quick entry workflow
- `Api::V1::IncidentsController`: JSON/GeoJSON API endpoints

### Routes
- `/` - Home page
- `/dashboard` - Main dashboard view
- `/incidents` - Standard Rails resource routes
- `/incidents/quick_new` - Quick entry form
- `/incidents/quick_create` - Quick entry submission
- `/api/v1/incidents/geojson` - GeoJSON for all incidents
- `/api/v1/incidents/:id/geojson` - GeoJSON for single incident

### Stimulus Controllers

#### DashboardController
Located at: `app/javascript/controllers/dashboard_controller.ts`

Manages the dashboard's pane system with:
- Pane registry for tracking UI components
- Support for pane types: map, table, form, header
- Event dispatching for pane registration
- Query methods for retrieving panes by ID or type

#### SplitPaneController
Located at: `app/javascript/controllers/split_pane_controller.ts`

Provides resizable pane functionality with draggable dividers.

## Recent Development

The application is currently undergoing a dashboard enhancement in the `epic-chaplygin` branch:

### Phase 1: Dashboard Layout System
- **Step 1.1**: Base dashboard layout structure
- **Step 1.2**: Resizable pane system with draggable dividers
- **Step 1.3**: Pane registry system with typed components

This work focuses on creating a modular, flexible dashboard interface with resizable panels for displaying maps, tables, and forms.

## Development Workflow

### Setup
```bash
# Install dependencies
bundle install
bun install  # or npm install

# Configure environment variables
cp .env.example .env
# Edit .env and set ADMIN_USERNAME and ADMIN_PASSWORD

# Setup database
rails db:create db:migrate
```

### Running the Application
```bash
rails server
# or with foreman/docker-compose
```

### Building Assets
The project uses Webpack with esbuild for fast TypeScript compilation:
```bash
webpack
# or in watch mode
webpack --watch
```

## API Endpoints

### GeoJSON API
- `GET /api/v1/incidents/geojson` - Returns all incidents as GeoJSON FeatureCollection
- `GET /api/v1/incidents/:id/geojson` - Returns single incident as GeoJSON Feature

These endpoints are designed for consumption by Mapbox GL JS for map visualization.

## Code Style & Patterns

### TypeScript
- Interfaces for type definitions (e.g., `PaneConfig`)
- Strong typing for Stimulus controllers
- ES6+ features (arrow functions, template literals, Map/Set)

### Rails
- Standard Rails conventions
- Service objects pattern (as needed)
- RESTful routing with additional quick-entry endpoints
- Enum for verification status with helper methods
- Geocoding callbacks on model validation

## Database Schema Notes

The Incident model uses:
- Geospatial fields: `latitude`, `longitude`
- Temporal field: `date_time`
- Count fields for different fatality types
- Enum for `verification_status`
- Text fields for `location_description`, `information_source`

## Configuration Files

- `tsconfig.json` - TypeScript configuration
- `webpack.config.js` - Webpack build configuration
- `postcss.config.js` - PostCSS/TailwindCSS configuration
- `Dockerfile` + `docker-compose.yml` - Container setup
- `nginx.conf` - Nginx configuration for deployment
- `Procfile` - Process management
- `.env.example` - Template for environment variables
- `.env` - Local environment variables (gitignored)

## Environment Variables

Required environment variables for deployment:

- `ADMIN_USERNAME` - Username for HTTP Basic Auth (default: 'admin')
- `ADMIN_PASSWORD` - Password for HTTP Basic Auth (default: 'changeme')
- `DATABASE_URL` - PostgreSQL connection string
- `RAILS_ENV` - Rails environment (development/production)
- `RAILS_MASTER_KEY` - For encrypted credentials

## Working in This Codebase

### Adding New Features
1. Follow Rails MVC conventions
2. Use TypeScript for all new JavaScript
3. Create Stimulus controllers for interactive UI components
4. Leverage the pane system for dashboard components
5. Use GeoJSON API for map-related features

### Modifying the Dashboard
- Register new panes through the DashboardController
- Define pane types in the `PaneConfig` interface
- Use data attributes for pane configuration: `data-pane-id`, `data-pane-type`, `data-pane-title`

### Testing
Test files located in `test/` directory (standard Rails minitest structure)

## Deployment

The application includes:
- Docker support for containerized deployment
- Nginx configuration for production serving
- Procfile for process management

### Railway Deployment

When deploying to Railway:
1. Set environment variables in Railway dashboard:
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - Railway will auto-provision PostgreSQL and set `DATABASE_URL`
2. Railway will auto-detect the Dockerfile and deploy
3. Ensure PostGIS extension is available in the PostgreSQL database

## Notes for AI Assistants

- Always check existing Stimulus controllers before creating new ones
- The pane system is the preferred way to add new dashboard components
- GeoJSON endpoints should be used for map-related data
- Maintain TypeScript typing for all frontend code
- Follow Rails naming conventions for models, controllers, and routes
- The quick entry workflow (`quick_new`/`quick_create`) is an alternative to standard Rails CRUD for simplified data entry
