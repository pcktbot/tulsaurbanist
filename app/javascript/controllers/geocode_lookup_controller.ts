import { Controller } from "@hotwired/stimulus"

interface GeocodeResult {
  latitude: number
  longitude: number
  display_name: string
}

export default class extends Controller {
  static targets = ["input", "latitudeField", "longitudeField", "results", "displayName"]
  static values = {
    apiUrl: { type: String, default: "/api/v1/geocode" }
  }

  declare readonly inputTarget: HTMLInputElement
  declare readonly latitudeFieldTarget: HTMLInputElement
  declare readonly longitudeFieldTarget: HTMLInputElement
  declare readonly resultsTarget: HTMLElement
  declare readonly hasResultsTarget: boolean
  declare readonly hasDisplayNameTarget: boolean
  declare readonly displayNameTarget?: HTMLElement
  declare readonly apiUrlValue: string

  private debounceTimer?: number

  connect() {
    console.log("Geocode lookup controller connected")
  }

  disconnect() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
  }

  search() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    const query = this.inputTarget.value.trim()

    if (query.length < 3) {
      this.clearResults()
      return
    }

    this.debounceTimer = window.setTimeout(() => {
      this.performSearch(query)
    }, 500)
  }

  private async performSearch(query: string) {
    try {
      const response = await fetch(`${this.apiUrlValue}?q=${encodeURIComponent(query)}`)

      if (!response.ok) {
        throw new Error(`Geocode request failed: ${response.statusText}`)
      }

      const results: GeocodeResult[] = await response.json()
      this.displayResults(results)
    } catch (error) {
      console.error("Geocoding error:", error)
      this.showError("Unable to geocode address. Please try again.")
    }
  }

  private displayResults(results: GeocodeResult[]) {
    if (!this.hasResultsTarget) return

    if (results.length === 0) {
      this.resultsTarget.innerHTML = '<div class="geocode-result-item">No results found</div>'
      this.resultsTarget.classList.remove('hidden')
      return
    }

    this.resultsTarget.innerHTML = results.map((result, index) => `
      <div class="geocode-result-item" data-action="click->geocode-lookup#selectResult" data-index="${index}" data-lat="${result.latitude}" data-lng="${result.longitude}" data-name="${this.escapeHtml(result.display_name)}">
        ${this.escapeHtml(result.display_name)}
      </div>
    `).join('')

    this.resultsTarget.classList.remove('hidden')
  }

  selectResult(event: Event) {
    const element = event.currentTarget as HTMLElement
    const lat = element.dataset.lat
    const lng = element.dataset.lng
    const name = element.dataset.name

    if (lat && lng) {
      this.setCoordinates(parseFloat(lat), parseFloat(lng), name)
    }

    this.clearResults()
  }

  setCoordinates(lat: number, lng: number, displayName?: string) {
    this.latitudeFieldTarget.value = lat.toString()
    this.longitudeFieldTarget.value = lng.toString()

    if (displayName && this.hasDisplayNameTarget && this.displayNameTarget) {
      this.displayNameTarget.textContent = `Selected: ${displayName}`
      this.displayNameTarget.classList.remove('hidden')
    }

    this.dispatch("coordinatesSelected", {
      detail: { latitude: lat, longitude: lng, displayName }
    })
  }

  clearResults() {
    if (this.hasResultsTarget) {
      this.resultsTarget.innerHTML = ''
      this.resultsTarget.classList.add('hidden')
    }
  }

  private showError(message: string) {
    if (this.hasResultsTarget) {
      this.resultsTarget.innerHTML = `<div class="geocode-result-item error">${message}</div>`
      this.resultsTarget.classList.remove('hidden')
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}
