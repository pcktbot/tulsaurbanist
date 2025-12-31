class Api::V1::RedesignsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_redesign, only: [:show, :update, :destroy, :geojson]

  def index
    @redesigns = current_user.redesigns.order(updated_at: :desc)
    render json: @redesigns
  end

  def show
    render json: @redesign.as_json(include: {
      placed_shapes: {
        include: :road_nodes
      }
    })
  end

  def create
    @redesign = current_user.redesigns.build(redesign_params)

    if @redesign.save
      render json: @redesign, status: :created
    else
      render json: { errors: @redesign.errors }, status: :unprocessable_entity
    end
  end

  def update
    if @redesign.update(redesign_params)
      render json: @redesign
    else
      render json: { errors: @redesign.errors }, status: :unprocessable_entity
    end
  end

  def destroy
    @redesign.destroy
    head :no_content
  end

  def geojson
    features = @redesign.placed_shapes.map do |shape|
      shape_to_geojson(shape)
    end

    render json: {
      type: 'FeatureCollection',
      features: features
    }
  end

  private

  def set_redesign
    @redesign = current_user.redesigns.find(params[:id])
  end

  def redesign_params
    params.require(:redesign).permit(:name, :description, :center_latitude, :center_longitude, :max_radius)
  end

  def shape_to_geojson(shape)
    if shape.shape_type == 'road'
      geometry = {
        type: 'LineString',
        coordinates: shape.road_nodes.map { |node| [node.longitude, node.latitude] }
      }
    else
      geometry = {
        type: 'Polygon',
        coordinates: [calculate_polygon_coordinates(shape)]
      }
    end

    {
      type: 'Feature',
      geometry: geometry,
      properties: {
        id: shape.id,
        shape_type: shape.shape_type,
        color: shape.color,
        width: shape.width,
        depth: shape.depth,
        rotation: shape.rotation,
        metadata: shape.metadata
      }
    }
  end

  def calculate_polygon_coordinates(shape)
    lat = shape.latitude
    lng = shape.longitude
    width = shape.width || 10
    depth = shape.depth || 10
    rotation_rad = (shape.rotation || 0) * Math::PI / 180.0

    half_width = width / 2.0
    half_depth = depth / 2.0

    lat_per_meter = 1.0 / 111_320.0
    lng_per_meter = 1.0 / (111_320.0 * Math.cos(lat * Math::PI / 180.0))

    corners = [
      [-half_width, -half_depth],
      [half_width, -half_depth],
      [half_width, half_depth],
      [-half_width, half_depth],
      [-half_width, -half_depth]
    ]

    corners.map do |x, y|
      rotated_x = x * Math.cos(rotation_rad) - y * Math.sin(rotation_rad)
      rotated_y = x * Math.sin(rotation_rad) + y * Math.cos(rotation_rad)

      new_lng = lng + (rotated_x * lng_per_meter)
      new_lat = lat + (rotated_y * lat_per_meter)

      [new_lng, new_lat]
    end
  end
end
