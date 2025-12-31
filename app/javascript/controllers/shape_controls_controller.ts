import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["panel", "shapeInfo", "rotationInput", "heightInput"]

  declare readonly panelTarget: HTMLElement
  declare readonly shapeInfoTarget: HTMLElement
  declare readonly rotationInputTarget: HTMLInputElement
  declare readonly heightInputTarget: HTMLInputElement

  selectedShape: any = null

  connect() {
    window.addEventListener('shape:selected', ((e: CustomEvent) => {
      this.selectedShape = e.detail.shape
      this.showControls()
    }) as EventListener)

    window.addEventListener('shape:deselected', (() => {
      this.selectedShape = null
      this.hideControls()
    }) as EventListener)

    window.addEventListener('shape:rotated', ((e: CustomEvent) => {
      if (this.selectedShape) {
        this.selectedShape.rotation = e.detail.rotation
        this.updateRotationDisplay()
      }
    }) as EventListener)
  }

  updateRotationDisplay() {
    if (!this.selectedShape) return
    const rotation = Math.round(this.selectedShape.rotation)
    this.shapeInfoTarget.innerHTML = `
      <p><strong>${this.capitalize(this.selectedShape.shape_type)}</strong></p>
    `
    this.rotationInputTarget.value = rotation.toString()
    this.heightInputTarget.value = (this.selectedShape.height || 0).toString()
  }

  showControls() {
    if (!this.selectedShape) return

    const rotation = Math.round(this.selectedShape.rotation)
    this.shapeInfoTarget.innerHTML = `
      <p><strong>${this.capitalize(this.selectedShape.shape_type)}</strong></p>
    `
    this.rotationInputTarget.value = rotation.toString()
    this.heightInputTarget.value = (this.selectedShape.height || 0).toString()

    this.panelTarget.style.display = 'block'
  }

  hideControls() {
    this.panelTarget.style.display = 'none'
  }

  rotateLeft() {
    this.dispatchRotateEvent(-15)
  }

  rotateRight() {
    this.dispatchRotateEvent(15)
  }

  setRotation() {
    const targetRotation = parseInt(this.rotationInputTarget.value)
    if (isNaN(targetRotation)) return

    const currentRotation = this.selectedShape?.rotation || 0
    const delta = targetRotation - currentRotation

    this.dispatchRotateEvent(delta)
  }

  setHeight() {
    const targetHeight = parseInt(this.heightInputTarget.value)
    if (isNaN(targetHeight)) return

    this.dispatchHeightEvent(targetHeight)
  }

  deleteShape() {
    this.dispatchDeleteEvent()
  }

  dispatchRotateEvent(degrees: number) {
    const mapController = this.application.getControllerForElementAndIdentifier(
      document.querySelector('[data-controller~="redesign-map"]')!,
      'redesign-map'
    ) as any

    if (mapController && mapController.rotateShape) {
      mapController.rotateShape(degrees)
    }
  }

  dispatchHeightEvent(height: number) {
    const mapController = this.application.getControllerForElementAndIdentifier(
      document.querySelector('[data-controller~="redesign-map"]')!,
      'redesign-map'
    ) as any

    if (mapController && mapController.updateHeight) {
      mapController.updateHeight(height)
    }
  }

  dispatchDeleteEvent() {
    const mapController = this.application.getControllerForElementAndIdentifier(
      document.querySelector('[data-controller~="redesign-map"]')!,
      'redesign-map'
    ) as any

    if (mapController && mapController.deleteShape) {
      mapController.deleteShape()
    }
  }

  capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }
}
