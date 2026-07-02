import { Component, OnInit } from '@angular/core';

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

import { ActivatedRoute, Router } from '@angular/router';

import { Driver } from 'src/app/core/services/driver';
import { ToastService } from 'src/app/core/services/toast';

@Component({
  selector: 'app-edit-driver',
  templateUrl: './edit-driver.page.html',
  styleUrls: ['./edit-driver.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule
  ]
})
export class EditDriverPage implements OnInit {

  driverForm!: FormGroup;

  driverId = '';

  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private driverService: Driver,
    private toastController: ToastController,
    private toastService: ToastService
  ) { }

  ngOnInit() {

    this.driverId =
      this.route.snapshot.paramMap.get('id') || '';

    this.driverForm = this.fb.group({
      name: [
        '',
        Validators.required
      ],
      mobileNumber: [
        '',
        Validators.required
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
    this.loadDriver();
  }

  loadDriver() {

    console.log('Driver ID:', this.driverId);

    this.driverService.getDriver(this.driverId).subscribe({
      next: (res: any) => {
        console.log('Driver Response:', res);
        const driver = res.data || res;
        this.driverForm.patchValue({
          name: driver.name,
          mobileNumber: driver.mobileNumber,
          vehicleNumber: driver.vehicleNumber,
          routeArea: driver.routeArea
        });

      },
      error: (err) => {
        console.log('Driver Error:', err);

      }
    });

  }

  updateDriver() {
    console.log('Updating:', this.driverForm.value);
    this.driverService
      .updateDriver(this.driverId, this.driverForm.value).subscribe({
        next: (res) => {
          console.log('Update Success:', res);
          this.toastService.showToast('Driver Deatils Updated Successfully!!', 'success');
          this.router.navigateByUrl('admin/drivers')
        },
        error: (err) => {
          console.log('Update Error:', err);
          this.toastService.showToast('Update failed', 'danger');
        }
      });

  }
}