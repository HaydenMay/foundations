import { Component, computed, input, output } from '@angular/core';
import { PROJECTS } from '../domain/progression';
import { Icon } from './icon';
@Component({
  selector: 'app-home-selection',
  imports: [Icon],
  template: ` <section aria-label="First home selection" (keydown.escape)="cancel.emit()">
    <header>
      <span class="eyebrow">EVERY STEP BUILDS SOMETHING</span>
      <h2>{{ first() ? 'Your first home is ready!' : 'Make yourself at home' }}</h2>
      <p>
        {{
          first()
            ? 'Choose where your story begins.'
            : 'Preview a new look. Your progress stays yours.'
        }}
      </p>
    </header>
    <div class="choices" role="group" aria-label="Starting house styles">
      @for (c of choices; track c.id) {
        <button
          [attr.aria-label]="'Preview ' + c.name"
          [attr.aria-pressed]="choice() === c.id"
          [class.selected]="choice() === c.id"
          [disabled]="busy()"
          (click)="preview.emit(c.id)"
        >
          <app-icon name="home" [style.color]="c.color" /><strong>{{ c.name }}</strong>
        </button>
      }
    </div>
    <p class="description">{{ selected().description }}</p>
    <footer>
      <button class="primary full" [disabled]="busy()" (click)="confirm.emit()">
        {{ first() ? 'Build my home' : 'Save house style' }}
      </button>
      <button class="later" [disabled]="busy()" (click)="cancel.emit()">
        {{ first() ? 'Choose later' : 'Keep my current home' }}
      </button>
      <span>Always free. Change your style whenever you like.</span>
    </footer>
  </section>`,
  styleUrl: './home-selection.css',
})
export class HomeSelection {
  readonly choices = PROJECTS[0].choices;
  readonly choice = input('sage');
  readonly first = input(true);
  readonly busy = input(false);
  readonly selected = computed(
    () => this.choices.find((c) => c.id === this.choice()) || this.choices[0],
  );
  readonly preview = output<string>();
  readonly confirm = output<void>();
  readonly cancel = output<void>();
}
