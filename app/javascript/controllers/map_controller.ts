import { Controller } from "@hotwired/stimulus"
import mapboxgl from 'mapbox-gl'

export default class extends Controller {
  map: mapboxgl.Map | null = null

  connect() {
    console.log("Map controller connected")

    // You'll need to set your Mapbox access token
    // Get one at https://account.mapbox.com/access-tokens/
    const accessToken = this.getAccessToken()

    if (!accessToken) {
      console.error("Mapbox access token is missing. Please set MAPBOX_ACCESS_TOKEN environment variable.")
      return
    }

    mapboxgl.accessToken = accessToken

    // Initialize the map centered on Tulsa, OK
    this.map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/pcktbot/ck1kpea561ydy1co3e6f4pso6',
      center: [-95.9928, 36.1540], // Tulsa coordinates
      zoom: 11
    })

    // Add navigation controls
    this.map.addControl(new mapboxgl.NavigationControl())

    // Load incidents data
    this.loadIncidents()
  }

  disconnect() {
    if (this.map) {
      this.map.remove()
      this.map = null
    }
  }

  private getAccessToken(): string {
    // Try to get from meta tag first (we'll add this to the view)
    const metaTag = document.querySelector('meta[name="mapbox-token"]')
    if (metaTag) {
      return metaTag.getAttribute('content') || ''
    }

    // Fallback to environment variable or empty string
    return ''
  }

  private async loadIncidents() {
    if (!this.map) return

    try {
      const response = await fetch('/api/v1/incidents/geojson')
      const geojson = await response.json()

      this.map.on('load', () => {
        if (!this.map) return

        // Add incidents source
        this.map.addSource('incidents', {
          type: 'geojson',
          data: geojson
        })

        // Add layer for incident points
        this.map.addLayer({
          id: 'incidents-points',
          type: 'circle',
          source: 'incidents',
          paint: {
            'circle-radius': 8,
            'circle-color': '#b73032', // primary color
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        })

        // Add click handler for popups
        this.map.on('click', 'incidents-points', (e) => {
          if (!this.map || !e.features || e.features.length === 0) return

          const feature = e.features[0]
          const coordinates = (feature.geometry as any).coordinates.slice()
          const properties = feature.properties

          // Create popup
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

        // Change cursor on hover
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
}
