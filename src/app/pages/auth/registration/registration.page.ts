import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
// import { IonContent, IonHeader, IonSegment, IonSegmentButton, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonSegment,
  IonSegmentButton
} from '@ionic/angular/standalone';
import { Driver } from 'src/app/core/services/driver';
import { ToastService } from 'src/app/core/services/toast';
// import { IonSegmentButton } from '@ionic/angular

@Component({
  selector: 'app-registration',
  templateUrl: './registration.page.html',
  styleUrls: ['./registration.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,

    IonItem,
    IonLabel,
    IonInput,

    IonButton,

    IonSegment,
    IonSegmentButton
  ]
  // imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule, IonSegment, IonSegmentButton]
})
export class RegistrationPage implements OnInit {

  registrationForm!: FormGroup;

  submitted = false;

  selectedRole = 'driver';

  constructor(
    private fb: FormBuilder,
    private driverService: Driver,
    private router: Router,
    private toastService: ToastService
  ) {

    this.buildDriverForm();

  }

buildDriverForm() {

  this.registrationForm = this.fb.group({

    name: [
      '',
      [
        Validators.required,
        Validators.minLength(3)
      ]
    ],

    mobileNumber: [
      '',
      [
        Validators.required,
        Validators.pattern('^[6-9][0-9]{9}$')
      ]
    ],

    password: [
      '',
      [
        Validators.required,
        Validators.minLength(6)
      ]
    ],

    vehicleNumber: [
      '',
      [
        Validators.required
      ]
    ],

    routeArea: [
      '',
      [
        Validators.required
      ]
    ],
      referredByCode: [
      ''
    ]

  });

}

 buildParentForm() {

  this.registrationForm = this.fb.group({

    name: [
      '',
      [
        Validators.required,
        Validators.minLength(3)
      ]
    ],

    mobileNumber: [
      '',
      [
        Validators.required,
        Validators.pattern('^[6-9][0-9]{9}$')
      ]
    ],

    password: [
      '',
      [
        Validators.required,
        Validators.minLength(6)
      ]
    ],

    studentName: [
      '',
      [
        Validators.required
      ]
    ],

    schoolName: [
      '',
      [
        Validators.required
      ]
    ],

    pickupArea: [
      '',
      [
        Validators.required
      ]
    ],

    dropArea: [
      '',
      [
        Validators.required
      ]
    ]

  });

}

  changeRole() {

    this.submitted = false;

    if (this.selectedRole === 'driver') {

      this.buildDriverForm();

    } else {

      this.buildParentForm();

    }

  }

  register() {

  this.submitted = true;

  if (this.registrationForm.invalid) {

    return;

  }

  const payload = {

    role: this.selectedRole,

    ...this.registrationForm.value

  };

  console.log(payload);

  if (this.selectedRole === 'driver') {

    this.driverService
      .register(payload)

      .subscribe({

        next: (response) => {

          console.log(response);
          this.toastService.showToast(

'Driver added successfully',

'success'

);

          this.router.navigateByUrl('/auth/login');

        },

        error: (error) => {

          console.log(error);

        }

      });

  }

  else {

    // parentService.register(payload)
     this.driverService
      .register(payload)

      .subscribe({

        next: (response) => {

          console.log(response);

          this.toastService.showToast(

'Parent added successfully',

'success'

);

          this.router.navigateByUrl('/auth/login');

        },

        error: (error) => {

          console.log(error);

        }

      });

    console.log('Parent Registration');

    // this.router.navigateByUrl('/auth/login');

  }

}


  ngOnInit() {
  }

}
