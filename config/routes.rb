Rails.application.routes.draw do
  resources :incidents
  
  namespace :api do
    namespace :v1 do
      get 'incidents/geojson', to: 'incidents#geojson'
      get 'incidents/:id/geojson', to: 'incidents#show_geojson'
    end
  end
  
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Defines the root path route ("/")
  root "home#index"
end
