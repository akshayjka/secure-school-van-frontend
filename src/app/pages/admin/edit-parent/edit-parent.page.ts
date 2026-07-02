import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, Validators } from '@angular/forms';
// import { IonContent, IonHeader, IonTitle, IonToolbar, ModalController } from '@ionic/angular/standalone';
import { ParentService } from 'src/app/core/services/parent';
import {
  ReactiveFormsModule
} from '@angular/forms';
import { Input } from '@angular/core';



import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  ModalController,
  IonItem,
  IonInput,
  IonButton,
  IonButtons,
    IonBackButton
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-edit-parent',
  templateUrl: './edit-parent.page.html',
  styleUrls: ['./edit-parent.page.scss'],
  standalone: true,
  imports: [
  CommonModule,
  FormsModule,
  ReactiveFormsModule,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonItem,
  IonInput,
  IonButton,
  IonButtons,
    IonBackButton
]
})
export class EditParentPage implements OnInit {
  @Input() parent: any;
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
    private parentService: ParentService
  ) { }
ngOnInit() {

  if (this.parent) {

    this.form.patchValue({

      driverId: this.parent.driverId,
      name: this.parent.name,
      mobileNumber: this.parent.mobileNumber,
      studentName: this.parent.studentName,
      schoolName: this.parent.schoolName,
      pickupArea: this.parent.pickupArea,
      dropArea: this.parent.dropArea

    });

  }

}

   close() {
    this.modalCtrl.dismiss();
  }
  save() {

  if (this.form.invalid) {

    return;

  }

  this.parentService.updateParent(this.parent._id,this.form.value
  )
  .subscribe({

    next: () => {

      this.modalCtrl.dismiss(
        true,
        'confirm'
      );

    }

  });

}

}
