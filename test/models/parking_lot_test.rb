require "test_helper"

class ParkingLotTest < ActiveSupport::TestCase
  def setup
    @user = users(:one)
    @coords = [[-95.99, 36.15], [-95.98, 36.15], [-95.98, 36.16], [-95.99, 36.16], [-95.99, 36.15]]
    @lot = ParkingLot.new(user: @user, coordinates: @coords)
  end

  test "valid with coordinates and user" do
    assert @lot.valid?
  end

  test "invalid without coordinates" do
    @lot.coordinates = nil
    assert_not @lot.valid?
  end

  test "invalid without user" do
    @lot.user = nil
    assert_not @lot.valid?
  end

  test "to_geojson_feature returns a valid GeoJSON Feature" do
    @lot.save!
    feature = @lot.to_geojson_feature
    assert_equal "Feature", feature[:type]
    assert_equal "Polygon", feature[:geometry][:type]
    assert_equal [@coords], feature[:geometry][:coordinates]
    assert_equal @lot.id, feature[:properties][:id]
  end
end
