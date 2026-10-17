import { Component, input } from '@angular/core';
const PATHS: Record<string, string> = {
  leaf: 'M20 4C11 3 4 6 4 12a6 6 0 0 0 6 6c6 0 9-7 10-14ZM4 21 15 10',
  star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z',
  home: 'm3 10 9-7 9 7M5 9v11h5v-7h4v7h5V9',
  plus: 'M12 5v14M5 12h14',
  check: 'm5 12 4 4L19 6',
  chevron: 'm6 9 6 6 6-6',
  close: 'm6 6 12 12M6 18 18 6',
  settings:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3Z',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1',
  moon: 'M20 14A8 8 0 0 1 10 4 8 8 0 1 0 20 14Z',
  rotate: 'M20 10a8 8 0 1 0-1 8M20 4v6h-6',
  minus: 'M5 12h14',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  road: 'M8 3 4 21M16 3l4 18M12 3v3m0 4v4m0 4v3',
  tree: 'm12 2 7 9h-3l5 7H3l5-7H5l7-9Zm0 16v4',
  paint: 'm4 16 9-9 4 4-9 9H4v-4Zm8-8 3-4a3 3 0 0 1 5 4l-4 3',
  history: 'M3 12a9 9 0 1 0 2-6M3 3v5h5m4-1v6l4 2',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  lock: 'M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5V10Z',
  edit: 'm14 4 6 6M4 16 16 4a3 3 0 0 1 4 4L8 20H4v-4Z',
};
@Component({
  selector: 'app-icon',
  template:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path [attr.d]="path()" /></svg>',
  styles:
    ':host{display:inline-flex;width:22px;height:22px;flex-shrink:0}svg{width:100%;height:100%}',
})
export class Icon {
  readonly name = input('leaf');
  path() {
    return PATHS[this.name()] || PATHS['leaf'];
  }
}
