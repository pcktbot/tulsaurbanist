module ApplicationHelper
  def user_authenticated?
    return false unless request.authorization.present?

    credentials = ActionController::HttpAuthentication::Basic.decode_credentials(request)
    username, password = credentials.split(':', 2)

    username == ENV.fetch('ADMIN_USERNAME', 'admin') &&
    password == ENV.fetch('ADMIN_PASSWORD', 'changeme')
  end
end
