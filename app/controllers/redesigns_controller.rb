class RedesignsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_redesign, only: [:show, :edit, :update, :destroy]

  def index
    @redesigns = current_user.redesigns.order(updated_at: :desc)
  end

  def show
  end

  def new
    @redesign = Redesign.new(
      center_latitude: 36.1540,
      center_longitude: -95.9928,
      max_radius: 500
    )
  end

  def create
    @redesign = current_user.redesigns.build(redesign_params)

    if @redesign.save
      redirect_to @redesign, notice: 'Redesign was successfully created.'
    else
      render :new
    end
  end

  def edit
  end

  def update
    if @redesign.update(redesign_params)
      redirect_to @redesign, notice: 'Redesign was successfully updated.'
    else
      render :edit
    end
  end

  def destroy
    @redesign.destroy
    redirect_to redesigns_url, notice: 'Redesign was successfully deleted.'
  end

  private

  def set_redesign
    @redesign = current_user.redesigns.find(params[:id])
  end

  def redesign_params
    params.require(:redesign).permit(:name, :description, :center_latitude, :center_longitude, :max_radius)
  end
end
