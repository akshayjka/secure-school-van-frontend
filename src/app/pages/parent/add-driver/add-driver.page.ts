import { Component } from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';

import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonInput,
  IonItem,
  IonButton
} from '@ionic/angular/standalone';
import { Driver } from 'src/app/core/services/driver';
import { Router } from '@angular/router';
import { ToastService } from 'src/app/core/services/toast';

@Component({
  selector: 'app-add-driver',

  templateUrl: './add-driver.page.html',

  styleUrls: ['./add-driver.page.scss'],

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,

    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonInput,
    IonItem,
    IonButton
  ]
})
export class AddDriverPage {

  driverForm!: FormGroup;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private driverService: Driver,
    private router : Router,
    private toastService: ToastService
  ) {

  this.driverForm = this.fb.group({

  name: [

    '',

    Validators.required

  ],

  mobileNumber: [

    '',

    [

      Validators.required,

      Validators.pattern(

        '^[0-9]{10}$'

      )

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

saveDriver() {

  if (this.driverForm.invalid) {

    this.driverForm.markAllAsTouched();

    return;

  }

  this.isLoading = true;

  this.driverService.addDriver(
    this.driverForm.value
  ).subscribe({

    next: (response) => {

      this.toastService.showToast(

        response.message ||

        'Driver added successfully'

      );

      this.driverForm.reset();

      this.isLoading = false;

    },

    error: (error) => {

      this.isLoading = false;

      this.toastService.showToast(

        error?.error?.message ||

        'Failed to add driver'

      );

    }

  });

}

goto() {

  this.router.navigateByUrl(

    '/driver/dashboard'

  );

}

}