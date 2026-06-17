require "net/http"
require "json"

class ParkingLotImporter
  OVERPASS_URL = "https://overpass-api.de/api/interpreter"
  QUERY = <<~OVERPASS
    [out:json][timeout:60];
    (
      way["amenity"="parking"]["parking"="surface"](35.9,-96.1,36.4,-95.7);
      relation["amenity"="parking"]["parking"="surface"](35.9,-96.1,36.4,-95.7);
    );
    out geom;
  OVERPASS

  def import
    elements = fetch_elements
    results = { imported: 0, skipped: 0, failed: 0 }
    elements.each { |element| process_element(element, results) }
    results
  end

  private

  def fetch_elements
    uri = URI(OVERPASS_URL)
    response = Net::HTTP.post_form(uri, data: QUERY)
    raise "Overpass API error: #{response.code}" unless response.is_a?(Net::HTTPSuccess)
    JSON.parse(response.body)["elements"]
  end

  def process_element(element, results)
    coords = extract_coordinates(element)
    if coords.nil? || coords.length < 4
      results[:failed] += 1
      return
    end

    external_id = "#{element["type"]}/#{element["id"]}"
    lot = ParkingLot.find_or_initialize_by(source: "osm", external_id: external_id)

    if lot.persisted?
      results[:skipped] += 1
    else
      lot.coordinates = coords
      lot.save!
      results[:imported] += 1
    end
  rescue => e
    results[:failed] += 1
  end

  def extract_coordinates(element)
    case element["type"]
    when "way"
      nodes = element["geometry"]
      return nil unless nodes&.any?
      coords = nodes.map { |n| [n["lon"], n["lat"]] }
      close_ring(coords)
    when "relation"
      outer = element["members"]&.find { |m| m["role"] == "outer" }
      return nil unless outer&.dig("geometry")&.any?
      coords = outer["geometry"].map { |n| [n["lon"], n["lat"]] }
      close_ring(coords)
    end
  end

  def close_ring(coords)
    coords << coords.first if coords.first != coords.last
    coords
  end
end
