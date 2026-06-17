namespace :parking do
  desc "Import surface parking lots from OpenStreetMap via Overpass API"
  task import_osm: :environment do
    results = ParkingLotImporter.new.import
    puts "Import complete: #{results[:imported]} imported, #{results[:skipped]} skipped, #{results[:failed]} failed"
  end

  desc "Export all parking lots to tmp/parking_lots.geojson"
  task export_geojson: :environment do
    lots = ParkingLot.all
    geojson = {
      type: "FeatureCollection",
      features: lots.map(&:to_geojson_feature)
    }
    path = Rails.root.join("tmp", "parking_lots.geojson")
    File.write(path, JSON.pretty_generate(geojson))
    puts "Exported #{lots.count} parking lots to #{path}"
  end

  desc "Import parking lots from tmp/parking_lots.geojson (skips existing by coordinates match)"
  task import_geojson: :environment do
    path = Rails.root.join("tmp", "parking_lots.geojson")
    abort "File not found: #{path}" unless File.exist?(path)

    geojson = JSON.parse(File.read(path))
    imported = skipped = 0

    geojson["features"].each do |feature|
      coords = feature.dig("geometry", "coordinates", 0)
      next skipped += 1 if ParkingLot.exists?(coordinates: coords)
      ParkingLot.create!(coordinates: coords)
      imported += 1
    end

    puts "Import complete: #{imported} imported, #{skipped} skipped"
  end
end
