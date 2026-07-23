import { Injectable } from '@angular/core';

import { AlertController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})

export class DialogService {

  constructor(
    private alertController: AlertController
  ) {}

  async confirm(
  header: string,
  message: string
): Promise<boolean> {

  const alert =
    await this.alertController.create({

      header,

      subHeader: 'Secure School Van',

      message,

      cssClass: 'universal-alert',

      backdropDismiss: false,

      buttons: [

        {
          text: 'Cancel',
          role: 'cancel'
        },

        {
          text: 'Confirm',
          role: 'confirm'
        }

      ]

    });

  await alert.present();

  const result =
    await alert.onDidDismiss();

  return result.role === 'confirm';

}

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