class ParkingLot < ApplicationRecord
  belongs_to :user

  validates :coordinates, presence: true

  def to_geojson_feature
    {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [coordinates]
      },
      properties: {
        id: id
      }
    }
  end
end
