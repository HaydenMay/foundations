import { afterEach, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { DeveloperPanel } from './developer-panel';

afterEach(() => {
  TestBed.resetTestingModule();
  localStorage.clear();
});

it('emits selected assembly speed and the optional reduced-motion override', () => {
  TestBed.configureTestingModule({ imports: [DeveloperPanel] });
  const fixture = TestBed.createComponent(DeveloperPanel),
    emitted = vi.fn();
  fixture.componentInstance.construct.subscribe(emitted);
  fixture.detectChanges();

  const speed = fixture.nativeElement.querySelector('#assembly-speed') as HTMLSelectElement;
  speed.value = '2';
  speed.dispatchEvent(new Event('change', { bubbles: true }));
  const reduced = fixture.nativeElement.querySelector('#force-reduced-motion') as HTMLInputElement;
  reduced.checked = true;
  reduced.dispatchEvent(new Event('change', { bubbles: true }));
  fixture.detectChanges();
  const action = [...fixture.nativeElement.querySelectorAll('button')].find((button) =>
    button.textContent?.includes('Preview construction'),
  ) as HTMLButtonElement;
  action.click();

  expect(emitted).toHaveBeenCalledWith({ speed: 2, reducedMotion: true });
});

it('leaves operating-system reduced-motion preference in control unless forced', () => {
  TestBed.configureTestingModule({ imports: [DeveloperPanel] });
  const fixture = TestBed.createComponent(DeveloperPanel),
    emitted = vi.fn();
  fixture.componentInstance.construct.subscribe(emitted);
  fixture.detectChanges();
  const action = [...fixture.nativeElement.querySelectorAll('button')].find((button) =>
    button.textContent?.includes('Preview construction'),
  ) as HTMLButtonElement;
  action.click();
  expect(emitted).toHaveBeenCalledWith({ speed: 1 });
});
