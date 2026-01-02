# Urban Redesign Feature - Implementation Plan

## Overview
Add a completely separate urban redesign system allowing users to create proposals with pre-made building/infrastructure shapes placed on a map. Roads will be path-based with configurable widths, while buildings/parks use fixed footprints.

## Phase 1: User Authentication System (Devise)

### Critical Files to Create/Modify
- `Gemfile` - Add devise gem
- `config/initializers/devise.rb` - Devise configuration
- `app/models/user.rb` - User model
- `db/migrate/*_devise_create_users.rb` - User table migration
- `app/controllers/application_controller.rb` - Update auth method
- `app/views/devise/**/*` - Login/registration views

### Implementation Steps
1. Add `devise` gem to Gemfile
2. Run `rails generate devise:install`
3. Generate User model: `rails generate devise User`
4. Add additional fields to users migration: `username:string:uniq`, `name:string`
5. Run migration
6. Generate Devise views: `rails generate devise:views`
7. Update routes to include Devise routes
8. Replace `authenticate_admin` with Devise's `authenticate_user!` where needed
9. Keep existing HTTP Basic Auth for backward compatibility (optional)
10. Add login/logout links to navigation

**Notes:**
- Existing incidents functionality should remain mostly public (only create/edit/delete protected)
- New redesign features will require user authentication
- Each redesign proposal will be associated with a user

## Phase 2: Shape Template Configuration System

### Critical Files to Create/Modify
- `config/shape_templates.yml` - YAML config for predefined shapes
- `app/models/shape_template.rb` - Database model for custom templates
- `db/migrate/*_create_shape_templates.rb` - Shape templates table
- `lib/shape_template_loader.rb` - Loads YAML templates into memory

### YAML Structure
```yaml
residential:
  single_family:
    name: "Single Family Home"
    category: "residential"
    width: 15
    depth: 12
    color: "#FFD700"
  townhome:
    name: "Townhome"
    category: "residential"
    width: 8
    depth: 20
    color: "#FFA500"
  apartment_4story:
    name: "4-Story Apartment"
    category: "residential"
    width: 30
    depth: 25
    color: "#FF6347"

commercial:
  retail_small:
    name: "Small Retail"
    category: "commercial"
    width: 20
    depth: 15
    color: "#4169E1"
  mixed_use:
    name: "Mixed Use Building"
    category: "commercial"
    width: 25
    depth: 30
    color: "#6A5ACD"

parks:
  pocket_park:
    name: "Pocket Park"
    category: "parks"
    width: 20
    depth: 20
    color: "#228B22"
  plaza:
    name: "Plaza"
    category: "parks"
    width: 40
    depth: 40
    color: "#32CD32"

infrastructure:
  bike_lane:
    name: "Bike Lane"
    category: "infrastructure"
    width: 2
    is_path: true
    color: "#00CED1"
```

### Database Schema (shape_templates)
- `id` - Primary key
- `name` - String, not null
- `category` - String, not null (residential, commercial, parks, infrastructure, roads)
- `width` - Float (meters)
- `depth` - Float (meters, null for paths)
- `color` - String (hex color)
- `is_path` - Boolean (default false)
- `user_id` - Foreign key (null for system templates)
- `template_data` - JSONB (for custom properties)
- `created_at`, `updated_at`

## Phase 3: Redesign Core Models

### Critical Files to Create/Modify
- `app/models/redesign.rb` - Main proposal model
- `app/models/placed_shape.rb` - Individual shapes within a proposal
- `app/models/road_node.rb` - Nodes for road paths
- `db/migrate/*_create_redesigns.rb`
- `db/migrate/*_create_placed_shapes.rb`
- `db/migrate/*_create_road_nodes.rb`

### Database Schema (redesigns)
- `id` - Primary key
- `user_id` - Foreign key to users, not null
- `name` - String, not null
- `description` - Text
- `center_latitude` - Float, not null
- `center_longitude` - Float, not null
- `max_radius` - Float (meters), not null, default 500
- `created_at`, `updated_at`

### Database Schema (placed_shapes)
- `id` - Primary key
- `redesign_id` - Foreign key, not null
- `shape_template_id` - Foreign key (nullable for roads)
- `shape_type` - String (building, park, road)
- `latitude` - Float, not null
- `longitude` - Float, not null
- `rotation` - Float (degrees, 0-360), default 0
- `width` - Float (override template width)
- `depth` - Float (override template depth)
- `color` - String (override template color)
- `metadata` - JSONB (for custom properties)
- `created_at`, `updated_at`

### Database Schema (road_nodes)
- `id` - Primary key
- `placed_shape_id` - Foreign key, not null (references parent road)
- `latitude` - Float, not null
- `longitude` - Float, not null
- `sequence_order` - Integer, not null
- `created_at`, `updated_at`
- Index on `[placed_shape_id, sequence_order]`

### Model Associations

**Redesign:**
- `belongs_to :user`
- `has_many :placed_shapes, dependent: :destroy`
- Validates presence of name, center_latitude, center_longitude, max_radius
- Validates max_radius > 0

**PlacedShape:**
- `belongs_to :redesign`
- `belongs_to :shape_template, optional: true`
- `has_many :road_nodes, -> { order(:sequence_order) }, dependent: :destroy`
- Validates presence of redesign_id, latitude, longitude
- Validates rotation between 0-360
- Custom validation: roads must have road_nodes, buildings must have shape_template

**RoadNode:**
- `belongs_to :placed_shape`
- Validates presence of latitude, longitude, sequence_order

## Phase 4: API Endpoints for Redesigns

### Critical Files to Create/Modify
- `app/controllers/api/v1/redesigns_controller.rb` - CRUD for proposals
- `app/controllers/api/v1/placed_shapes_controller.rb` - CRUD for shapes
- `app/controllers/api/v1/shape_templates_controller.rb` - Template listing
- `config/routes.rb` - Add API routes

### Routes
```ruby
namespace :api do
  namespace :v1 do
    resources :redesigns do
      resources :placed_shapes, only: [:create, :update, :destroy]
      member do
        get :geojson
      end
    end
    resources :shape_templates, only: [:index]
  end
end
```

### Endpoints

**GET /api/v1/shape_templates**
- Returns combined list of YAML templates + custom user templates
- Response: `{ templates: [{ id, name, category, width, depth, color, is_path, is_custom }] }`

**POST /api/v1/redesigns**
- Creates new redesign proposal
- Params: `{ name, description, center_latitude, center_longitude, max_radius }`
- Requires authentication
- Response: `{ id, name, description, center_latitude, center_longitude, max_radius, created_at }`

**GET /api/v1/redesigns/:id**
- Returns single redesign with all placed shapes and road nodes
- Response includes full GeoJSON representation

**GET /api/v1/redesigns/:id/geojson**
- Returns redesign as GeoJSON FeatureCollection
- Each placed shape is a Feature with geometry based on type:
  - Buildings/parks: Polygon (calculated from center + width/depth + rotation)
  - Roads: LineString (from ordered road_nodes)
- Properties include shape_template info, color, metadata

**POST /api/v1/redesigns/:redesign_id/placed_shapes**
- Creates new shape within redesign
- Params: `{ shape_template_id, latitude, longitude, rotation, road_nodes: [{lat, lng, sequence}] }`
- Response: Created shape with ID

**PATCH /api/v1/redesigns/:redesign_id/placed_shapes/:id**
- Updates shape position, rotation, or road nodes
- Params: `{ latitude, longitude, rotation, road_nodes: [{id, lat, lng, sequence}] }`

**DELETE /api/v1/redesigns/:redesign_id/placed_shapes/:id**
- Soft delete or hard delete shape (cascade deletes road_nodes)

## Phase 5: Redesign UI - Routes and Controllers

### Critical Files to Create/Modify
- `app/controllers/redesigns_controller.rb` - Web controller
- `app/views/redesigns/index.html.erb` - List user's redesigns
- `app/views/redesigns/show.html.erb` - Main editing interface
- `app/views/redesigns/new.html.erb` - Create new redesign form
- `config/routes.rb` - Add web routes

### Routes
```ruby
resources :redesigns do
  member do
    get :edit_map
  end
end
```

### Controller Actions
- `index` - List current user's redesigns
- `new` - Form to create new redesign
- `create` - Handle form submission
- `show` - Main editing interface with map + sidebar
- `edit` - Edit redesign metadata
- `update` - Update metadata
- `destroy` - Delete redesign

## Phase 6: Redesign Map Interface - Stimulus Controllers

### Critical Files to Create/Modify
- `app/javascript/controllers/redesign_map_controller.ts` - Main map controller
- `app/javascript/controllers/shape_palette_controller.ts` - Shape selection sidebar
- `app/javascript/controllers/shape_placer_controller.ts` - Shape placement logic
- `app/javascript/controllers/road_drawer_controller.ts` - Road drawing tool

### RedesignMapController

**Responsibilities:**
- Initialize Mapbox map centered on redesign center point
- Render all placed shapes as GeoJSON layers
- Handle map clicks for shape placement
- Manage selection state for editing shapes
- Sync with backend API for persistence

**Targets:**
- `container` - Map container div

**Values:**
- `redesignId` - Current redesign ID
- `centerLat` - Center latitude
- `centerLng` - Center longitude
- `maxRadius` - Maximum radius for boundary circle

**Actions:**
- `connect()` - Initialize map, load GeoJSON, draw boundary circle
- `loadShapes()` - Fetch from `/api/v1/redesigns/:id/geojson`
- `addShapeToMap(shape)` - Add GeoJSON feature to map
- `removeShapeFromMap(shapeId)` - Remove feature from map
- `selectShape(shapeId)` - Highlight selected shape
- `updateShape(shapeId, updates)` - Update shape position/rotation
- `handleMapClick(e)` - Delegate to active tool (shape placer or road drawer)

**Events Listened:**
- `shape-palette:shapeSelected` - Activate shape placement mode
- `shape-placer:shapePlaced` - Add new shape to map
- `road-drawer:roadCompleted` - Add new road to map

**Events Dispatched:**
- `shape-selected` - When user clicks existing shape
- `shape-updated` - After successful API update

### ShapePaletteController

**Responsibilities:**
- Display categorized list of shape templates
- Handle shape selection
- Show selected shape details
- Trigger shape placement mode

**Targets:**
- `category` - Category sections (residential, commercial, etc.)
- `shapeButton` - Individual shape buttons
- `selectedInfo` - Selected shape info panel

**Values:**
- `selectedTemplateId` - Currently selected template ID

**Actions:**
- `connect()` - Load templates from `/api/v1/shape_templates`
- `selectShape(e)` - Handle shape button click
- `renderTemplates(templates)` - Build sidebar UI
- `clearSelection()` - Deselect current shape

**Events Dispatched:**
- `shapeSelected` - When user clicks shape, includes template data

### ShapePlacerController

**Responsibilities:**
- Handle click-to-place for buildings/parks
- Show preview of shape at cursor position
- Calculate polygon geometry from center point + dimensions + rotation
- Create shape via API

**Values:**
- `activeTemplate` - Current template being placed
- `previewVisible` - Boolean for preview state

**Actions:**
- `connect()` - Listen for shape selection events
- `activatePlacement(template)` - Enter placement mode
- `updatePreview(lat, lng)` - Show shape preview at cursor
- `placeShape(lat, lng)` - POST to API, dispatch completion event
- `calculatePolygon(lat, lng, width, depth, rotation)` - Generate polygon coordinates
- `cancel()` - Exit placement mode

**Events Listened:**
- `shape-palette:shapeSelected` - Activate placement with template

**Events Dispatched:**
- `shapePlaced` - After successful API creation

### RoadDrawerController

**Responsibilities:**
- Multi-click road path drawing
- Manage road nodes array
- Show line preview while drawing
- Handle curve smoothing (future enhancement)
- Lane count selector (popover or toolbar)
- Create road via API

**Values:**
- `nodes` - Array of {lat, lng} objects
- `isDrawing` - Boolean
- `laneCount` - Number (2-6)
- `roadWidth` - Calculated from lane count

**Actions:**
- `connect()` - Initialize drawing state
- `startDrawing()` - Enter road drawing mode
- `addNode(lat, lng)` - Add node to path
- `updatePreview()` - Show line preview
- `completeRoad()` - POST to API with nodes array
- `undoLastNode()` - Remove last node (while drawing)
- `cancel()` - Exit drawing mode
- `setLaneCount(count)` - Update lane count (recalculates width)

**Events Listened:**
- `road-tool:activated` - Start drawing mode

**Events Dispatched:**
- `roadCompleted` - After successful API creation

## Phase 7: Redesign UI - Views and Styling

### Critical Files to Create/Modify
- `app/views/redesigns/show.html.erb` - Main editing interface
- `app/views/redesigns/_shape_palette.html.erb` - Sidebar partial
- `app/assets/stylesheets/redesigns.scss` - Styling

### Layout Structure (show.html.erb)

```erb
<div class="redesign-editor" data-controller="redesign-map">
  <div class="redesign-sidebar">
    <%= render 'shape_palette' %>
  </div>

  <div class="redesign-map-container"
       data-redesign-map-target="container"
       data-redesign-map-redesign-id-value="<%= @redesign.id %>"
       data-redesign-map-center-lat-value="<%= @redesign.center_latitude %>"
       data-redesign-map-center-lng-value="<%= @redesign.center_longitude %>">
  </div>

  <div class="redesign-toolbar">
    <button data-action="road-drawer#activate">Draw Road</button>
    <button data-action="redesign-map#undo">Undo</button>
    <button data-action="redesign-map#save">Save</button>
  </div>
</div>
```

**Key Differences from Incidents Dashboard:**
- Fixed sidebar (no overlay, no draggable divider)
- Sidebar is thin column (20-25% width, maybe 300-400px fixed)
- Map takes remaining width
- Toolbar at bottom or top for road drawing controls

### Shape Palette (_shape_palette.html.erb)

```erb
<div class="shape-palette" data-controller="shape-palette">
  <h3>Shape Templates</h3>

  <div class="palette-section" data-shape-palette-target="category">
    <h4>Residential</h4>
    <div class="shape-grid">
      <!-- Shape buttons rendered dynamically -->
    </div>
  </div>

  <div class="palette-section" data-shape-palette-target="category">
    <h4>Commercial</h4>
    <div class="shape-grid">
      <!-- Shape buttons rendered dynamically -->
    </div>
  </div>

  <!-- More categories... -->

  <div class="selected-info" data-shape-palette-target="selectedInfo">
    <!-- Selected shape details -->
  </div>
</div>
```

### Styling Approach
- Use existing TailwindCSS setup
- Color-coded shape buttons matching template colors
- Hover previews showing dimensions
- Active state for selected template
- Map container fills remaining space
- Toolbar buttons styled consistently with existing app

## Phase 8: GeoJSON Rendering and Map Visualization

### Critical Files to Modify
- `app/javascript/controllers/redesign_map_controller.ts` - Add rendering logic

### Rendering Strategy

**Buildings/Parks (Polygon Features):**
1. Calculate 4 corner points from center + width/depth + rotation
2. Convert to GeoJSON Polygon geometry
3. Add to Mapbox as fill layer with stroke
4. Style with template color
5. Enable click for selection/editing

**Roads (LineString Features):**
1. Convert ordered road_nodes to coordinates array
2. Create GeoJSON LineString geometry
3. Add to Mapbox as line layer
4. Width based on lane count (3.5m per lane)
5. Style with road color (gray/black)
6. Show lane markings (future enhancement)

**Boundary Circle:**
- Use Mapbox circle layer or turf.js to draw max_radius circle
- Dashed stroke, semi-transparent fill
- Indicates workspace boundary

### Map Layers (bottom to top)
1. Base map style
2. Boundary circle
3. Road lines (thicker, below buildings)
4. Building/park fills
5. Building/park strokes
6. Selected shape highlight
7. Preview layer (during placement)

### Interaction States
- **Default**: Shapes are clickable for selection
- **Placement Mode**: Crosshair cursor, click to place
- **Road Drawing**: Crosshair, clicks add nodes
- **Selected**: Shape highlighted, shows drag handles (future)

## Implementation Order

1. **Phase 1**: User authentication (Devise) - Foundation for everything
2. **Phase 2**: Shape template system - Define available shapes
3. **Phase 3**: Core models - Data structure for redesigns
4. **Phase 4**: API endpoints - Backend CRUD operations
5. **Phase 5**: Web routes/controllers - Basic web interface
6. **Phase 6**: Stimulus controllers - Interactive map functionality
7. **Phase 7**: Views and styling - UI polish
8. **Phase 8**: GeoJSON rendering - Visual representation

## Design Decisions (Can be adjusted)

1. **Road width calculation**: Use standard 3.5m per lane. Simple lane count selector (2-6 lanes). Can add road types later.

2. **Shape rotation**: Free rotation 0-360° with 15° snap points (hold shift to disable snap). Allows creativity while making grid alignment easy.

3. **Road joining logic**: Start with visual overlap only. No auto-snapping or intersection nodes in MVP. This keeps the data model simple and lets users manually align roads.

4. **Placement interaction**: Start with click-to-select + click-to-place (simpler). Drag-and-drop from sidebar can be added as enhancement later.

5. **Multiple proposals**: Allow unlimited proposals per user, even for overlapping areas. Users might want to compare different redesign approaches for the same location.

6. **Visibility**: Start with private-only (creator can view/edit their own). Add public sharing/publishing feature in a later phase.

## Notes

- Roads are the most complex feature due to path-based geometry
- Consider starting with simple buildings/parks to validate the placement system
- Road drawing could be a separate phase/enhancement
- Mapbox Draw plugin might be useful for road path editing
- Consider using turf.js for geometry calculations (polygon generation, distance, etc.)
