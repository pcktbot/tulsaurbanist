class Api::V1::ParcelsController < ApplicationController
  def value_per_acre
    center_lat = 36.154
    center_lng = -95.993
    cell_lat = 0.0013
    cell_lng = 0.00162
    cols = 38
    rows = 28

    seed = 1337
    features = []

    inset_lat = cell_lat * 0.08
    inset_lng = cell_lng * 0.08

    rows.times do |r|
      cols.times do |c|
        seed = (seed * 1103515245 + 12345) & 0x7fffffff
        noise = seed.to_f / 0x7fffffff

        lat0 = center_lat - (rows / 2.0) * cell_lat + r * cell_lat + inset_lat
        lng0 = center_lng - (cols / 2.0) * cell_lng + c * cell_lng + inset_lng
        lat1 = lat0 + cell_lat - 2 * inset_lat
        lng1 = lng0 + cell_lng - 2 * inset_lng

        dist = Math.hypot((c - cols / 2.0) / (cols / 2.0), (r - rows / 2.0) / (rows / 2.0))
        base = [0, 630000 * (1 - dist * 0.9)].max
        value = [[base * 0.72 + noise * 630000 * 0.38, 0].max, 750000].min.to_i

        features << {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [[[lng0, lat0], [lng1, lat0], [lng1, lat1], [lng0, lat1], [lng0, lat0]]]
          },
          properties: { value_per_acre: value }
        }
      end
    end

    render json: { type: "FeatureCollection", features: features }
  end
end
