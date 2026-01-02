class Api::V1::ShapeTemplatesController < ApplicationController
  def index
    templates = ShapeTemplateLoader.all_templates(current_user)
    render json: { templates: templates }
  end
end
