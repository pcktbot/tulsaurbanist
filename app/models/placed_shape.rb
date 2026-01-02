class PlacedShape < ApplicationRecord
  belongs_to :redesign
  belongs_to :shape_template, optional: true
  has_many :road_nodes, -> { order(:sequence_order) }, dependent: :destroy

  validates :shape_type, presence: true
  validates :latitude, presence: true
  validates :longitude, presence: true
  validates :rotation, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 360 }, allow_nil: true

  validate :road_must_have_nodes
  validate :building_must_have_dimensions

  def to_geojson_feature
    if shape_type == 'road'
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: road_nodes.map { |node| [node.longitude, node.latitude] }
        },
        properties: {
          id: id,
          shape_type: shape_type,
          color: color,
          width: width,
          height: height || 0
        }
      }
    else
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [calculate_polygon_coordinates]
        },
        properties: {
          id: id,
          shape_type: shape_type,
          color: color,
          width: width,
          depth: depth,
          rotation: rotation || 0,
          height: height || 0
        }
      }
    end
  end

  private

  def calculate_polygon_coordinates
    return [] unless width && depth

    half_width = width / 2.0
    half_depth = depth / 2.0
    rotation_rad = (rotation || 0) * Math::PI / 180.0

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

      lng_offset = rotated_x / 111320.0 / Math.cos(latitude * Math::PI / 180.0)
      lat_offset = rotated_y / 110540.0

      [longitude + lng_offset, latitude + lat_offset]
    end
  end

  def road_must_have_nodes
    if shape_type == 'road' && road_nodes.empty?
      errors.add(:road_nodes, "must have at least 2 nodes for roads")
    end
  end

  def building_must_have_dimensions
    if shape_type.in?(['building', 'park']) && (width.nil? || depth.nil? || color.nil?)
      errors.add(:base, "Buildings and parks must have width, depth, and color")
    end
  end
end
