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

      // subHeader: 'Secure School Van',

      message,

      // cssClass: 'universal-alert',

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

  console.log('1 - confirmLogout entered');

  try {

    console.log('2 - before create');

    const alert = await this.alertController.create({
      header: 'Logout',
      message: 'Are you sure you want to logout?',
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

    console.log('3 - alert created', alert);

    await alert.present();

    console.log('4 - alert presented');

    const result = await alert.onDidDismiss();

    return result.role === 'confirm';

  } catch (error) {

    console.error('ALERT FAILED:', error);

    return false;
  }
}
}