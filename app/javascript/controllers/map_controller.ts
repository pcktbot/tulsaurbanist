import { Controller } from "@hotwired/stimulus"
import mapboxgl from 'mapbox-gl'

export default class extends Controller {
  static targets = ["container"]
  static values = {
    interactive: { type: Boolean, default: false },
    latitudeField: String,
    longitudeField: String
  }

  declare readonly containerTarget: HTMLElement
  declare readonly hasContainerTarget: boolean
  declare readonly interactiveValue: boolean
  declare readonly hasLatitudeFieldValue: boolean
  declare readonly hasLongitudeFieldValue: boolean
  declare readonly latitudeFieldValue?: string
  declare readonly longitudeFieldValue?: string

  map: mapboxgl.Map | null = null
  private marker: mapboxgl.Marker | null = null

  connect() {
    const accessToken = this.getAccessToken()

    if (!accessToken) {
      console.error("Mapbox access token is missing. Please set MAPBOX_ACCESS_TOKEN environment variable.")
      return
    }

    mapboxgl.accessToken = accessToken

    const containerId = this.hasContainerTarget ? this.containerTarget.id : 'map'

    this.map = new mapboxgl.Map({
      container: containerId,
      style: 'mapbox://styles/pcktbot/ck1kpea561ydy1co3e6f4pso6',
      center: [-95.9928, 36.1540],
      zoom: 11
    })

    this.map.addControl(new mapboxgl.NavigationControl())

    if (this.interactiveValue) {
      this.enableInteractiveMode()
    } else {
      this.loadIncidents()
    }

    this.element.addEventListener('geocode-lookup:coordinatesSelected', this.handleGeocodeSelection.bind(this))
  }

  disconnect() {
    this.element.removeEventListener('geocode-lookup:coordinatesSelected', this.handleGeocodeSelection.bind(this))

    if (this.marker) {
      this.marker.remove()
      this.marker = null
    }

    if (this.map) {
      this.map.remove()
      this.map = null
    }
  }

  private getAccessToken(): string {
    const metaTag = document.querySelector('meta[name="mapbox-token"]')
    if (metaTag) {
      return metaTag.getAttribute('content') || ''
    }
    return ''
  }

  private async loadIncidents() {
    if (!this.map) return

    try {
      const response = await fetch('/api/v1/incidents/geojson')
      const geojson = await response.json()

      this.map.on('load', () => {
        if (!this.map) return

        this.map.addSource('incidents', {
          type: 'geojson',
          data: geojson
        })

        this.map.addLayer({
          id: 'incidents-points',
          type: 'circle',
          source: 'incidents',
          paint: {
            'circle-radius': 8,
            'circle-color': '#b73032',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        })

        this.map.on('click', 'incidents-points', (e) => {
          if (!this.map || !e.features || e.features.length === 0) return

          const feature = e.features[0]
          const coordinates = (feature.geometry as any).coordinates.slice()
          const properties = feature.properties

          new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(`
              <h3>${properties.location_description || 'Unknown Location'}</h3>
              <p><strong>Date:</strong> ${properties.date_time || 'Unknown'}</p>
              <p><strong>Fatalities:</strong> ${properties.fatality_count || 0}</p>
              ${properties.brief_description ? `<p>${properties.brief_description}</p>` : ''}
              <a href="/incidents/${properties.id}">View Details</a>
            `)
            .addTo(this.map)
        })

        this.map.on('mouseenter', 'incidents-points', () => {
          if (this.map) this.map.getCanvas().style.cursor = 'pointer'
        })

        this.map.on('mouseleave', 'incidents-points', () => {
          if (this.map) this.map.getCanvas().style.cursor = ''
        })
      })
    } catch (error) {
      console.error('Error loading incidents:', error)
    }
  }

  private enableInteractiveMode() {
    if (!this.map) return

    this.map.on('click', (e) => {
      this.placeMarker(e.lngLat.lat, e.lngLat.lng)
    })

    this.map.getCanvas().style.cursor = 'crosshair'
  }

  private placeMarker(lat: number, lng: number) {
    if (!this.map) return

    if (this.marker) {
      this.marker.remove()
    }

    this.marker = new mapboxgl.Marker({
      color: '#b73032',
      draggable: true
    })
      .setLngLat([lng, lat])
      .addTo(this.map)

    this.updateFormFields(lat, lng)

    this.marker.on('dragend', () => {
      if (!this.marker) return
      const lngLat = this.marker.getLngLat()
      this.updateFormFields(lngLat.lat, lngLat.lng)
    })
  }

  private updateFormFields(lat: number, lng: number) {
    if (this.hasLatitudeFieldValue && this.hasLongitudeFieldValue) {
      const latField = document.getElementById(this.latitudeFieldValue) as HTMLInputElement
      const lngField = document.getElementById(this.longitudeFieldValue) as HTMLInputElement

      if (latField) latField.value = lat.toFixed(6)
      if (lngField) lngField.value = lng.toFixed(6)
    }
  }

  private handleGeocodeSelection(event: CustomEvent) {
    const { latitude, longitude } = event.detail

    if (this.interactiveValue && latitude && longitude) {
      this.placeMarker(latitude, longitude)

      if (this.map) {
        this.map.flyTo({
          center: [longitude, latitude],
          zoom: 15
        })
      }
    }
  }
}
