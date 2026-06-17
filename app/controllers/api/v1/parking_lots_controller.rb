class Api::V1::ParkingLotsController < ApplicationController
  before_action :authenticate_user!, except: [:geojson]
  before_action :set_parking_lot, only: [:update, :destroy]

  def geojson
    lots = ParkingLot.all
    render json: {
      type: "FeatureCollection",
      features: lots.map(&:to_geojson_feature)
    }
  end

  def create
    lot = current_user.parking_lots.build(coordinates: params[:coordinates])
    if lot.save
      render json: lot.to_geojson_feature, status: :created
    else
      render json: { errors: lot.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def update
    if @parking_lot.update(coordinates: params[:coordinates])
      render json: @parking_lot.to_geojson_feature
    else
      render json: { errors: @parking_lot.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @parking_lot.destroy
    head :no_content
  end

  private

  def set_parking_lot
    @parking_lot = ParkingLot.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    render json: { error: "Not found" }, status: :not_found
  end
end
