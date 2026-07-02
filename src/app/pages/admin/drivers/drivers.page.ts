import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Driver } from '../../../core/services/driver';
import { addIcons } from 'ionicons';
import {
  createOutline,
  trashOutline,
  add,
  logOutOutline
} from 'ionicons/icons';
import { DialogService } from 'src/app/core/services/dialog';

@Component({
  selector: 'app-drivers',
  templateUrl: './drivers.page.html',
  styleUrls: ['./drivers.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule
  ]
})
export class DriverPage implements OnInit {

  drivers: any[] = [];

  isLoading = false;

  constructor(
    private driverService: Driver,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
    private dialogService: DialogService
  ) { 
     addIcons({
    createOutline,
    trashOutline,
    add,
    logOutOutline
  });

  }

  ngOnInit() {
    this.getDrivers();
  }

  ionViewWillEnter() {
    this.getDrivers();
  }

  getDrivers() {

    this.isLoading = true;

    this.driverService.getDrivers().subscribe({

      next: (res: any) => {

        this.drivers = res.data || [];

        this.isLoading = false;

      },

      error: () => {

        this.isLoading = false;

      }

    });

  }

  addDriver() {

    this.router.navigate(['/admin/add-driver']);

  }

  editDriver(driver: any) {

    this.router.navigate(
      ['/admin/edit-driver', driver._id]
    );

  }

  async deleteDriver(driver: any) {

    const alert = await this.alertController.create({

      header: 'Delete Driver',

      message: `Delete ${driver.name}?`,

      buttons: [

        {
          text: 'Cancel',
          role: 'cancel'
        },

        {
          text: 'Delete',

          role: 'destructive',

          handler: () => {

            this.driverService.deleteDriver(driver._id)

              .subscribe({

                next: async () => {

                  const toast = await this.toastController.create({

                    message: 'Driver Deleted',

                    duration: 2000,

                    color: 'success'

                  });

                  toast.present();

                  this.getDrivers();

                }

              });

          }

        }

      ]

    });

    await alert.present();

  }

  async logout() {

    const confirmed = await this.dialogService.confirmLogout();

    if (!confirmed) return;

    localStorage.removeItem('token');

    localStorage.removeItem('role');

    localStorage.removeItem('name');
     localStorage.removeItem('userId');
      localStorage.removeItem('userName');
    this.router.navigate(['/auth/login']);
  }

}