import { Injectable } from '@angular/core';

import { AlertController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})

export class DialogService {

  constructor(
    private alertController: AlertController
  ) {}

  async confirmLogout(): Promise<boolean> {

    const alert = await this.alertController.create({

      header: 'Logout',

      subHeader: 'Secure School Van',

      message:
        'Are you sure you want to logout from your account?',

      cssClass: 'universal-alert',

      backdropDismiss: false,

      buttons: [

        {
          text: 'Cancel',

          role: 'cancel'
        },

        {
          text: 'Logout',

          role: 'confirm'
        }

      ]
    });

    await alert.present();

    const result = await alert.onDidDismiss();

    return result.role === 'confirm';
  }
}