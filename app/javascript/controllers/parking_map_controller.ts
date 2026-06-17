import { Controller } from "@hotwired/stimulus"
import mapboxgl from "mapbox-gl"

export default class extends Controller {
  static targets = ["container", "streetsButton"]

  declare readonly containerTarget: HTMLElement
  declare readonly streetsButtonTarget: HTMLButtonElement

  map: mapboxgl.Map | null = null
  streetsVisible: boolean = false

  connect() {
    const token = document.querySelector<HTMLMetaElement>('meta[name="mapbox-token"]')?.content
    if (!token) return

    mapboxgl.accessToken = token

    this.map = new mapboxgl.Map({
      container: this.containerTarget,
      style: "mapbox://styles/mapbox/empty-v9",
      center: [-95.9928, 36.154],
      zoom: 11
    })

    this.map.on("load", () => {
      this.addStreetsLayer()
      this.loadParkingLots()
    })
  }

  disconnect() {
    this.map?.remove()
  }

  private addStreetsLayer() {
    if (!this.map) return

    this.map.addSource("mapbox-streets", {
      type: "vector",
      url: "mapbox://mapbox.mapbox-streets-v8"
    })

    this.map.addLayer({
      id: "streets-layer",
      type: "line",
      source: "mapbox-streets",
      "source-layer": "road",
      paint: {
        "line-color": "#E5E7EB",
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.5, 15, 2]
      },
      layout: { visibility: "none" }
    })
  }

  private async loadParkingLots() {
    if (!this.map) return

    const response = await fetch("/api/v1/parking_lots/geojson")
    const geojson = await response.json()

    this.map.addSource("parking-lots", {
      type: "geojson",
      data: geojson
    })

    this.map.addLayer({
      id: "parking-lots-fill",
      type: "fill",
      source: "parking-lots",
      paint: {
        "fill-color": "#F59E0B",
        "fill-opacity": 1
      }
    })

    this.map.addLayer({
      id: "parking-lots-outline",
      type: "line",
      source: "parking-lots",
      paint: {
        "line-color": "#F59E0B",
        "line-width": 1
      }
    })
  }

  toggleStreets() {
    if (!this.map) return

    this.streetsVisible = !this.streetsVisible
    const visibility = this.streetsVisible ? "visible" : "none"
    this.map.setLayoutProperty("streets-layer", "visibility", visibility)
    this.streetsButtonTarget.textContent = this.streetsVisible ? "Hide streets" : "Show streets"
  }
}
