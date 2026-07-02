import { Component, Input } from '@angular/core';

import { IonicModule, ModalController } from '@ionic/angular';

import { CommonModule } from '@angular/common';

import { addIcons } from 'ionicons';

import { closeOutline } from 'ionicons/icons';

@Component({

  selector: 'app-student-details-modal',

  templateUrl: './student-details-modal.component.html',

  styleUrls: ['./student-details-modal.component.scss'],

  standalone: true,

  imports: [
    CommonModule,
    IonicModule
  ]

})

export class StudentDetailsModalComponent {

  @Input()

  student: any;

  constructor(

    private modalCtrl: ModalController

  ) { 
    addIcons({closeOutline});
  }

  close() {
    this.modalCtrl.dismiss();
  }

}