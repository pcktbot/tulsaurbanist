class CorridorsController < ApplicationController
  CORRIDORS = [
    {
      slug: "admiral-blvd",
      name: "Admiral Boulevard",
      short_name: "Admiral Blvd",
      fatalities: 8,
      description: "A five-lane arterial with no median and few safe crossings. Eight fatalities since 2021.",
      detail: "Admiral Boulevard runs east–west through north Tulsa as a five-lane arterial — two travel lanes each direction with a center turn lane. Designed for throughput, not for people: sidewalks are discontinuous, crosswalks are few and uncontrolled, and the speed limit climbs to 45 mph in stretches where residential driveways open directly onto the road. Since 2021, eight people have died on this corridor.",
      area: "North Tulsa",
      length_miles: 6.2,
      speed_limit: 45,
      lanes: 5,
      center_lat: 36.1773,
      center_lng: -95.9780,
      zoom: 13
    },
    {
      slug: "11th-street-route-66",
      name: "11th Street / Route 66",
      short_name: "11th Street / Route 66",
      fatalities: 7,
      description: "Historic Route 66, now a wide speedway past the university. Seven lives lost.",
      detail: "Eleventh Street is Tulsa's stretch of Historic Route 66 — a designation that draws tourists but disguises a road engineered for mid-century car volume. Six lanes of asphalt run past the University of Tulsa campus and through dense mid-city commercial strips. Bus riders and students cross on foot here daily; seven have not survived.",
      area: "Midtown Tulsa",
      length_miles: 4.8,
      speed_limit: 35,
      lanes: 6,
      center_lat: 36.1381,
      center_lng: -95.9672,
      zoom: 13
    },
    {
      slug: "peoria-avenue",
      name: "Peoria Avenue",
      short_name: "Peoria Ave",
      fatalities: 6,
      description: "A transit spine that still moves cars first. Six pedestrians killed in three years.",
      detail: "Peoria Avenue is one of Tulsa's primary bus corridors, carrying thousands of transit riders north–south through the city. The road remains six lanes with parking, short signal cycles, and intersections designed for vehicle throughput. Six pedestrians — nearly all of them transit-dependent — have been killed in three years.",
      area: "Midtown / South Tulsa",
      length_miles: 7.1,
      speed_limit: 40,
      lanes: 6,
      center_lat: 36.1200,
      center_lng: -95.9939,
      zoom: 13
    },
    {
      slug: "memorial-drive",
      name: "Memorial Drive",
      short_name: "Memorial Drive",
      fatalities: 6,
      description: "Seven lanes of east-side sprawl with bus stops marooned between turn lanes.",
      detail: "Memorial Drive is east Tulsa's commercial spine — a seven-lane arterial lined with strip malls, drive-throughs, and big-box anchors. Bus stops sit in narrow margins between right-turn lanes and parking lots. Six people have died trying to reach destinations on foot along this corridor.",
      area: "East Tulsa",
      length_miles: 8.3,
      speed_limit: 45,
      lanes: 7,
      center_lat: 36.1250,
      center_lng: -95.8910,
      zoom: 12
    },
    {
      slug: "riverside-drive",
      name: "Riverside Drive",
      short_name: "Riverside Drive",
      fatalities: 5,
      description: "Tulsa's riverfront, divided from the water by a high-speed parkway.",
      detail: "Riverside Drive follows the Arkansas River through Tulsa's western edge — a parkway that could connect the city to its waterfront but instead functions as a 45 mph barrier. Trail users, cyclists, and pedestrians crossing between neighborhoods and the river path have been killed here. Five deaths since 2021.",
      area: "West Tulsa / Riverside",
      length_miles: 5.4,
      speed_limit: 45,
      lanes: 4,
      center_lat: 36.1320,
      center_lng: -96.0200,
      zoom: 13
    },
    {
      slug: "yale-avenue",
      name: "Yale Avenue",
      short_name: "Yale Avenue",
      fatalities: 5,
      description: "A commercial strip where crossing on foot can mean a quarter-mile detour.",
      detail: "Yale Avenue bisects south Tulsa as a six-lane commercial arterial. Signalized intersections are spaced a quarter-mile or more apart, leaving pedestrians with long detours or dangerous mid-block crossings. Five people have been killed here since 2021, several while attempting to reach bus stops.",
      area: "South Tulsa",
      length_miles: 5.9,
      speed_limit: 40,
      lanes: 6,
      center_lat: 36.0900,
      center_lng: -95.9318,
      zoom: 13
    }
  ].freeze

  def index
  end

  def show
    @corridor = CORRIDORS.find { |c| c[:slug] == params[:slug] }
    render file: "#{Rails.root}/public/404.html", status: :not_found, layout: false unless @corridor
  end
end
