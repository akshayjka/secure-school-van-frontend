import { Component } from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule
} from '@angular/forms';

import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ToastService } from '../../../core/services/toast';
@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule
  ]
})

export class LoginPage {

  loginForm!: FormGroup;

  isLoading = false;

  showForgotPassword = false;

  forgotPasswordForm!: FormGroup;

  constructor(

    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService


  ) { }

  ngOnInit() {

    this.initializeForm();

    this.initializeForgotPasswordForm();

  }

  initializeForgotPasswordForm() {
    this.forgotPasswordForm = this.fb.group({
      mobileNumber: [
        '',
        [
          Validators.required,
          Validators.pattern('^[0-9]{10}$')
        ]
      ],
      newPassword: [
        '',
        [
          Validators.required,
          Validators.minLength(6)
        ]
      ],
      confirmPassword: [
        '',
        [
          Validators.required
        ]
      ]
    });

  }

  openForgotPassword() {
    this.showForgotPassword = true;
  }

  closeForgotPassword() {
    this.showForgotPassword = false;
  }

  initializeForm() {

    this.loginForm = this.fb.group({

      mobileNumber: [
        '',
        [
          Validators.required,
          Validators.pattern('^[0-9]{10}$')
        ]
      ],

      password: [
        '',
        [
          Validators.required,
          Validators.minLength(6)
        ]
      ]

    });

  }

  updatePassword() {

    if (this.forgotPasswordForm.invalid) {

      this.forgotPasswordForm.markAllAsTouched();

      return;

    }

    const {

      mobileNumber,

      newPassword,

      confirmPassword

    } = this.forgotPasswordForm.value;

    if (newPassword !== confirmPassword) {

      alert('Passwords do not match');

      return;

    }

    const payload = {

      mobileNumber,

      password: newPassword

    };

    this.authService.setPassword(

      payload

    ).subscribe({

      next: (response) => {

        // alert(response.message);


        this.closeForgotPassword();

        this.forgotPasswordForm.reset();

      },

      error: (error) => {

        this.toastService.showToast(error?.error?.message || 'Unable to update password', 'danger');

      }

    });

  }

  login() {

    this.isLoading = true;

    this.authService.login(

      this.loginForm.value

    )

      .subscribe({

        next: (response) => {

          localStorage.setItem('token', response.token);

          localStorage.setItem('role', response.role);

         localStorage.setItem(
  'userName',
  response.user?.name || response.name || ''
);

          if (response.role === 'driver') {
            localStorage.setItem(
              'driverId',
              response.user.driverId
            );
            this.router.navigate(['/driver/dashboard']);
          }
          else if (response.role === 'admin') {
            console.log("The resposne is working : ",response.role)
            this.router.navigate(['/admin/dashboard']);
          }
          else {
             localStorage.setItem('parentId', response.user.parentId);
            this.router.navigate(['/parent/dashboard']);
          }


        },
        error: (error) => {
          console.log(error);
          this.toastService.showToast(error.error?.message || 'Login failed', 'danger');
          this.isLoading = false;
        },

        complete: () => {

          this.isLoading = false;

        }

      });

  }
}