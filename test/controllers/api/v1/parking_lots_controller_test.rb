require "test_helper"

class Api::V1::ParkingLotsControllerTest < ActionDispatch::IntegrationTest
  def coords
    [[-95.99, 36.15], [-95.98, 36.15], [-95.98, 36.16], [-95.99, 36.16], [-95.99, 36.15]]
  end

  test "geojson is publicly accessible and returns FeatureCollection" do
    get api_v1_parking_lots_geojson_path, as: :json
    assert_response :success
    body = response.parsed_body
    assert_equal "FeatureCollection", body["type"]
    assert body.key?("features")
  end

  test "create requires authentication" do
    post api_v1_parking_lots_path, params: { coordinates: coords }, as: :json
    assert_response :unauthorized
  end

  test "create saves a new parking lot and returns GeoJSON feature" do
    sign_in users(:one)
    assert_difference "ParkingLot.count", 1 do
      post api_v1_parking_lots_path, params: { coordinates: coords }, as: :json
    end
    assert_response :created
    body = response.parsed_body
    assert_equal "Feature", body["type"]
    assert_equal "Polygon", body["geometry"]["type"]
  end

  test "update changes coordinates" do
    sign_in users(:one)
    lot = parking_lots(:one)
    new_coords = [[-96.0, 36.2], [-95.9, 36.2], [-95.9, 36.3], [-96.0, 36.3], [-96.0, 36.2]]
    patch api_v1_parking_lot_path(lot), params: { coordinates: new_coords }, as: :json
    assert_response :success
    assert_equal new_coords, lot.reload.coordinates
  end

  test "destroy removes the parking lot" do
    sign_in users(:one)
    lot = parking_lots(:one)
    assert_difference "ParkingLot.count", -1 do
      delete api_v1_parking_lot_path(lot), as: :json
    end
    assert_response :no_content
  end

  test "destroy requires authentication" do
    lot = parking_lots(:one)
    delete api_v1_parking_lot_path(lot), as: :json
    assert_response :unauthorized
  end
end
