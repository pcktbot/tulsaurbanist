import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["panel", "toggle"]
  static classes = ["open"]

  declare readonly panelTarget: HTMLElement
  declare readonly toggleTarget: HTMLElement
  declare readonly hasOpenClass: boolean
  declare readonly openClass: string

  private isOpen: boolean = false

  connect() {
    this.isOpen = false
  }

  toggle() {
    this.isOpen = !this.isOpen

    if (this.isOpen) {
      this.panelTarget.classList.add(this.openClass || 'open')
    } else {
      this.panelTarget.classList.remove(this.openClass || 'open')
    }
  }

  open() {
    this.isOpen = true
    this.panelTarget.classList.add(this.openClass || 'open')
  }

  close() {
    this.isOpen = false
    this.panelTarget.classList.remove(this.openClass || 'open')
  }
}
