class Api::V1::PlacedShapesController < ApplicationController
  before_action :authenticate_user!
  before_action :set_redesign
  before_action :set_placed_shape, only: [:update, :destroy]

  def create
    template_id = params[:shape_template_id] || params[:template_id]
    template = nil

    if template_id.present?
      template = ShapeTemplateLoader.find_template(template_id, current_user)
    end

    shape_params = placed_shape_params.to_h

    if template
      shape_params[:width] ||= template[:width]
      shape_params[:depth] ||= template[:depth]
      shape_params[:color] ||= template[:color]
      shape_params[:height] ||= template[:height]
      shape_params[:shape_type] ||= template[:category] == 'roads' ? 'road' : (template[:category] == 'parks' ? 'park' : 'building')

      unless template[:is_custom]
        shape_params[:shape_template_id] = nil
        shape_params[:metadata] = { template_key: template[:id] }
      end
    end

    @placed_shape = @redesign.placed_shapes.build(shape_params)

    if params[:road_nodes].present?
      params[:road_nodes].each_with_index do |node_params, index|
        @placed_shape.road_nodes.build(
          latitude: node_params[:latitude],
          longitude: node_params[:longitude],
          sequence_order: index
        )
      end
    end

    if @placed_shape.save
      render json: @placed_shape.as_json(include: :road_nodes), status: :created
    else
      render json: { errors: @placed_shape.errors }, status: :unprocessable_entity
    end
  end

  def update
    if params[:road_nodes].present?
      @placed_shape.road_nodes.destroy_all

      params[:road_nodes].each_with_index do |node_params, index|
        @placed_shape.road_nodes.create!(
          latitude: node_params[:latitude],
          longitude: node_params[:longitude],
          sequence_order: index
        )
      end
    end

    if @placed_shape.update(placed_shape_params)
      render json: @placed_shape.as_json(include: :road_nodes)
    else
      render json: { errors: @placed_shape.errors }, status: :unprocessable_entity
    end
  end

  def destroy
    @placed_shape.destroy
    head :no_content
  end

  private

  def set_redesign
    @redesign = current_user.redesigns.find(params[:redesign_id])
  end

  def set_placed_shape
    @placed_shape = @redesign.placed_shapes.find(params[:id])
  end

  def placed_shape_params
    params.permit(:shape_type, :latitude, :longitude, :rotation, :width, :depth, :color, :height, :shape_template_id, metadata: {})
  end
end
