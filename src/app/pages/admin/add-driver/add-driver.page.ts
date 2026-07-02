import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import {
  IonicModule,
  ToastController
} from '@ionic/angular';
import { Router } from '@angular/router';
import { Driver } from 'src/app/core/services/driver';
import { DialogService } from 'src/app/core/services/dialog';
import { addIcons } from 'ionicons';
import { logOutOutline } from 'ionicons/icons';

@Component({
  selector: 'app-add-driver',
  templateUrl: './add-driver.page.html',
  styleUrls: ['./add-driver.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule
  ]
})
export class AddDriverPage {

  driverForm: FormGroup;

  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private driverService: Driver,
    private toastController: ToastController,
    private router: Router,
    private dialogService: DialogService
  ) {
 addIcons({ logOutOutline});
    this.driverForm = this.fb.group({

      name: [
        '',
        Validators.required
      ],

      mobileNumber: [
        '',
        [
          Validators.required,
          Validators.minLength(10)
        ]
      ],

      vehicleNumber: [
        '',
        Validators.required
      ],

      routeArea: [
        '',
        Validators.required
      ]

    });

  }

  addDriver() {

    if (this.driverForm.invalid) {
      return;
    }

    this.isLoading = true;

    this.driverService
      .addDriver(this.driverForm.value)
      .subscribe({

        next: async (res: any) => {

          this.isLoading = false;

          const toast =
            await this.toastController.create({

              message:
                'Driver Added Successfully',

              duration: 2000,

              color: 'success'

            });

          await toast.present();

          this.router.navigate([
            '/admin/drivers'
          ]);

        },

        error: async (err) => {

          this.isLoading = false;

          const toast =
            await this.toastController.create({

              message:
                err?.error?.message ||
                'Failed to add driver',

              duration: 2500,

              color: 'danger'

            });

          await toast.present();

        }

      });

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