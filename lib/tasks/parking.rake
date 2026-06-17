namespace :parking do
  desc "Import surface parking lots from OpenStreetMap via Overpass API"
  task import_osm: :environment do
    results = ParkingLotImporter.new.import
    puts "Import complete: #{results[:imported]} imported, #{results[:skipped]} skipped, #{results[:failed]} failed"
  end
end
