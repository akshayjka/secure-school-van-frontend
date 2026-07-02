import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import { IonicModule, ModalController} from '@ionic/angular';
import { ParentService } from '../../../core/services/parent';
import { CommonModule } from '@angular/common';
import { ToastService } from 'src/app/core/services/toast';

@Component({
  selector: 'app-add-parent',
  templateUrl: './add-parent.component.html',
   styleUrls: ['./add-parent.component.scss'],
  standalone: true,
   imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule
  ]
})
export class AddParentComponent {

  form = this.fb.group({

    driverId: ['', Validators.required],

    name: ['', Validators.required],

    mobileNumber: ['', Validators.required],

    studentName: ['', Validators.required],

    schoolName: ['', Validators.required],

    pickupArea: ['', Validators.required],

    dropArea: ['', Validators.required]

  });

  constructor(
    private fb: FormBuilder,
    private modalCtrl: ModalController,
    private parentService: ParentService,
    private toastService : ToastService
  ) {}

  save() {

    if (this.form.invalid) return;

    this.parentService.addParent(this.form.value).subscribe({
        next: () => {
          this.modalCtrl.dismiss(true,'confirm');
         this.toastService.showToast('Driver Deatils Updated Successfully!!', 'success');
        }
      });

  }

  close() {

    this.modalCtrl.dismiss();

  }

}