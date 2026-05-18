import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["locationField", "latField", "lngField"]

  declare readonly locationFieldTarget: HTMLInputElement
  declare readonly latFieldTarget: HTMLInputElement
  declare readonly lngFieldTarget: HTMLInputElement

  handleSearchSelection(event: Event) {
    const customEvent = event as CustomEvent
    const { displayName } = customEvent.detail
    if (displayName) {
      this.locationFieldTarget.value = displayName
    }
  }

  handleMarkerMoved(event: Event) {
    const customEvent = event as CustomEvent
    const { latitude, longitude } = customEvent.detail
    this.latFieldTarget.value = parseFloat(latitude).toFixed(6)
    this.lngFieldTarget.value = parseFloat(longitude).toFixed(6)
  }
}
