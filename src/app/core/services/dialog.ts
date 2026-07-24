import { Injectable } from '@angular/core';
import { AlertController } from '@ionic/angular/standalone';

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

    return new Promise(async (resolve) => {

      const alert = await this.alertController.create({
        header,
        message,
        backdropDismiss: false,
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            handler: () => {
              resolve(false);
            }
          },
          {
            text: 'Confirm',
            role: 'confirm',
            handler: () => {
              resolve(true);
            }
          }
        ]
      });

      await alert.present();
    });
  }

  async confirmLogout(): Promise<boolean> {

    return new Promise(async (resolve) => {

      const alert = await this.alertController.create({
        header: 'Logout',
        message: 'Are you sure you want to logout?',
        backdropDismiss: false,
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            handler: () => {
              resolve(false);
            }
          },
          {
            text: 'Logout',
            role: 'confirm',
            handler: () => {
              resolve(true);
            }
          }
        ]
      });

      await alert.present();
    });
  }
}