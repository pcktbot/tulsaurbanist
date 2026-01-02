import { Controller } from "@hotwired/stimulus"

interface ShapeTemplate {
  id: string
  name: string
  category: string
  width: number
  depth?: number
  color: string
  is_path: boolean
  is_custom: boolean
}

export default class extends Controller {
  static targets = ["sidebar", "categories", "selectedInfo", "selectedDetails"]

  declare readonly sidebarTarget: HTMLElement
  declare readonly categoriesTarget: HTMLElement
  declare readonly selectedInfoTarget: HTMLElement
  declare readonly selectedDetailsTarget: HTMLElement

  templates: ShapeTemplate[] = []
  selectedTemplate: ShapeTemplate | null = null

  connect() {
    this.loadTemplates()
  }

  async loadTemplates() {
    try {
      const response = await fetch('/api/v1/shape_templates')
      const data = await response.json()
      this.templates = data.templates
      this.renderTemplates()
    } catch (error) {
      console.error("Error loading templates:", error)
      this.categoriesTarget.innerHTML = '<p class="error">Failed to load templates</p>'
    }
  }

  renderTemplates() {
    const categories = this.groupByCategory(this.templates)
    let html = ''

    Object.keys(categories).forEach(category => {
      html += `
        <div class="palette-section">
          <h4>${this.capitalize(category)}</h4>
          <div class="shape-grid">
            ${categories[category].map(template => this.renderTemplateButton(template)).join('')}
          </div>
        </div>
      `
    })

    this.categoriesTarget.innerHTML = html
  }

  renderTemplateButton(template: ShapeTemplate): string {
    return `
      <button
        type="button"
        class="shape-button"
        data-action="shape-palette#selectShape"
        data-template-id="${template.id}"
        style="background-color: ${template.color}; color: white;">
        <div class="shape-name">${template.name}</div>
        <div class="shape-dimensions">${template.width}m${template.depth ? ` × ${template.depth}m` : ''}</div>
      </button>
    `
  }

  selectShape(event: Event) {
    const button = event.currentTarget as HTMLButtonElement
    const templateId = button.dataset.templateId
    const template = this.templates.find(t => t.id === templateId)

    if (!template) return

    this.selectedTemplate = template

    document.querySelectorAll('.shape-button').forEach(btn => {
      btn.classList.remove('selected')
    })
    button.classList.add('selected')

    this.showSelectedInfo(template)

    const customEvent = new CustomEvent('shape-palette:shapeSelected', {
      detail: { template },
      bubbles: true
    })
    window.dispatchEvent(customEvent)
  }

  showSelectedInfo(template: ShapeTemplate) {
    this.selectedDetailsTarget.innerHTML = `
      <p><strong>${template.name}</strong></p>
      <p>Category: ${this.capitalize(template.category)}</p>
      <p>Size: ${template.width}m${template.depth ? ` × ${template.depth}m` : ''}</p>
      <p>Color: <span style="display: inline-block; width: 20px; height: 20px; background-color: ${template.color}; border: 1px solid #000;"></span></p>
    `
    this.selectedInfoTarget.style.display = 'block'
  }

  clearSelection() {
    this.selectedTemplate = null
    this.selectedInfoTarget.style.display = 'none'

    document.querySelectorAll('.shape-button').forEach(btn => {
      btn.classList.remove('selected')
    })
  }

  groupByCategory(templates: ShapeTemplate[]): Record<string, ShapeTemplate[]> {
    return templates.reduce((acc, template) => {
      if (!acc[template.category]) {
        acc[template.category] = []
      }
      acc[template.category].push(template)
      return acc
    }, {} as Record<string, ShapeTemplate[]>)
  }

  capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }
}
