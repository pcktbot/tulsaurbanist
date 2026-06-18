import { Controller } from "@hotwired/stimulus"
import mapboxgl from "mapbox-gl"

interface LensConfig {
  id: string
  label: string
  color: string
  layers: string[]
  defaultVisible: boolean
}

const VALUE_RAMP: [number, string][] = [
  [0,      "#16223a"],
  [50000,  "#2f4258"],
  [100000, "#5b677c"],
  [200000, "#9dc4b5"],
  [400000, "#e2b142"],
  [630000, "#f4d27a"],
]

const LENSES: LensConfig[] = [
  { id: "value_per_acre", label: "Value per acre", color: "#e2b142", layers: ["vpa-fill", "vpa-dead-zone-outline"], defaultVisible: true },
  { id: "fatalities", label: "Fatalities", color: "#b73032", layers: ["fatalities-glow", "fatalities-points"], defaultVisible: true },
  { id: "parking", label: "Surface parking", color: "#5b677c", layers: ["parking-fill", "parking-outline"], defaultVisible: true },
  { id: "redesigns", label: "Redesigns", color: "#e2b142", layers: [], defaultVisible: false },
]

export default class extends Controller {
  static targets = ["container", "panel"]

  declare readonly containerTarget: HTMLElement
  declare readonly panelTarget: HTMLElement

  map: mapboxgl.Map | null = null
  private panelCollapsed = false
  private visibleLayers: Set<string> = new Set()

  connect() {
    const token = document.querySelector<HTMLMetaElement>('meta[name="mapbox-token"]')?.content
    if (!token) return

    mapboxgl.accessToken = token

    this.initVisibility()

    this.map = new mapboxgl.Map({
      container: this.containerTarget,
      style: "mapbox://styles/mapbox/empty-v9",
      center: [-95.9928, 36.154],
      zoom: 11
    })

    this.map.addControl(new mapboxgl.NavigationControl(), "bottom-right")

    this.map.on("load", () => {
      this.addBaseMap()
      this.loadValuePerAcre()
      this.loadFatalities()
      this.loadParkingLots()
    })
  }

  disconnect() {
    this.map?.remove()
    this.map = null
  }

  togglePanel() {
    this.panelCollapsed = !this.panelCollapsed
    const body = this.panelTarget.querySelector<HTMLElement>("[data-panel-body]")
    const caret = this.panelTarget.querySelector<HTMLElement>("[data-panel-caret]")
    if (body) body.style.display = this.panelCollapsed ? "none" : "block"
    if (caret) caret.textContent = this.panelCollapsed ? "+" : "–"
  }

  toggleLayer(event: Event) {
    const btn = event.currentTarget as HTMLElement
    const lensId = btn.dataset.lensId
    if (!lensId) return

    const lens = LENSES.find(l => l.id === lensId)
    if (!lens) return

    if (this.visibleLayers.has(lensId)) {
      this.visibleLayers.delete(lensId)
    } else {
      this.visibleLayers.add(lensId)
    }

    const visibility = this.visibleLayers.has(lensId) ? "visible" : "none"
    lens.layers.forEach(layerId => {
      if (this.map?.getLayer(layerId)) {
        this.map.setLayoutProperty(layerId, "visibility", visibility)
      }
    })

    this.updateToggleStyle(btn, this.visibleLayers.has(lensId))
    this.persistURLState()
  }

  private initVisibility() {
    const params = new URLSearchParams(window.location.search)
    const layersParam = params.get("layers")

    if (layersParam) {
      const ids = new Set(layersParam.split(","))
      LENSES.forEach(l => {
        if (ids.has(l.id)) this.visibleLayers.add(l.id)
      })
    } else {
      LENSES.forEach(l => {
        if (l.defaultVisible) this.visibleLayers.add(l.id)
      })
    }
  }

  private updateToggleStyle(btn: HTMLElement, isOn: boolean) {
    const pill = btn.querySelector<HTMLElement>("[data-pill]")
    const knob = btn.querySelector<HTMLElement>("[data-knob]")
    if (pill) pill.style.background = isOn ? "#e2b142" : "rgba(247,242,227,0.15)"
    if (knob) knob.style.transform = isOn ? "translateX(19px)" : "translateX(2px)"
  }

  private addBaseMap() {
    if (!this.map) return

    this.map.addLayer({
      id: "background",
      type: "background",
      paint: { "background-color": "#0d1830" }
    })

    this.map.addSource("mapbox-streets", {
      type: "vector",
      url: "mapbox://mapbox.mapbox-streets-v8"
    })

    this.map.addLayer({
      id: "streets-local",
      type: "line",
      source: "mapbox-streets",
      "source-layer": "road",
      paint: {
        "line-color": "rgba(247,242,227,0.07)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.4, 14, 1, 18, 2]
      }
    })

    this.map.addLayer({
      id: "streets-major",
      type: "line",
      source: "mapbox-streets",
      "source-layer": "road",
      filter: ["in", "class", "motorway", "trunk", "primary", "secondary"],
      paint: {
        "line-color": "rgba(247,242,227,0.15)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1, 14, 2.5, 18, 5]
      }
    })
  }

  private persistURLState() {
    const url = new URL(window.location.href)
    url.searchParams.set("layers", Array.from(this.visibleLayers).join(","))
    window.history.replaceState({}, "", url.toString())
  }

  private async loadValuePerAcre() {
    if (!this.map) return
    const response = await fetch("/api/v1/parcels/value_per_acre.geojson")
    const geojson = await response.json()
    const visibility = this.visibleLayers.has("value_per_acre") ? "visible" : "none"

    this.map.addSource("value-per-acre", { type: "geojson", data: geojson })

    const stepExpr: any[] = ["step", ["get", "value_per_acre"]]
    VALUE_RAMP.forEach(([threshold, color], i) => {
      if (i === 0) { stepExpr.push(color) } else { stepExpr.push(threshold, color) }
    })

    this.map.addLayer({
      id: "vpa-fill",
      type: "fill",
      source: "value-per-acre",
      paint: { "fill-color": stepExpr as any, "fill-opacity": 0.85 },
      layout: { visibility }
    })

    this.map.addLayer({
      id: "vpa-dead-zone-outline",
      type: "line",
      source: "value-per-acre",
      filter: ["==", ["get", "is_dead_zone"], true],
      paint: { "line-color": "#b73032", "line-width": 1.5, "line-dasharray": [3, 2] },
      layout: { visibility }
    })
  }

  private async loadFatalities() {
    if (!this.map) return
    const response = await fetch("/api/v1/incidents/geojson")
    const geojson = await response.json()
    const visibility = this.visibleLayers.has("fatalities") ? "visible" : "none"

    this.map.addSource("fatalities", { type: "geojson", data: geojson })

    this.map.addLayer({
      id: "fatalities-glow",
      type: "circle",
      source: "fatalities",
      paint: {
        "circle-radius": 14,
        "circle-color": "#b73032",
        "circle-opacity": 0.18,
        "circle-blur": 1
      },
      layout: { visibility }
    })

    this.map.addLayer({
      id: "fatalities-points",
      type: "circle",
      source: "fatalities",
      paint: {
        "circle-radius": 6,
        "circle-color": "#b73032",
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#f7f2e3"
      },
      layout: { visibility }
    })

    this.map.on("click", "fatalities-points", (e) => {
      if (!this.map || !e.features?.length) return
      const props = e.features[0].properties || {}
      const coords = (e.features[0].geometry as GeoJSON.Point).coordinates.slice() as [number, number]
      const count = props.fatality_count || 0
      new mapboxgl.Popup({ offset: 12 })
        .setLngLat(coords)
        .setHTML(`
          <strong>${props.location_description || "Unknown location"}</strong>
          <div style="margin-top:4px;font-size:13px;">${props.date_time || ""}</div>
          <div style="margin-top:2px;font-size:13px;">${count} ${count === 1 ? "fatality" : "fatalities"}</div>
          <a href="/incidents/${props.id}" style="display:inline-block;margin-top:8px;font-size:13px;">View details →</a>
        `)
        .addTo(this.map)
    })

    this.map.on("mouseenter", "fatalities-points", () => {
      if (this.map) this.map.getCanvas().style.cursor = "pointer"
    })
    this.map.on("mouseleave", "fatalities-points", () => {
      if (this.map) this.map.getCanvas().style.cursor = ""
    })
  }

  private async loadParkingLots() {
    if (!this.map) return
    const response = await fetch("/api/v1/parking_lots/geojson")
    const geojson = await response.json()
    const visibility = this.visibleLayers.has("parking") ? "visible" : "none"

    this.map.addSource("parking", { type: "geojson", data: geojson })

    this.map.addLayer({
      id: "parking-fill",
      type: "fill",
      source: "parking",
      paint: { "fill-color": "#5b677c", "fill-opacity": 0.75 },
      layout: { visibility }
    })

    this.map.addLayer({
      id: "parking-outline",
      type: "line",
      source: "parking",
      paint: { "line-color": "#9dc4b5", "line-width": 1, "line-opacity": 0.6 },
      layout: { visibility }
    })
  }
}
