require "test_helper"

class IncidentsNewLayoutTest < ActionDispatch::IntegrationTest
  include Devise::Test::IntegrationHelpers

  setup do
    @user = User.create!(email: "layouttest@example.com", password: "password123", username: "layouttester")
    sign_in @user
  end

  teardown do
    @user.destroy
  end

  test "new incident page has two-column layout with bridge controller" do
    get new_incident_path
    assert_response :success
    assert_select "[data-controller~='incident-form']", count: 1
    assert_select ".incident-form-column--left", count: 1
    assert_select ".incident-form-column--map", count: 1
  end

  test "new incident page map column has search overlay and map container" do
    get new_incident_path
    assert_response :success
    assert_select ".map-search-overlay", count: 1
    assert_select "[data-map-target='container']", count: 1
  end

  test "new incident form has plain location description field with bridge target" do
    get new_incident_path
    assert_response :success
    assert_select "input[name='incident[location_description]'][data-incident-form-target='locationField']"
  end

  test "new incident form has readonly lat and lng fields with bridge targets" do
    get new_incident_path
    assert_response :success
    assert_select "input[name='incident[latitude]'][readonly][data-incident-form-target='latField']"
    assert_select "input[name='incident[longitude]'][readonly][data-incident-form-target='lngField']"
  end

  test "new incident page without article text shows no article panel" do
    get new_incident_path
    assert_response :success
    assert_select ".article-panel", count: 0
  end
end
