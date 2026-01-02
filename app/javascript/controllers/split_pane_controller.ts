import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["pane", "divider"];
  static values = {
    direction: { type: String, default: "horizontal" },
    storageKey: String,
    minSize: { type: Number, default: 200 }
  };

  declare readonly paneTargets: HTMLElement[];
  declare readonly dividerTarget: HTMLElement;
  declare readonly directionValue: string;
  declare readonly storageKeyValue: string;
  declare readonly minSizeValue: number;

  private isDragging = false;
  private startPos = 0;
  private startSizes: number[] = [];

  connect() {
    this.restoreSizes();
    this.updatePaneSizes();
  }

  startDrag(event: MouseEvent) {
    event.preventDefault();
    this.isDragging = true;
    
    if (this.directionValue === "horizontal") {
      this.startPos = event.clientX;
    } else {
      this.startPos = event.clientY;
    }

    this.startSizes = this.paneTargets.map(pane => {
      if (this.directionValue === "horizontal") {
        return pane.offsetWidth;
      } else {
        return pane.offsetHeight;
      }
    });

    document.addEventListener("mousemove", this.handleDrag);
    document.addEventListener("mouseup", this.stopDrag);
    document.body.style.cursor = this.directionValue === "horizontal" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
  }

  handleDrag = (event: MouseEvent) => {
    if (!this.isDragging) return;

    const currentPos = this.directionValue === "horizontal" ? event.clientX : event.clientY;
    const delta = currentPos - this.startPos;

    const totalSize = this.directionValue === "horizontal"
      ? (this.element as HTMLElement).offsetWidth
      : (this.element as HTMLElement).offsetHeight;

    let newSize1 = this.startSizes[0] + delta;
    let newSize2 = this.startSizes[1] - delta;

    if (newSize1 < this.minSizeValue) {
      newSize1 = this.minSizeValue;
      newSize2 = totalSize - newSize1;
    }
    if (newSize2 < this.minSizeValue) {
      newSize2 = this.minSizeValue;
      newSize1 = totalSize - newSize2;
    }

    const percentage1 = (newSize1 / totalSize) * 100;
    const percentage2 = (newSize2 / totalSize) * 100;

    this.paneTargets[0].style.flex = `0 0 ${percentage1}%`;
    this.paneTargets[1].style.flex = `0 0 ${percentage2}%`;

    this.saveSizes(percentage1, percentage2);
  };

  stopDrag = () => {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    document.removeEventListener("mousemove", this.handleDrag);
    document.removeEventListener("mouseup", this.stopDrag);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  private updatePaneSizes() {
    const savedSizes = this.getSavedSizes();
    if (savedSizes) {
      this.paneTargets[0].style.flex = `0 0 ${savedSizes[0]}%`;
      this.paneTargets[1].style.flex = `0 0 ${savedSizes[1]}%`;
    }
  }

  private saveSizes(size1: number, size2: number) {
    if (!this.storageKeyValue) return;
    localStorage.setItem(this.storageKeyValue, JSON.stringify([size1, size2]));
  }

  private getSavedSizes(): number[] | null {
    if (!this.storageKeyValue) return null;
    const saved = localStorage.getItem(this.storageKeyValue);
    return saved ? JSON.parse(saved) : null;
  }

  private restoreSizes() {
    const savedSizes = this.getSavedSizes();
    if (savedSizes) {
      this.paneTargets[0].style.flex = `0 0 ${savedSizes[0]}%`;
      this.paneTargets[1].style.flex = `0 0 ${savedSizes[1]}%`;
    } else {
      this.paneTargets[0].style.flex = "1 1 50%";
      this.paneTargets[1].style.flex = "1 1 50%";
    }
  }
}
