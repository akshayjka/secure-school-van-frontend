
import { Component, OnInit } from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule
} from '@angular/forms';

import { Router, RouterLink } from '@angular/router';

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
    IonicModule,
    RouterLink
  ]
})
export class LoginPage implements OnInit {

  // =========================================================
  // FORMS
  // =========================================================

  loginForm!: FormGroup;
  forgotPasswordForm!: FormGroup;

  // =========================================================
  // UI STATE
  // =========================================================

  isLoading = false;
  isUpdatingPassword = false;

  showForgotPassword = false;

  // =========================================================
  // CONSTRUCTOR
  // =========================================================

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) {}

  // =========================================================
  // INIT
  // =========================================================

  ngOnInit(): void {
    this.initializeForm();
    this.initializeForgotPasswordForm();

    /*
     * IMPORTANT
     *
     * Do not restore or pre-populate the login password.
     * Browser/password-manager autofill can sometimes put an old
     * password into the form and make debugging authentication
     * extremely confusing.
     */
    this.clearLoginPassword();
  }

  // =========================================================
  // LOGIN FORM
  // =========================================================

  private initializeForm(): void {

    this.loginForm = this.fb.group({
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
      ]
    });
  }

  // =========================================================
  // FORGOT PASSWORD FORM
  // =========================================================

  private initializeForgotPasswordForm(): void {

    this.forgotPasswordForm = this.fb.group({

      mobileNumber: [
        '',
        [
          Validators.required,
          Validators.pattern('^[6-9][0-9]{9}$')
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
          Validators.required,
          Validators.minLength(6)
        ]
      ]
    });
  }

  // =========================================================
  // PASSWORD CLEANUP
  // =========================================================

  private clearLoginPassword(): void {

    if (!this.loginForm) {
      return;
    }

    this.loginForm.patchValue(
      {
        password: ''
      },
      {
        emitEvent: false
      }
    );
  }

  // =========================================================
  // FORGOT PASSWORD
  // =========================================================

  openForgotPassword(): void {
    this.showForgotPassword = true;

    this.forgotPasswordForm.reset();

    this.isUpdatingPassword = false;
  }

  closeForgotPassword(): void {
    this.showForgotPassword = false;

    this.forgotPasswordForm.reset();

    this.isUpdatingPassword = false;
  }

  // =========================================================
  // UPDATE PASSWORD
  // =========================================================

  updatePassword(): void {

    if (this.isUpdatingPassword) {
      return;
    }

    if (this.forgotPasswordForm.invalid) {

      this.forgotPasswordForm.markAllAsTouched();

      return;
    }

    const mobileNumber = String(
      this.forgotPasswordForm.get('mobileNumber')?.value || ''
    ).trim();

    const newPassword = String(
      this.forgotPasswordForm.get('newPassword')?.value || ''
    );

    const confirmPassword = String(
      this.forgotPasswordForm.get('confirmPassword')?.value || ''
    );

    // ---------------------------------------------------------
    // Validate password match
    // ---------------------------------------------------------

    if (newPassword !== confirmPassword) {

      this.toastService.showToast(
        'Passwords do not match.',
        'warning'
      );

      return;
    }

    // ---------------------------------------------------------
    // Validate mobile
    // ---------------------------------------------------------

    if (!/^[6-9][0-9]{9}$/.test(mobileNumber)) {

      this.toastService.showToast(
        'Enter a valid 10-digit mobile number.',
        'warning'
      );

      return;
    }

    // ---------------------------------------------------------
    // Payload
    // ---------------------------------------------------------

    const payload = {
      mobileNumber,
      password: newPassword
    };

    console.log(
      'SET PASSWORD PAYLOAD:',
      {
        mobileNumber,
        passwordProvided: !!newPassword
      }
    );

    this.isUpdatingPassword = true;

    this.authService
      .setPassword(payload)
      .subscribe({

        next: (response: any) => {

          console.log(
            'SET PASSWORD RESPONSE:',
            response
          );

          this.isUpdatingPassword = false;

          this.toastService.showToast(
            response?.message ||
            'Password updated successfully. Please login.',
            'success'
          );

          this.closeForgotPassword();
        },

        error: (error: any) => {

          console.error(
            'SET PASSWORD ERROR:',
            error
          );

          this.isUpdatingPassword = false;

          this.toastService.showToast(
            error?.error?.message ||
            'Unable to update password.',
            'danger'
          );
        }
      });
  }

  // =========================================================
  // LOGIN
  // =========================================================

  login(): void {

    // Prevent duplicate requests.
    if (this.isLoading) {
      return;
    }

    // ---------------------------------------------------------
    // Validate form
    // ---------------------------------------------------------

    if (this.loginForm.invalid) {

      this.loginForm.markAllAsTouched();

      return;
    }

    // ---------------------------------------------------------
    // Read values explicitly
    // ---------------------------------------------------------

    const mobileNumber = String(
      this.loginForm.get('mobileNumber')?.value || ''
    )
      .replace(/\D/g, '')
      .trim();

    const password = String(
      this.loginForm.get('password')?.value || ''
    );

    // ---------------------------------------------------------
    // Validate mobile
    // ---------------------------------------------------------

    if (!/^[6-9][0-9]{9}$/.test(mobileNumber)) {

      this.toastService.showToast(
        'Enter a valid 10-digit mobile number.',
        'warning'
      );

      return;
    }

    // ---------------------------------------------------------
    // Validate password
    // ---------------------------------------------------------

    if (!password || password.length < 6) {

      this.toastService.showToast(
        'Please enter your password.',
        'warning'
      );

      return;
    }

    // ---------------------------------------------------------
    // IMPORTANT
    //
    // Do NOT trim the password.
    //
    // Passwords are allowed to contain spaces and the exact
    // password entered during registration must be sent.
    // ---------------------------------------------------------

    const payload = {
      mobileNumber,
      password
    };

    console.log(
      'LOGIN PAYLOAD:',
      {
        mobileNumber,
        passwordProvided: password.length > 0,
        passwordLength: password.length
      }
    );

    this.isLoading = true;

    // ---------------------------------------------------------
    // LOGIN API
    // ---------------------------------------------------------

    this.authService
      .login(payload)
      .subscribe({

        // =====================================================
        // SUCCESS
        // =====================================================

        next: (response: any) => {

          console.log(
            'LOGIN RESPONSE:',
            response
          );

          // ---------------------------------------------------
          // Token
          // ---------------------------------------------------

          const token =
            response?.token ||
            response?.data?.token ||
            response?.accessToken;

          if (!token) {

            console.error(
              'LOGIN SUCCESS BUT TOKEN IS MISSING:',
              response
            );

            this.clearLoginStorage();

            this.toastService.showToast(
              'Login response is invalid. Token is missing.',
              'danger'
            );

            this.isLoading = false;

            return;
          }

          // ---------------------------------------------------
          // Role
          // ---------------------------------------------------

          const role = String(
            response?.role ||
            response?.user?.role ||
            response?.data?.role ||
            ''
          )
            .trim()
            .toLowerCase();

          if (!role) {

            console.error(
              'LOGIN SUCCESS BUT ROLE IS MISSING:',
              response
            );

            this.clearLoginStorage();

            this.toastService.showToast(
              'User role was not returned by the server.',
              'danger'
            );

            this.isLoading = false;

            return;
          }

          // ---------------------------------------------------
          // User
          // ---------------------------------------------------

          const user =
            response?.user ||
            response?.data?.user ||
            response?.data ||
            {};

          // ---------------------------------------------------
          // Common storage
          // ---------------------------------------------------

          localStorage.setItem(
            'token',
            token
          );

          localStorage.setItem(
            'role',
            role
          );

          const userName = String(
            user?.name ||
            response?.name ||
            response?.data?.name ||
            ''
          );

          localStorage.setItem(
            'userName',
            userName
          );

          // ===================================================
          // DRIVER
          // ===================================================

          if (role === 'driver') {

            const driverId = String(
              user?.driverId ||
              response?.driverId ||
              response?.data?.driverId ||
              ''
            ).trim();

            if (!driverId) {

              console.error(
                'Driver ID missing:',
                response
              );

              this.clearLoginStorage();

              this.toastService.showToast(
                'Driver information was not returned by the server.',
                'danger'
              );

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

          // ===================================================
          // PARENT
          // ===================================================

          if (role === 'parent') {

            const parentId = String(
              user?.parentId ||
              response?.parentId ||
              response?.data?.parentId ||
              ''
            ).trim();

            if (!parentId) {

              console.error(
                'Parent ID missing:',
                response
              );

              this.clearLoginStorage();

              this.toastService.showToast(
                'Parent information was not returned by the server.',
                'danger'
              );

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

          // ===================================================
          // ADMIN
          // ===================================================

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

          // ===================================================
          // UNKNOWN ROLE
          // ===================================================

          console.error(
            'Unknown role returned from backend:',
            role,
            response
          );

          this.clearLoginStorage();

          this.toastService.showToast(
            'Invalid user role returned by the server.',
            'danger'
          );

          this.isLoading = false;
        },

        // =====================================================
        // ERROR
        // =====================================================

        error: (error: any) => {

          console.error(
            'LOGIN ERROR:',
            error
          );

          const serverMessage = String(
            error?.error?.message ||
            error?.error?.error ||
            ''
          ).trim();

          /*
           * Keep the backend's exact authentication error.
           *
           * For example:
           * "Invalid password"
           * "User not found"
           * "Password not set"
           */

          this.toastService.showToast(
            serverMessage ||
            'Login failed. Please check your mobile number and password.',
            'danger'
          );

          this.isLoading = false;
        },

        // =====================================================
        // COMPLETE
        // =====================================================

        complete: () => {

          this.isLoading = false;
        }
      });
  }

  // =========================================================
  // CLEAR LOGIN STORAGE
  // =========================================================

  private clearLoginStorage(): void {

    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userName');

    localStorage.removeItem('driverId');
    localStorage.removeItem('parentId');
  }
}
