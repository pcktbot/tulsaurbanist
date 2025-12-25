class ApplicationController < ActionController::Base
  private

  def authenticate_admin
    authenticate_or_request_with_http_basic do |username, password|
      username == ENV.fetch('ADMIN_USERNAME', 'admin') &&
      password == ENV.fetch('ADMIN_PASSWORD', 'changeme')
    end
  end
end
