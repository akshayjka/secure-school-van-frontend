import { Component } from '@angular/core';

import {
  IonList,
  IonItem,
  PopoverController
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-driver-menu-popover',
  templateUrl: './driver-menu-popover.component.html',
  standalone: true,
  imports: [
    IonList,
    IonItem
  ]
})
export class DriverMenuPopoverComponent {

  constructor(
    private popoverCtrl: PopoverController
  ) {}

  select(view: string) {

    this.popoverCtrl.dismiss({
      view: view
    });

  }

}