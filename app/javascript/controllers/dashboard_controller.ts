import { Controller } from "@hotwired/stimulus";

export interface PaneConfig {
  id: string;
  type: 'map' | 'table' | 'form' | 'header';
  title?: string;
  defaultSize?: number;
}

export default class extends Controller {
  private panes: Map<string, PaneConfig> = new Map();

  connect() {
    console.log("Dashboard controller connected");
    this.initializePanes();
  }

  private initializePanes() {
    const paneElements = this.element.querySelectorAll('[data-pane-id]');
    paneElements.forEach((paneEl) => {
      const id = paneEl.getAttribute('data-pane-id') || '';
      const type = paneEl.getAttribute('data-pane-type') as PaneConfig['type'];
      const title = paneEl.getAttribute('data-pane-title') || undefined;
      
      if (id && type) {
        this.registerPane({ id, type, title });
      }
    });
    
    console.log('Registered panes:', Array.from(this.panes.values()));
  }

  registerPane(config: PaneConfig) {
    this.panes.set(config.id, config);
    this.dispatch('pane-registered', { detail: config });
  }

  getPane(id: string): PaneConfig | undefined {
    return this.panes.get(id);
  }

  getPanesByType(type: PaneConfig['type']): PaneConfig[] {
    return Array.from(this.panes.values()).filter(pane => pane.type === type);
  }
}
