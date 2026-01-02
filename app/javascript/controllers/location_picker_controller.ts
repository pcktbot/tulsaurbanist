import { Controller } from "@hotwired/stimulus"
import mapboxgl from "mapbox-gl"

export default class extends Controller {
  static targets = ["map", "latInput", "lngInput", "radiusInput"]

  declare readonly mapTarget: HTMLElement
  declare readonly latInputTarget: HTMLInputElement
  declare readonly lngInputTarget: HTMLInputElement
  declare readonly radiusInputTarget: HTMLInputElement

  map: mapboxgl.Map | null = null
  marker: mapboxgl.Marker | null = null
  circle: any = null

  connect() {
    this.initializeMap()
  }

  disconnect() {
    if (this.map) {
      this.map.remove()
    }
  }

  initializeMap() {
    const tokenMeta = document.querySelector<HTMLMetaElement>('meta[name="mapbox-token"]')
    if (!tokenMeta) {
      console.error("Mapbox token not found")
      return
    }

    mapboxgl.accessToken = tokenMeta.content

    const initialLat = parseFloat(this.latInputTarget.value) || 36.1539
    const initialLng = parseFloat(this.lngInputTarget.value) || -95.9928
    const initialRadius = parseFloat(this.radiusInputTarget.value) || 500

    this.map = new mapboxgl.Map({
      container: this.mapTarget,
      style: 'mapbox://styles/pcktbot/ck77pm7sb09if1inzw8p9uxft',
      center: [initialLng, initialLat],
      zoom: 15
    })

    this.map.addControl(new mapboxgl.NavigationControl())

    this.map.on('load', () => {
      this.addMarker(initialLat, initialLng)
      this.updateCircle()
    })

    this.radiusInputTarget.addEventListener('input', () => {
      this.updateCircle()
    })
  }

  addMarker(lat: number, lng: number) {
    if (this.marker) {
      this.marker.remove()
    }

    const el = document.createElement('div')
    el.style.width = '30px'
    el.style.height = '30px'
    el.style.backgroundColor = '#ff0000'
    el.style.border = '3px solid white'
    el.style.borderRadius = '50%'
    el.style.cursor = 'move'
    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)'

    this.marker = new mapboxgl.Marker({ element: el, draggable: true })
      .setLngLat([lng, lat])
      .addTo(this.map!)

    this.marker.on('dragend', () => {
      const lngLat = this.marker!.getLngLat()
      this.updateInputs(lngLat.lat, lngLat.lng)
      this.updateCircle()
    })
  }

  updateInputs(lat: number, lng: number) {
    this.latInputTarget.value = lat.toFixed(6)
    this.lngInputTarget.value = lng.toFixed(6)
  }

  updateCircle() {
    if (!this.map || !this.marker) return

    const lngLat = this.marker.getLngLat()
    const radiusInMeters = parseFloat(this.radiusInputTarget.value) || 500
    const radiusInKm = radiusInMeters / 1000

    const points = 64
    const coords = []

    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * 2 * Math.PI
      const dx = radiusInKm * Math.cos(angle)
      const dy = radiusInKm * Math.sin(angle)

      const lat = lngLat.lat + (dy / 110.574)
      const lng = lngLat.lng + (dx / (111.320 * Math.cos(lngLat.lat * Math.PI / 180)))

      coords.push([lng, lat])
    }

    const circleGeoJSON = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [coords]
      },
      properties: {}
    }

    if (this.map.getSource('boundary-circle')) {
      (this.map.getSource('boundary-circle') as mapboxgl.GeoJSONSource).setData(circleGeoJSON as any)
    } else {
      this.map.addSource('boundary-circle', {
        type: 'geojson',
        data: circleGeoJSON as any
      })

      this.map.addLayer({
        id: 'boundary-circle-fill',
        type: 'fill',
        source: 'boundary-circle',
        paint: {
          'fill-color': '#088',
          'fill-opacity': 0.1
        }
      })

      this.map.addLayer({
        id: 'boundary-circle-line',
        type: 'line',
        source: 'boundary-circle',
        paint: {
          'line-color': '#088',
          'line-width': 2,
          'line-dasharray': [3, 3]
        }
      })
    }
  }
}
