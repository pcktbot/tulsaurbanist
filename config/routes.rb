Rails.application.routes.draw do
  get 'dashboard', to: 'dashboard#index'
  
  resources :incidents do
    collection do
      get 'quick_new'
      post 'quick_create'
      get 'scrape_new'
      post 'scrape_create'
      get 'map'
    end
  end
  
  namespace :api do
    namespace :v1 do
      get 'incidents/geojson', to: 'incidents#geojson'
      get 'incidents/:id/geojson', to: 'incidents#show_geojson'
    end
  end
  
  root "home#index"
end
