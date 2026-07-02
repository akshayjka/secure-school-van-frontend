import { Component, OnInit } from '@angular/core';

import {
  ModalController, AlertController, ToastController,
} from '@ionic/angular';
import { CommonModule } from '@angular/common';

import {
  IonicModule
} from '@ionic/angular';

import { ParentService } from '../../../core/services/parent';
import { AddParentComponent } from '../add-parent/add-parent.component';
import { EditParentPage } from '../edit-parent/edit-parent.page';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  createOutline,
  trashOutline,
  add,
  logOutOutline
} from 'ionicons/icons';
// import { IonBackButton, IonButtons } from '@ionic/angular/standalone';

@Component({
  selector: 'app-parents',
  templateUrl: './parents.page.html',
  styleUrls: ['./parents.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonicModule,
    // IonBackButton,
    // IonButtons
  ]
})
export class ParentsPage implements OnInit {

  parents: any[] = [];

  constructor(
    private parentService: ParentService,
    // private modalCtrl: ModalController,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) { 
     addIcons({
        createOutline,
        trashOutline,
        add,
        logOutOutline
      });
  }

  ngOnInit() {
    this.loadParents();
  }

  ionViewWillEnter() {
    this.loadParents();
  }

  loadParents() {

    this.parentService.getParents()
      .subscribe({
        next: (res) => {
          this.parents = res.data;
        },
        error: (err) => {
          console.log(err);
        }
      });

  }

openAddParent() {
  this.router.navigate(['/admin/parents/add']);
}

 openEditParent(parent: any) {
  this.router.navigate(['/admin/parents/edit',parent._id]);
}

  async deleteParent(parent: any) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Parent',
      message:
        `Delete ${parent.name}?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          handler: () => {
            this.parentService.deleteParent(parent._id).subscribe({
              next: async () => {
                const toast =
                  await this.toastCtrl.create({
                    message:
                      'Parent Deleted', duration: 2000, color: 'success'
                  });
                toast.present();
                this.loadParents();
              }
            });
          }
        }
      ]
    });

    await alert.present();

  }

}