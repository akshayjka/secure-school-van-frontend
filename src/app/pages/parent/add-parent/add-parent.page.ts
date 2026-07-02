import { Component, OnInit } from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { Router } from '@angular/router';

import { ParentService } from '../../../core/services/parent';
import { ToastService } from 'src/app/core/services/toast';

@Component({

  selector: 'app-add-parent',

  templateUrl: './add-parent.page.html',

  styleUrls: ['./add-parent.page.scss'],

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule
  ]

})

export class AddParentPage implements OnInit {

  parentForm!: FormGroup;

  isLoading = false;

  constructor(

    private fb: FormBuilder,

    private parentService: ParentService,

    private router: Router,
     private toastService: ToastService

  ) {

    this.initializeForm();

  }

  ngOnInit() {}

  initializeForm() {

    this.parentForm = this.fb.group({

      name: ['', Validators.required],

      mobileNumber: [

        '',

        [
          Validators.required,

          Validators.pattern('^[0-9]{10}$')
        ]

      ],

      studentName: ['', Validators.required],

      schoolName: ['', Validators.required],

      pickupArea: ['', Validators.required],

      dropArea: ['', Validators.required]

    });

  }

saveParent() {

  if (this.parentForm.invalid) {

    this.parentForm.markAllAsTouched();

    return;

  }

  this.isLoading = true;

  this.parentService.addParent(
    this.parentForm.value
  ).subscribe({

    next: (response) => {

      console.log('Response', response);

      this.toastService.showToast(
        response.message || 'Parent added successfully'
      );

      this.parentForm.reset();

      this.isLoading = false;

    },

    error: (error) => {

      console.error(error);

      this.isLoading = false;

      this.toastService.showToast(

        error?.error?.message ||

        'Failed to add parent'

      );

    }

  });

}

  gotodashboard() {

    this.router.navigateByUrl(

      '/driver/dashboard'

    );

  }

}