Rails.application.routes.draw do
  devise_for :users
  get 'dashboard', to: 'dashboard#index'
  get 'parking', to: 'parking_lots#edit'

  resources :redesigns

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
      get 'geocode', to: 'geocode#search'
      get 'parking_lots/geojson', to: 'parking_lots#geojson'
      resources :parking_lots, only: [:create, :update, :destroy]

      resources :shape_templates, only: [:index]

      resources :redesigns, only: [:index, :show, :create, :update, :destroy] do
        member do
          get :geojson
        end
        resources :placed_shapes, only: [:create, :update, :destroy]
      end
    end
  end
  
  get '/map', to: 'map#index'

  get '/sitemap.xml', to: 'sitemap#index', defaults: { format: 'xml' }

  root "home#index"
end
