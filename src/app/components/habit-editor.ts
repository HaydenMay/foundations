import { Component, input, output, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Difficulty, Frequency, Habit, HabitInput } from '../domain/models';
import { validateInput } from '../domain/habits';
@Component({
  selector: 'app-habit-editor',
  imports: [FormsModule],
  template: ` <p class="muted">A small promise to yourself. Choose what feels right for you.</p>
    <form (ngSubmit)="submit()">
      <label for="habit-name">Habit name</label
      ><input
        id="habit-name"
        name="name"
        [(ngModel)]="name"
        maxlength="80"
        required
        placeholder="e.g. Take a little walk"
        autofocus
      />
      <label for="difficulty">Difficulty</label
      ><select id="difficulty" name="difficulty" [(ngModel)]="difficulty">
        <option value="easy">Easy · 1 star</option>
        <option value="moderate">Moderate · 2 stars</option>
        <option value="hard">Hard · 3 stars</option>
      </select>
      <label for="frequency">Frequency</label
      ><select id="frequency" name="frequency" [(ngModel)]="frequency">
        <option value="daily">Every day</option>
        <option value="weekdays">Selected weekdays</option>
        <option value="weekly">Once a week</option>
        <option value="once">One time</option>
      </select>
      @if (frequency === 'weekdays') {
        <div class="weekdays" role="group" aria-label="Selected weekdays">
          @for (day of days; track $index) {
            <button
              type="button"
              [attr.aria-label]="day"
              [attr.aria-pressed]="selected.includes($index)"
              (click)="toggle($index)"
            >
              {{ day.slice(0, 2) }}
            </button>
          }
        </div>
      }
      @if (frequency === 'weekly') {
        <p class="hint">Complete on any day, once per Monday–Sunday week.</p>
      }
      <label class="check-label"
        ><input type="checkbox" name="active" [(ngModel)]="active" /> Active habit</label
      >
      @if (!habit()) {
        <p class="hint note">New habits begin earning stars tomorrow. There’s no rush.</p>
      }
      @if (error) {
        <p class="error" role="alert">{{ error }}</p>
      }
      <button class="primary full" type="submit">Save habit</button>
    </form>`,
})
export class HabitEditor implements OnInit {
  readonly habit = input<Habit>();
  readonly saved = output<HabitInput>();
  name = '';
  difficulty: Difficulty = 'easy';
  frequency: Frequency = 'daily';
  active = true;
  selected: number[] = [];
  error = '';
  days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  ngOnInit() {
    const h = this.habit();
    if (h) {
      this.name = h.name;
      this.difficulty = h.difficulty;
      this.frequency = h.schedule.kind;
      this.active = h.active;
      this.selected = [...h.schedule.days];
    }
  }
  toggle(day: number) {
    this.selected = this.selected.includes(day)
      ? this.selected.filter((d) => d !== day)
      : [...this.selected, day];
  }
  submit() {
    try {
      this.saved.emit(
        validateInput({
          name: this.name,
          difficulty: this.difficulty,
          schedule: {
            kind: this.frequency,
            days: this.frequency === 'weekdays' ? this.selected : [],
          },
          active: this.active,
        }),
      );
    } catch (e) {
      this.error = (e as Error).message;
    }
  }
}
