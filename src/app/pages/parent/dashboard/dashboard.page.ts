import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// import { IonButton } from '@ionic/angular/standalone';
import { ParentService } from 'src/app/core/services/parent';
import { Router } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { DialogService } from 'src/app/core/services/dialog';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class DashboardPage implements OnInit {

  rideStarted = false;
  isPresent = true;
  driverId: any;
  parent: any = {};
  driver: any = {};

  constructor(private parentService: ParentService,
    private router: Router,
    private dialogService: DialogService
  ) { }

  ngOnInit() {
    // this.driverId = localStorage.getItem('driverId')
    // this.parentService.getRideStatus(this.driverId).subscribe((res: any) => { this.rideStarted = res.rideStarted; });

    const parentId = localStorage.getItem('parentId');
    this.parentService.getDashboard(parentId!).subscribe({
      next: (res: any) => {
        this.parent = {
          studentName: res.studentName,
          schoolName: res.schoolName,
          pickupArea: res.pickupArea,
          dropArea: res.dropArea
        };
        this.driver = res.driver;
        this.isPresent = res.isPresent;
        this.rideStarted = res.rideStarted;
      },

      error: (err) => {
        console.error(err);
      }
    });
  }

  openTracking() {

    this.router.navigate([
      '/live-tracking'
    ]);

  }

  updateAttendance() {

    const payload = {
      parentId: localStorage.getItem('parentId'),
      isPresent: this.isPresent
    };

    this.parentService
      .updateAttendance(payload)
      .subscribe();
  }

  async logout() {

    const confirmed = await this.dialogService.confirmLogout();

    if (!confirmed) return;

    localStorage.removeItem('token');

    localStorage.removeItem('role');

    localStorage.removeItem('name');
    localStorage.removeItem('driverId');
    localStorage.removeItem('userName');

    this.router.navigate(['/auth/login']);
  }

}
