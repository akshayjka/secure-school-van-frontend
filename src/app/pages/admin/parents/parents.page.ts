import {
  Component,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  IonicModule,
  AlertController,
  ToastController
} from '@ionic/angular';

import {
  Router
} from '@angular/router';

import {
  ParentService
} from '../../../core/services/parent';

import {
  addIcons
} from 'ionicons';

import {
  add,
  createOutline,
  trashOutline,
  calendarOutline,
  peopleOutline,
  arrowBackOutline
} from 'ionicons/icons';


@Component({
  selector: 'app-parents',

  templateUrl: './parents.page.html',

  styleUrls: ['./parents.page.scss'],

  standalone: true,

  imports: [
    CommonModule,
    IonicModule
  ]
})
export class ParentsPage implements OnInit {

  parents: any[] = [];

  loading = false;


  constructor(
    private parentService: ParentService,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {

    addIcons({
      add,
      createOutline,
      trashOutline,
      calendarOutline,
      peopleOutline,
      arrowBackOutline
    });

  }


  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {

    this.loadParents();

  }


  // =====================================================
  // PAGE ENTER
  // =====================================================

  ionViewWillEnter(): void {

    this.loadParents();

  }


  // =====================================================
  // LOAD PARENTS
  // =====================================================

  loadParents(): void {

    this.loading = true;

    this.parentService.getParents()
      .subscribe({

        next: (res: any) => {

          this.parents = res?.data || [];

          this.loading = false;

        },

        error: (err) => {

          console.error(
            'Failed to load parents:',
            err
          );

          this.loading = false;

          this.showToast(
            'Failed to load parents',
            'danger'
          );

        }

      });

  }


  // =====================================================
  // ADD PARENT
  // =====================================================

  openAddParent(): void {

    this.router.navigate([
      '/admin/parents/add'
    ]);

  }


  // =====================================================
  // EDIT PARENT
  // =====================================================

  openEditParent(parent: any): void {

    if (!parent?._id) {
      return;
    }

    this.router.navigate([
      '/admin/parents/edit',
      parent._id
    ]);

  }


  // =====================================================
  // ATTENDANCE
  // =====================================================

  openAttendance(parent: any): void {

    if (!parent?._id) {
      return;
    }

    this.router.navigate([
      '/admin/parents/attendance',
      parent._id
    ]);

  }


  // =====================================================
  // DELETE PARENT
  // =====================================================

  async deleteParent(parent: any): Promise<void> {

    const alert = await this.alertCtrl.create({

      header: 'Delete Parent',

      message:
        `Are you sure you want to delete ${parent.name}?`,

      buttons: [

        {
          text: 'Cancel',
          role: 'cancel'
        },

        {

          text: 'Delete',

          role: 'destructive',

          handler: () => {

            this.parentService
              .deleteParent(parent._id)
              .subscribe({

                next: async () => {

                  await this.showToast(
                    'Parent deleted successfully',
                    'success'
                  );

                  this.loadParents();

                },

                error: (err) => {

                  console.error(
                    'Delete parent failed:',
                    err
                  );

                  this.showToast(
                    'Failed to delete parent',
                    'danger'
                  );

                }

              });

          }

        }

      ]

    });

    await alert.present();

  }


  // =====================================================
  // INITIALS
  // =====================================================

  getInitials(name: string): string {

    if (!name) {
      return '?';
    }

    const parts =
      name.trim().split(' ');

    if (parts.length === 1) {
      return parts[0]
        .substring(0, 2)
        .toUpperCase();
    }

    return (
      parts[0][0] +
      parts[parts.length - 1][0]
    ).toUpperCase();

  }


  // =====================================================
  // TOAST
  // =====================================================

  async showToast(
    message: string,
    color: 'success' | 'danger' | 'warning'
  ): Promise<void> {

    const toast =
      await this.toastCtrl.create({

        message,

        duration: 2000,

        color,

        position: 'bottom'

      });

    await toast.present();

  }

}