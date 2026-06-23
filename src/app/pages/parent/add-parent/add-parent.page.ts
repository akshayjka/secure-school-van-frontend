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

    private router: Router

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

        alert(response.message);

        this.parentForm.reset();

        this.isLoading = false;

      },

      error: (error) => {

        console.error(error);

        this.isLoading = false;

        alert(

          error?.error?.message ||

          'Unable to add parent'

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