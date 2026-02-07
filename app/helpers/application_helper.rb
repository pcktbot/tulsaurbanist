module ApplicationHelper
  def user_authenticated?
    user_signed_in?
  end
end
