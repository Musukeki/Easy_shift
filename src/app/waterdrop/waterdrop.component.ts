import { Component, Input, HostBinding } from '@angular/core';

@Component({
  selector: 'app-water-drop',
  standalone: true,
  templateUrl: './waterdrop.component.html',
  styleUrls: ['./waterdrop.component.scss'],
})
export class WaterdropComponent {
  @Input() level = 60;

  // 把 Input 直接綁成 host 上的 CSS 變數 --level
  @HostBinding('style.--level')
  get levelVar() {
    return `${this.level}`;
  }
}
