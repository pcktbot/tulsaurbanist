import { createIcons, icons } from 'lucide';

export function initializeIcons(container: HTMLElement | Document = document): void {
  createIcons({
    icons,
    nameAttr: 'data-lucide',
    attrs: {
      'stroke-width': '2',
    },
  });
}

export function createIcon(name: string, attributes: Record<string, string> = {}): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('data-lucide', name);

  Object.entries(attributes).forEach(([key, value]) => {
    svg.setAttribute(key, value);
  });

  createIcons({
    icons,
    nameAttr: 'data-lucide',
  });

  return svg;
}

export { icons };
