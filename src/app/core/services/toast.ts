import { Injectable } from '@angular/core';

import { ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})

export class ToastService {

  constructor(
    private toastController: ToastController
  ) {}

  async showToast(
    message: string,
    color:
      | 'success'
      | 'danger'
      | 'warning'
      | 'primary'
      | 'secondary' = 'primary'
  ) {

    const toast = await this.toastController.create({

      message,

      duration: 3000,

      position: 'top',

      color,

      icon:
        color === 'success'
          ? 'checkmark-circle'

          : color === 'danger'
          ? 'close-circle'

          : 'information-circle',

      buttons: [

        {

          icon: 'close',

          role: 'cancel'

        }

      ]

    });

    await toast.present();

  }

}