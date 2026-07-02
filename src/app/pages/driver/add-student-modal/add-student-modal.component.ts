import { Component, Input } from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';

import {
  IonicModule,
  ModalController
} from '@ionic/angular';

import { addIcons } from 'ionicons';

import { closeOutline } from 'ionicons/icons';

import { CommonModule } from '@angular/common';

import { ParentService } from 'src/app/core/services/parent';
import { Router } from '@angular/router';
import { ToastService } from 'src/app/core/services/toast';

@Component({

  selector: 'app-add-student-modal',

  standalone: true,

  templateUrl: './add-student-modal.component.html',

  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule
  ]

})

export class AddStudentModalComponent {

  @Input()

  driverId = '';

  parentForm: FormGroup;

  isLoading = false;

  constructor(

    private fb: FormBuilder,

    private parentService: ParentService,
    private toastService: ToastService,
    private modalCtrl: ModalController,
    private router: Router,

  ) {
    this.driverId = localStorage.getItem('driverId') || '';
    addIcons({closeOutline});

    this.parentForm = this.fb.group({

      name: ['', Validators.required],
      mobileNumber: ['', Validators.required],
      studentName: ['', Validators.required],
      schoolName: ['', Validators.required],
      pickupArea: ['', Validators.required],
      dropArea: ['', Validators.required]
    });

  }

  saveParent() {
    console.log('Driver Id =>', this.driverId);
    const payload = {
      ...this.parentForm.value,
      driverId: this.driverId
    };
    console.log(payload);
    this.parentService.addParent(payload).subscribe({
      next: (res) => {
        console.log(res);
        this.modalCtrl.dismiss();
        this.toastService.showToast(res.message || 'Parent added successfully');
      },
      error: (err) => {
        console.log(err);
        this.toastService.showToast(err?.error?.message || 'Failed to add parent');
      }
    });
  }

  close() {
    this.modalCtrl.dismiss();
  }

  gotodashboard() {
    this.router.navigateByUrl('/driver/dashboard');
  }

}