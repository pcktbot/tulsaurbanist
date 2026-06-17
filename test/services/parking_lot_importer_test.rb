require "test_helper"
require "minitest/mock"

class ParkingLotImporterTest < ActiveSupport::TestCase
  WAY_RESPONSE = {
    "elements" => [
      {
        "type" => "way",
        "id" => 999001,
        "geometry" => [
          { "lat" => 36.15, "lon" => -95.99 },
          { "lat" => 36.15, "lon" => -95.98 },
          { "lat" => 36.16, "lon" => -95.98 },
          { "lat" => 36.16, "lon" => -95.99 },
          { "lat" => 36.15, "lon" => -95.99 }
        ]
      }
    ]
  }.freeze

  RELATION_RESPONSE = {
    "elements" => [
      {
        "type" => "relation",
        "id" => 999002,
        "members" => [
          {
            "type" => "way",
            "role" => "outer",
            "geometry" => [
              { "lat" => 36.20, "lon" => -96.00 },
              { "lat" => 36.20, "lon" => -95.99 },
              { "lat" => 36.21, "lon" => -95.99 },
              { "lat" => 36.20, "lon" => -96.00 }
            ]
          }
        ]
      }
    ]
  }.freeze

  def stub_overpass(body)
    mock_response = Minitest::Mock.new
    mock_response.expect(:is_a?, true, [Net::HTTPSuccess])
    mock_response.expect(:body, body.to_json)
    Net::HTTP.stub(:post_form, mock_response) { yield }
  end

  test "imports a way element" do
    stub_overpass(WAY_RESPONSE) do
      assert_difference "ParkingLot.count", 1 do
        result = ParkingLotImporter.new.import
        assert_equal 1, result[:imported]
        assert_equal 0, result[:skipped]
        assert_equal 0, result[:failed]
      end
    end

    lot = ParkingLot.find_by(source: "osm", external_id: "way/999001")
    assert_not_nil lot
    assert_equal [[-95.99, 36.15], [-95.98, 36.15], [-95.98, 36.16], [-95.99, 36.16], [-95.99, 36.15]], lot.coordinates
  end

  test "skips already-imported way" do
    ParkingLot.create!(
      source: "osm",
      external_id: "way/999001",
      coordinates: [[-95.99, 36.15], [-95.98, 36.15], [-95.98, 36.16], [-95.99, 36.15]]
    )

    stub_overpass(WAY_RESPONSE) do
      assert_no_difference "ParkingLot.count" do
        result = ParkingLotImporter.new.import
        assert_equal 0, result[:imported]
        assert_equal 1, result[:skipped]
      end
    end
  end

  test "imports a relation element using outer member geometry" do
    stub_overpass(RELATION_RESPONSE) do
      assert_difference "ParkingLot.count", 1 do
        result = ParkingLotImporter.new.import
        assert_equal 1, result[:imported]
      end
    end

    lot = ParkingLot.find_by(source: "osm", external_id: "relation/999002")
    assert_not_nil lot
    assert_equal [[-96.00, 36.20], [-95.99, 36.20], [-95.99, 36.21], [-96.00, 36.20]], lot.coordinates
  end

  test "raises when Overpass returns an error status" do
    mock_response = Minitest::Mock.new
    mock_response.expect(:is_a?, false, [Net::HTTPSuccess])
    mock_response.expect(:code, "429")

    Net::HTTP.stub(:post_form, mock_response) do
      assert_raises(RuntimeError) { ParkingLotImporter.new.import }
    end
  end

  test "counts element with no geometry as failed, continues" do
    response = { "elements" => [{ "type" => "way", "id" => 1, "geometry" => [] }] }
    stub_overpass(response) do
      result = ParkingLotImporter.new.import
      assert_equal 0, result[:imported]
      assert_equal 1, result[:failed]
    end
  end
end
