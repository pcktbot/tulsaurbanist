class ParkingLotsController < ApplicationController
  before_action :authenticate_user!, only: [:edit]

  def index
  end

  def edit
  end
end
