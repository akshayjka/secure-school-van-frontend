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

  if (this.loginForm.invalid || this.isLoading) {
    this.loginForm.markAllAsTouched();
    return;
  }

  this.isLoading = true;

  const payload = this.loginForm.getRawValue();

  console.log('LOGIN PAYLOAD:', payload);

  this.authService.login(payload).subscribe({

    next: (response: any) => {

      console.log('LOGIN RESPONSE:', response);

      // -----------------------------
      // 1. Validate token
      // -----------------------------

      if (!response?.token) {
        console.error('Token missing in login response');

        this.toastService.showToast(
          'Invalid login response. Token missing.',
          'danger'
        );

        this.isLoading = false;
        return;
      }

      // -----------------------------
      // 2. Get role safely
      // -----------------------------

      const role = response?.role || response?.user?.role;

      if (!role) {
        console.error('Role missing:', response);

        this.toastService.showToast(
          'User role not found.',
          'danger'
        );

        this.isLoading = false;
        return;
      }

      // -----------------------------
      // 3. Store common login data
      // -----------------------------

      localStorage.setItem(
        'token',
        response.token
      );

      localStorage.setItem(
        'role',
        role
      );

      const userName =
        response?.user?.name ||
        response?.name ||
        '';

      localStorage.setItem(
        'userName',
        userName
      );

      // -----------------------------
      // 4. DRIVER LOGIN
      // -----------------------------

      if (role === 'driver') {

        const driverId =
          response?.user?.driverId ||
          response?.driverId;

        if (!driverId) {

          console.error(
            'Driver ID missing:',
            response
          );

          this.toastService.showToast(
            'Driver information not found.',
            'danger'
          );

          this.clearLoginStorage();

          this.isLoading = false;

          return;
        }

        localStorage.setItem(
          'driverId',
          driverId
        );

        console.log(
          'Driver logged in:',
          driverId
        );

        this.router.navigateByUrl(
          '/driver/dashboard',
          {
            replaceUrl: true
          }
        );

        return;
      }

      // -----------------------------
      // 5. ADMIN LOGIN
      // -----------------------------

      if (role === 'admin') {

        console.log(
          'Admin logged in'
        );

        this.router.navigateByUrl(
          '/admin/dashboard',
          {
            replaceUrl: true
          }
        );

        return;
      }

      // -----------------------------
      // 6. PARENT LOGIN
      // -----------------------------

      if (role === 'parent') {

        const parentId =
          response?.user?.parentId ||
          response?.parentId;

        if (!parentId) {

          console.error(
            'Parent ID missing:',
            response
          );

          this.toastService.showToast(
            'Parent information not found.',
            'danger'
          );

          this.clearLoginStorage();

          this.isLoading = false;

          return;
        }

        localStorage.setItem(
          'parentId',
          parentId
        );

        console.log(
          'Parent logged in:',
          parentId
        );

        this.router.navigateByUrl(
          '/parent/dashboard',
          {
            replaceUrl: true
          }
        );

        return;
      }

      // -----------------------------
      // 7. Unknown role
      // -----------------------------

      console.error(
        'Unknown role:',
        role
      );

      this.toastService.showToast(
        'Invalid user role.',
        'danger'
      );

      this.clearLoginStorage();

      this.isLoading = false;

    },

    error: (error) => {

      console.error(
        'LOGIN ERROR:',
        error
      );

      this.toastService.showToast(
        error?.error?.message ||
        'Login failed. Please try again.',
        'danger'
      );

      this.isLoading = false;

    },

    complete: () => {

      this.isLoading = false;

    }

  });

}

private clearLoginStorage() {

  localStorage.removeItem('token');

  localStorage.removeItem('role');

  localStorage.removeItem('userName');

  localStorage.removeItem('driverId');

  localStorage.removeItem('parentId');

}
}