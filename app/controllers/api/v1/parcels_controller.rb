class Api::V1::ParcelsController < ApplicationController
  def value_per_acre
    lots = ParkingLot.all
    features = lots.map do |lot|
      placeholder_value = 5000 + (lot.id * 1337 % 10000)
      {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [lot.coordinates] },
        properties: {
          id: lot.id,
          land_use: "surface_parking",
          value_per_acre: placeholder_value,
          is_dead_zone: true
        }
      }
    end
    render json: { type: "FeatureCollection", features: features }
  end
end
