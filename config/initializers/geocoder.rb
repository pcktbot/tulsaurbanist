Geocoder.configure(
  timeout: 5,
  lookup: :mapbox,
  api_key: ENV['MAPBOX_ACCESS_TOKEN'],
  mapbox: {
    proximity: "-95.9928,36.1540"
  }
)
