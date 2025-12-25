import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["content"]

  declare readonly contentTarget: HTMLElement

  toggle(event: Event) {
    this.contentTarget.classList.toggle("accordion--open")

    // Rotate the icon
    const icon = (event.currentTarget as HTMLElement).querySelector(".accordion-icon")
    if (icon) {
      icon.classList.toggle("accordion-icon--rotated")
    }
  }
}
