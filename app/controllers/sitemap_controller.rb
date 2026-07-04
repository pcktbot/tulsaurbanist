class SitemapController < ApplicationController
  def index
    @incidents = Incident.order(date_time: :desc)
    @redesigns = Redesign.all
    respond_to do |format|
      format.xml { render layout: false }
    end
  end
end
