import { Controller } from "@hotwired/stimulus"
import mapboxgl from "mapbox-gl"
import MapboxDraw from "@mapbox/mapbox-gl-draw"

export default class extends Controller {
  static targets = ["container", "deleteButton"]

  declare readonly containerTarget: HTMLElement
  declare readonly deleteButtonTarget: HTMLButtonElement

  map: mapboxgl.Map | null = null
  draw: MapboxDraw | null = null
  selectedFeatureId: string | null = null
  featureToDbId: Map<string, number> = new Map()

  connect() {
    const token = document.querySelector<HTMLMetaElement>('meta[name="mapbox-token"]')?.content
    if (!token) return

    mapboxgl.accessToken = token

    this.map = new mapboxgl.Map({
      container: this.containerTarget,
      style: "mapbox://styles/mapbox/satellite-v9",
      center: [-95.9928, 36.154],
      zoom: 13
    })

    this.draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: false }
    })

    this.map.addControl(new mapboxgl.NavigationControl())
    this.map.addControl(this.draw)

    this.map.on("load", () => this.loadExistingLots())
    this.map.on("draw.create", (e: any) => this.handleCreate(e))
    this.map.on("draw.update", (e: any) => this.handleUpdate(e))
    this.map.on("draw.selectionchange", (e: any) => this.handleSelectionChange(e))
  }

  disconnect() {
    this.map?.remove()
  }

  private async loadExistingLots() {
    if (!this.draw) return

    const response = await fetch("/api/v1/parking_lots/geojson")
    const geojson = await response.json()

    geojson.features.forEach((feature: GeoJSON.Feature) => {
      const [drawId] = this.draw!.add(feature)
      if (feature.properties?.id) {
        this.featureToDbId.set(drawId, feature.properties.id)
      }
    })
  }

  private async handleCreate(e: { features: GeoJSON.Feature[] }) {
    const feature = e.features[0]
    if (!feature.geometry || feature.geometry.type !== "Polygon") return

    const coordinates = feature.geometry.coordinates[0]
    const drawId = feature.id as string

    const response = await fetch("/api/v1/parking_lots", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": this.csrfToken()
      },
      body: JSON.stringify({ coordinates })
    })

    if (response.ok) {
      const data = await response.json()
      this.featureToDbId.set(drawId, data.properties.id)
    }
  }

  private async handleUpdate(e: { features: GeoJSON.Feature[] }) {
    const feature = e.features[0]
    if (!feature.geometry || feature.geometry.type !== "Polygon") return

    const drawId = feature.id as string
    const dbId = this.featureToDbId.get(drawId)
    if (!dbId) return

    const coordinates = feature.geometry.coordinates[0]

    await fetch(`/api/v1/parking_lots/${dbId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": this.csrfToken()
      },
      body: JSON.stringify({ coordinates })
    })
  }

  private handleSelectionChange(e: { features: GeoJSON.Feature[] }) {
    if (e.features.length > 0) {
      this.selectedFeatureId = e.features[0].id as string
      this.setDeleteEnabled(true)
    } else {
      this.selectedFeatureId = null
      this.setDeleteEnabled(false)
    }
  }

  async deleteSelected() {
    if (!this.selectedFeatureId || !this.draw) return

    const dbId = this.featureToDbId.get(this.selectedFeatureId)

    if (dbId) {
      await fetch(`/api/v1/parking_lots/${dbId}`, {
        method: "DELETE",
        headers: { "X-CSRF-Token": this.csrfToken() }
      })
      this.featureToDbId.delete(this.selectedFeatureId)
    }

    this.draw.delete(this.selectedFeatureId)
    this.selectedFeatureId = null
    this.setDeleteEnabled(false)
  }

  private setDeleteEnabled(enabled: boolean) {
    const btn = this.deleteButtonTarget
    btn.disabled = !enabled
    if (enabled) {
      btn.style.cssText = "background:rgba(183,48,50,0.15); border:1px solid #b73032; padding:9px 16px; font-family:'Montserrat',sans-serif; font-size:12px; font-weight:600; color:#f7f2e3; cursor:pointer; text-align:left; letter-spacing:0.5px; transition:all 0.15s;"
    } else {
      btn.style.cssText = "background:transparent; border:1px solid rgba(247,242,227,0.3); padding:9px 16px; font-family:'Montserrat',sans-serif; font-size:12px; font-weight:600; color:rgba(247,242,227,0.5); cursor:not-allowed; text-align:left; letter-spacing:0.5px; transition:all 0.15s;"
    }
  }

  private csrfToken(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? ""
  }
}
