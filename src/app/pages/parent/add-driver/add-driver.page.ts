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

  constructor(
    private fb: FormBuilder,
    private driverService: Driver,
    private router : Router
  ) {

    this.driverForm = this.fb.group({

      driverName: ['', Validators.required],

      mobileNumber: [
        '',
        [
          Validators.required,
          Validators.pattern('^[0-9]{10}$')
        ]
      ]

    });

  }

saveDriver() {

  if (this.driverForm.invalid) {

    this.driverForm.markAllAsTouched();

    return;

  }

  const payload = {

    driverName: this.driverForm.value.driverName,

    mobileNumber: this.driverForm.value.mobileNumber

  };

  this.driverService

    .addDriver(payload)

    .subscribe({

      next: (response) => {

        console.log(

          'Driver added successfully',

          response

        );

        alert('Driver added successfully');

        this.driverForm.reset();

      },

      error: (error) => {

        console.log(error);

      }

    });

}

goto() {
  this.router.navigateByUrl('driver/dashboard')
}

}