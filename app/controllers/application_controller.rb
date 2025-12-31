class ApplicationController < ActionController::Base
  before_action :configure_permitted_parameters, if: :devise_controller?

  private

  def configure_permitted_parameters
    devise_parameter_sanitizer.permit(:sign_up, keys: [:username, :name])
    devise_parameter_sanitizer.permit(:account_update, keys: [:username, :name])
  end

  def authenticate_admin
    authenticate_or_request_with_http_basic do |username, password|
      username == ENV.fetch('ADMIN_USERNAME', 'admin') &&
      password == ENV.fetch('ADMIN_PASSWORD', 'changeme')
    end
  end
end
