require "test_helper"

class ParkingLotsControllerTest < ActionDispatch::IntegrationTest
  test "index is publicly accessible" do
    get parking_path
    assert_response :success
  end

  test "edit redirects to sign in when not authenticated" do
    get parking_edit_path
    assert_redirected_to new_user_session_path
  end

  test "edit is accessible when signed in" do
    sign_in users(:one)
    get parking_edit_path
    assert_response :success
  end
end
