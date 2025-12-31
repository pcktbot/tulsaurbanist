import { Controller } from "@hotwired/stimulus"
import mapboxgl from "mapbox-gl"

interface PlacedShape {
  id: number
  shape_type: string
  latitude: number
  longitude: number
  rotation: number
  width?: number
  depth?: number
  color?: string
  height?: number
  road_nodes?: Array<{ latitude: number; longitude: number; sequence_order: number }>
}

export default class extends Controller {
  static targets = ["container", "roadButton", "viewButton"]
  static values = {
    redesignId: Number,
    centerLat: Number,
    centerLng: Number,
    maxRadius: Number
  }

  declare readonly containerTarget: HTMLElement
  declare readonly roadButtonTarget: HTMLButtonElement
  declare readonly viewButtonTarget: HTMLButtonElement
  declare readonly redesignIdValue: number
  declare readonly centerLatValue: number
  declare readonly centerLngValue: number
  declare readonly maxRadiusValue: number

  map: mapboxgl.Map | null = null
  placementMode: "shape" | "road" | null = null
  selectedTemplate: any = null
  selectedShape: PlacedShape | null = null
  roadNodes: Array<{ lat: number; lng: number }> = []
  previewMarker: mapboxgl.Marker | null = null
  roadPreviewNodes: mapboxgl.Marker[] = []
  isDragging: boolean = false
  isRotating: boolean = false
  shapesData: PlacedShape[] = []
  rotationHandles: mapboxgl.Marker[] = []
  is3DView: boolean = true

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

    this.map = new mapboxgl.Map({
      container: this.containerTarget,
      style: 'mapbox://styles/pcktbot/ck77pm7sb09if1inzw8p9uxft',
      center: [this.centerLngValue, this.centerLatValue],
      zoom: 15,
      pitch: 60,
      bearing: 0
    })

    this.map.addControl(new mapboxgl.NavigationControl())

    this.map.on('load', () => {
      this.drawBoundaryCircle()
      this.loadShapes()
      this.setupShapeInteraction()
    })

    this.map.on('click', (e) => {
      this.handleMapClick(e)
    })

    this.map.on('mousemove', (e) => {
      if (this.placementMode === 'shape' && this.selectedTemplate) {
        this.updatePreview(e.lngLat.lat, e.lngLat.lng)
      }
    })

    window.addEventListener('shape-palette:shapeSelected', ((e: CustomEvent) => {
      this.selectedTemplate = e.detail.template
      this.placementMode = 'shape'
      this.clearSelection()
      this.map!.getCanvas().style.cursor = 'crosshair'
    }) as EventListener)
  }

  setupShapeInteraction() {
    if (!this.map) return

    this.map.on('click', 'shapes-fill', (e) => {
      if (this.placementMode || this.isDragging) return

      e.preventDefault()
      const feature = e.features?.[0]
      if (feature && feature.properties) {
        const shapeId = feature.properties.id
        const shape = this.shapesData.find(s => s.id === shapeId)
        if (shape && shape.shape_type !== 'road') {
          this.selectShape(shape)
        }
      }
    })

    this.map.on('mouseenter', 'shapes-fill', (e) => {
      if (!this.placementMode && !this.isDragging) {
        const feature = e.features?.[0]
        if (feature && feature.properties) {
          const shapeId = feature.properties.id
          const shape = this.shapesData.find(s => s.id === shapeId)
          if (shape && shape.shape_type !== 'road') {
            this.map!.getCanvas().style.cursor = 'grab'
          }
        }
      }
    })

    this.map.on('mouseleave', 'shapes-fill', () => {
      if (!this.placementMode && !this.isDragging) {
        this.map!.getCanvas().style.cursor = ''
      }
    })

    this.map.on('mousedown', 'shapes-fill', (e) => {
      if (this.placementMode) return

      e.preventDefault()

      const feature = e.features?.[0]
      if (feature && feature.properties) {
        const shapeId = feature.properties.id
        const shape = this.shapesData.find(s => s.id === shapeId)

        if (shape && shape.shape_type !== 'road') {
          if (!this.selectedShape || this.selectedShape.id !== shape.id) {
            this.selectShape(shape)
          }

          this.isDragging = true
          this.map!.getCanvas().style.cursor = 'grabbing'
          this.map!.dragPan.disable()

          const onMove = (e: mapboxgl.MapMouseEvent) => {
            if (!this.isDragging || !this.selectedShape) return
            this.updateShapePosition(e.lngLat.lat, e.lngLat.lng)
          }

          const onUp = () => {
            if (!this.isDragging) return
            this.isDragging = false
            this.map!.getCanvas().style.cursor = 'grab'
            this.map!.dragPan.enable()
            this.map!.off('mousemove', onMove)
            this.map!.off('mouseup', onUp)

            if (this.selectedShape) {
              this.saveShapePosition()
            }
          }

          this.map!.on('mousemove', onMove)
          this.map!.on('mouseup', onUp)
        }
      }
    })
  }

  selectShape(shape: PlacedShape) {
    this.selectedShape = shape
    this.highlightSelectedShape()
    this.addRotationHandles()
    this.showShapeControls()
    this.dispatchShapeSelected(shape)
  }

  clearSelection() {
    this.selectedShape = null
    this.removeRotationHandles()
    this.hideShapeControls()
    this.clearHighlight()
  }

  highlightSelectedShape() {
    if (!this.map || !this.selectedShape) return

    const feature = this.createShapeFeature(this.selectedShape)

    if (this.map.getSource('selected-shape')) {
      (this.map.getSource('selected-shape') as mapboxgl.GeoJSONSource).setData(feature as any)
    } else {
      this.map.addSource('selected-shape', {
        type: 'geojson',
        data: feature as any
      })

      this.map.addLayer({
        id: 'selected-shape-highlight',
        type: 'line',
        source: 'selected-shape',
        paint: {
          'line-color': '#ff0000',
          'line-width': 5,
          'line-opacity': 1
        }
      })

      this.map.addLayer({
        id: 'selected-shape-highlight-dash',
        type: 'line',
        source: 'selected-shape',
        paint: {
          'line-color': '#ffffff',
          'line-width': 5,
          'line-dasharray': [3, 3],
          'line-opacity': 0.8
        }
      })
    }
  }

  clearHighlight() {
    if (!this.map) return

    if (this.map.getLayer('selected-shape-highlight-dash')) {
      this.map.removeLayer('selected-shape-highlight-dash')
    }
    if (this.map.getLayer('selected-shape-highlight')) {
      this.map.removeLayer('selected-shape-highlight')
    }
    if (this.map.getSource('selected-shape')) {
      this.map.removeSource('selected-shape')
    }
  }

  createShapeFeature(shape: PlacedShape) {
    if (shape.shape_type === 'road') {
      return {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: shape.road_nodes?.map(n => [n.longitude, n.latitude]) || []
        },
        properties: { id: shape.id }
      }
    } else {
      return {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [this.calculatePolygonCoordinates(shape)]
        },
        properties: { id: shape.id }
      }
    }
  }

  updateShapePosition(lat: number, lng: number) {
    if (!this.selectedShape) return

    this.selectedShape.latitude = lat
    this.selectedShape.longitude = lng

    this.highlightSelectedShape()
  }

  async saveShapePosition() {
    if (!this.selectedShape) return

    try {
      const response = await fetch(`/api/v1/redesigns/${this.redesignIdValue}/placed_shapes/${this.selectedShape.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.getCSRFToken()
        },
        body: JSON.stringify({
          latitude: this.selectedShape.latitude,
          longitude: this.selectedShape.longitude
        })
      })

      if (response.ok) {
        await this.loadShapes()
        const updatedShape = this.shapesData.find(s => s.id === this.selectedShape!.id)
        if (updatedShape) {
          this.selectedShape = updatedShape
          this.highlightSelectedShape()
        }
      } else {
        console.error("Error updating shape:", await response.text())
      }
    } catch (error) {
      console.error("Error updating shape:", error)
    }
  }

  addRotationHandles() {
    if (!this.map || !this.selectedShape) return
    this.removeRotationHandles()

    const corners = this.calculatePolygonCoordinates(this.selectedShape)

    corners.slice(0, 4).forEach((corner, index) => {
      const el = document.createElement('div')
      el.className = 'rotation-handle'
      el.style.width = '16px'
      el.style.height = '16px'
      el.style.backgroundColor = '#ff0000'
      el.style.border = '3px solid white'
      el.style.borderRadius = '50%'
      el.style.cursor = 'grab'
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)'

      const marker = new mapboxgl.Marker({ element: el, draggable: false })
        .setLngLat([corner[0], corner[1]])
        .addTo(this.map!)

      el.addEventListener('mousedown', (e) => {
        e.stopPropagation()
        this.startRotation(corner[0], corner[1])
      })

      this.rotationHandles.push(marker)
    })
  }

  removeRotationHandles() {
    this.rotationHandles.forEach(handle => handle.remove())
    this.rotationHandles = []
  }

  startRotation(cornerLng: number, cornerLat: number) {
    if (!this.selectedShape || !this.map) return

    this.isRotating = true
    this.map.dragPan.disable()
    this.map.getCanvas().style.cursor = 'grabbing'

    const centerLng = this.selectedShape.longitude
    const centerLat = this.selectedShape.latitude
    const initialRotation = this.selectedShape.rotation

    const getAngle = (lng: number, lat: number) => {
      const dx = lng - centerLng
      const dy = lat - centerLat
      return Math.atan2(dy, dx) * 180 / Math.PI
    }

    const initialAngle = getAngle(cornerLng, cornerLat)

    const onMove = (e: mapboxgl.MapMouseEvent) => {
      if (!this.isRotating || !this.selectedShape) return

      const currentAngle = getAngle(e.lngLat.lng, e.lngLat.lat)
      let newRotation = initialRotation + (currentAngle - initialAngle)

      newRotation = ((newRotation % 360) + 360) % 360

      this.selectedShape.rotation = newRotation
      this.highlightSelectedShape()
      this.removeRotationHandles()
      this.addRotationHandles()

      const event = new CustomEvent('shape:rotated', {
        detail: { rotation: Math.round(newRotation) },
        bubbles: true
      })
      window.dispatchEvent(event)
    }

    const onUp = () => {
      if (!this.isRotating) return
      this.isRotating = false
      this.map!.dragPan.enable()
      this.map!.getCanvas().style.cursor = ''
      this.map!.off('mousemove', onMove)
      this.map!.off('mouseup', onUp)

      if (this.selectedShape) {
        this.saveShapeRotation()
      }
    }

    this.map.on('mousemove', onMove)
    this.map.on('mouseup', onUp)
  }

  async saveShapeRotation() {
    if (!this.selectedShape) return

    try {
      const response = await fetch(`/api/v1/redesigns/${this.redesignIdValue}/placed_shapes/${this.selectedShape.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.getCSRFToken()
        },
        body: JSON.stringify({
          rotation: this.selectedShape.rotation
        })
      })

      if (response.ok) {
        await this.loadShapes()
        const updatedShape = this.shapesData.find(s => s.id === this.selectedShape!.id)
        if (updatedShape) {
          this.selectedShape = updatedShape
          this.highlightSelectedShape()
          this.addRotationHandles()
        }
      } else {
        console.error("Error saving rotation:", await response.text())
      }
    } catch (error) {
      console.error("Error saving rotation:", error)
    }
  }

  async rotateShape(degrees: number) {
    if (!this.selectedShape) return

    const newRotation = ((this.selectedShape.rotation + degrees) % 360 + 360) % 360
    this.selectedShape.rotation = newRotation
    this.highlightSelectedShape()
    this.removeRotationHandles()
    this.addRotationHandles()

    try {
      const response = await fetch(`/api/v1/redesigns/${this.redesignIdValue}/placed_shapes/${this.selectedShape.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.getCSRFToken()
        },
        body: JSON.stringify({
          rotation: newRotation
        })
      })

      if (response.ok) {
        await this.loadShapes()
        const updatedShape = this.shapesData.find(s => s.id === this.selectedShape!.id)
        if (updatedShape) {
          this.selectedShape = updatedShape
          this.highlightSelectedShape()
          this.addRotationHandles()
        }
      } else {
        console.error("Error rotating shape:", await response.text())
      }
    } catch (error) {
      console.error("Error rotating shape:", error)
    }
  }

  async updateHeight(height: number) {
    if (!this.selectedShape) return

    this.selectedShape.height = height

    try {
      const response = await fetch(`/api/v1/redesigns/${this.redesignIdValue}/placed_shapes/${this.selectedShape.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.getCSRFToken()
        },
        body: JSON.stringify({
          height: height
        })
      })

      if (response.ok) {
        await this.loadShapes()
        const updatedShape = this.shapesData.find(s => s.id === this.selectedShape!.id)
        if (updatedShape) {
          this.selectedShape = updatedShape
          this.highlightSelectedShape()
          this.addRotationHandles()
        }
      } else {
        console.error("Error updating height:", await response.text())
      }
    } catch (error) {
      console.error("Error updating height:", error)
    }
  }

  async deleteShape() {
    if (!this.selectedShape || !confirm('Are you sure you want to delete this shape?')) return

    try {
      const response = await fetch(`/api/v1/redesigns/${this.redesignIdValue}/placed_shapes/${this.selectedShape.id}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': this.getCSRFToken()
        }
      })

      if (response.ok) {
        this.clearSelection()
        await this.loadShapes()
      } else {
        console.error("Error deleting shape:", await response.text())
      }
    } catch (error) {
      console.error("Error deleting shape:", error)
    }
  }

  showShapeControls() {
    const event = new CustomEvent('shape:selected', {
      detail: { shape: this.selectedShape },
      bubbles: true
    })
    window.dispatchEvent(event)
  }

  hideShapeControls() {
    const event = new CustomEvent('shape:deselected', { bubbles: true })
    window.dispatchEvent(event)
  }

  dispatchShapeSelected(shape: PlacedShape) {
    this.showShapeControls()
  }

  toggle3DView() {
    if (!this.map) return

    this.is3DView = !this.is3DView

    if (this.is3DView) {
      this.map.easeTo({ pitch: 60, duration: 1000 })
      this.viewButtonTarget.textContent = '2D View'
    } else {
      this.map.easeTo({ pitch: 0, duration: 1000 })
      this.viewButtonTarget.textContent = '3D View'
    }
  }

  drawBoundaryCircle() {
    if (!this.map) return

    const center = [this.centerLngValue, this.centerLatValue]
    const radiusInKm = this.maxRadiusValue / 1000
    const points = 64
    const coords = []

    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * 360
      const lat = this.centerLatValue + (radiusInKm / 111.32) * Math.cos((angle * Math.PI) / 180)
      const lng = this.centerLngValue + (radiusInKm / (111.32 * Math.cos((this.centerLatValue * Math.PI) / 180))) * Math.sin((angle * Math.PI) / 180)
      coords.push([lng, lat])
    }

    this.map.addSource('boundary', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [coords]
        }
      }
    })

    this.map.addLayer({
      id: 'boundary-fill',
      type: 'fill',
      source: 'boundary',
      paint: {
        'fill-color': '#088',
        'fill-opacity': 0.1
      }
    })

    this.map.addLayer({
      id: 'boundary-line',
      type: 'line',
      source: 'boundary',
      paint: {
        'line-color': '#088',
        'line-width': 2,
        'line-dasharray': [2, 2]
      }
    })
  }

  async loadShapes() {
    if (!this.map) return

    try {
      const detailResponse = await fetch(`/api/v1/redesigns/${this.redesignIdValue}`)
      const detailData = await detailResponse.json()
      this.shapesData = detailData.placed_shapes || []

      const response = await fetch(`/api/v1/redesigns/${this.redesignIdValue}/geojson`)
      const geojson = await response.json()

      if (this.map.getSource('shapes')) {
        (this.map.getSource('shapes') as mapboxgl.GeoJSONSource).setData(geojson)
      } else {
        this.map.addSource('shapes', {
          type: 'geojson',
          data: geojson
        })

        this.map.addLayer({
          id: 'shapes-fill',
          type: 'fill-extrusion',
          source: 'shapes',
          filter: ['==', '$type', 'Polygon'],
          paint: {
            'fill-extrusion-color': ['get', 'color'],
            'fill-extrusion-height': ['coalesce', ['get', 'height'], 5],
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.8
          }
        })

        this.map.addLayer({
          id: 'shapes-line',
          type: 'line',
          source: 'shapes',
          filter: ['==', '$type', 'Polygon'],
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 2
          }
        })

        this.map.addLayer({
          id: 'roads',
          type: 'line',
          source: 'shapes',
          filter: ['==', '$type', 'LineString'],
          paint: {
            'line-color': ['get', 'color'],
            'line-width': ['get', 'width']
          }
        })
      }
    } catch (error) {
      console.error("Error loading shapes:", error)
    }
  }

  handleMapClick(e: mapboxgl.MapMouseEvent) {
    if (this.placementMode === 'shape' && this.selectedTemplate) {
      this.placeShape(e.lngLat.lat, e.lngLat.lng)
    } else if (this.placementMode === 'road') {
      this.addRoadNode(e.lngLat.lat, e.lngLat.lng)
    } else {
      const features = this.map!.queryRenderedFeatures(e.point, { layers: ['shapes-fill'] })
      if (features.length === 0) {
        this.clearSelection()
      }
    }
  }

  async placeShape(lat: number, lng: number) {
    if (!this.selectedTemplate) return

    try {
      const response = await fetch(`/api/v1/redesigns/${this.redesignIdValue}/placed_shapes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.getCSRFToken()
        },
        body: JSON.stringify({
          template_id: this.selectedTemplate.id,
          latitude: lat,
          longitude: lng,
          rotation: 0,
          shape_type: this.selectedTemplate.category === 'parks' ? 'park' : 'building'
        })
      })

      if (response.ok) {
        await this.loadShapes()
        this.clearPreview()
      } else {
        console.error("Error placing shape:", await response.text())
      }
    } catch (error) {
      console.error("Error placing shape:", error)
    }
  }

  toggleRoadMode() {
    if (this.placementMode === 'road') {
      this.completeRoad()
    } else {
      this.placementMode = 'road'
      this.roadNodes = []
      this.selectedTemplate = null
      this.clearSelection()
      this.roadButtonTarget.textContent = 'Complete Road'
      this.map!.getCanvas().style.cursor = 'crosshair'
    }
  }

  addRoadNode(lat: number, lng: number) {
    this.roadNodes.push({ lat, lng })

    const marker = new mapboxgl.Marker({ color: '#696969' })
      .setLngLat([lng, lat])
      .addTo(this.map!)

    this.roadPreviewNodes.push(marker)

    if (this.roadNodes.length >= 2) {
      this.roadButtonTarget.textContent = `Complete Road (${this.roadNodes.length} nodes)`
    }
  }

  async completeRoad() {
    if (this.roadNodes.length < 2) {
      alert("Road must have at least 2 nodes")
      return
    }

    try {
      const response = await fetch(`/api/v1/redesigns/${this.redesignIdValue}/placed_shapes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.getCSRFToken()
        },
        body: JSON.stringify({
          shape_type: 'road',
          latitude: this.roadNodes[0].lat,
          longitude: this.roadNodes[0].lng,
          width: 7,
          color: '#696969',
          road_nodes: this.roadNodes.map((node, index) => ({
            latitude: node.lat,
            longitude: node.lng,
            sequence_order: index
          }))
        })
      })

      if (response.ok) {
        await this.loadShapes()
        this.clearRoadMode()
      } else {
        console.error("Error creating road:", await response.text())
      }
    } catch (error) {
      console.error("Error creating road:", error)
    }
  }

  clearRoadMode() {
    this.placementMode = null
    this.roadNodes = []
    this.roadPreviewNodes.forEach(marker => marker.remove())
    this.roadPreviewNodes = []
    this.roadButtonTarget.textContent = 'Draw Road'
    this.map!.getCanvas().style.cursor = ''
  }

  updatePreview(lat: number, lng: number) {
    if (!this.previewMarker) {
      this.previewMarker = new mapboxgl.Marker({ color: this.selectedTemplate?.color || '#888' })
        .setLngLat([lng, lat])
        .addTo(this.map!)
    } else {
      this.previewMarker.setLngLat([lng, lat])
    }
  }

  clearPreview() {
    if (this.previewMarker) {
      this.previewMarker.remove()
      this.previewMarker = null
    }
    this.placementMode = null
    this.selectedTemplate = null
    this.map!.getCanvas().style.cursor = ''
  }

  calculatePolygonCoordinates(shape: PlacedShape): number[][] {
    const lat = shape.latitude
    const lng = shape.longitude
    const width = shape.width || 10
    const depth = shape.depth || 10
    const rotation_rad = (shape.rotation || 0) * Math.PI / 180.0

    const half_width = width / 2.0
    const half_depth = depth / 2.0

    const lat_per_meter = 1.0 / 111_320.0
    const lng_per_meter = 1.0 / (111_320.0 * Math.cos(lat * Math.PI / 180.0))

    const corners = [
      [-half_width, -half_depth],
      [half_width, -half_depth],
      [half_width, half_depth],
      [-half_width, half_depth],
      [-half_width, -half_depth]
    ]

    return corners.map(([x, y]) => {
      const rotated_x = x * Math.cos(rotation_rad) - y * Math.sin(rotation_rad)
      const rotated_y = x * Math.sin(rotation_rad) + y * Math.cos(rotation_rad)

      const new_lng = lng + (rotated_x * lng_per_meter)
      const new_lat = lat + (rotated_y * lat_per_meter)

      return [new_lng, new_lat]
    })
  }

  undo() {
    console.log("Undo not implemented yet")
  }

  getCSRFToken(): string {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
    return meta ? meta.content : ''
  }
}
