import { AfterViewInit, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router }
  from '@angular/router';

import {
  SocketService
}
  from
  'src/app/core/services/socket';
// import * as L from 'leaflet';
import * as L from 'leaflet';


delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  iconUrl: 'assets/leaflet/marker-icon.png',
  shadowUrl: 'assets/leaflet/marker-shadow.png'
});
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { ParentService } from 'src/app/core/services/parent';

@Component({
  selector: 'app-live-tracking',
  templateUrl: './live-tracking.page.html',
  styleUrls: ['./live-tracking.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonBackButton, IonButtons, IonToolbar, CommonModule, FormsModule]
})
export class LiveTrackingPage implements AfterViewInit {


  trackingInterval: any;
  constructor(private parentService:
    ParentService,

    private socketService:
      SocketService,

    private router:
      Router) { }

  map: any;

  vanMarker: any;

  schoolMarker: any;

  schoolLat = 11.0168;

  schoolLng = 76.9558;

  ngAfterViewInit() {

    setTimeout(() => {

      this.loadMap();

      this.map.invalidateSize();

      const parentId = localStorage.getItem('parentId');

      if (parentId) {

        this.socketService.connect();

        this.socketService.joinParentRoom(parentId);

        this.socketService
          .listenDashboardUpdated()
          .subscribe(() => {

            const parentId = localStorage.getItem('parentId');

            if (!parentId) {
              return;
            }

            this.parentService
              .getDashboard(parentId)
              .subscribe((res: any) => {

                if (!res.data.rideStarted) {

                  clearInterval(this.trackingInterval);

                  this.router.navigateByUrl(
                    '/parent/dashboard'
                  );

                }

              });

          });

      }

    }, 300);

  }
  loadMap() {

    this.map = L.map('map').setView([11.0168, 76.9558], 15);
    const driverId =
      localStorage.getItem('driverId');

    if (!driverId) {
      return;
    }

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(this.map);

    this.schoolMarker = L.marker(
      [
        this.schoolLat,
        this.schoolLng
      ]
    ).addTo(this.map);

    this.schoolMarker.bindPopup(
      '🏫 Lisieux Matriculation School'
    );

    this.vanMarker = L.marker(
      [
        this.schoolLat,
        this.schoolLng
      ]
    ).addTo(this.map);

    this.vanMarker.bindPopup(
      '🚐 School Van'
    );

    this.trackingInterval =
      setInterval(() => {

        this.parentService

          .getLiveLocation(driverId)

          .subscribe((res: any) => {

            this.vanMarker.setLatLng([
              res.latitude,
              res.longitude
            ]);
            const bounds = L.latLngBounds([
              [
                res.latitude,
                res.longitude
              ],
              [
                this.schoolLat,
                this.schoolLng
              ]
            ]);

            this.map.fitBounds(
              bounds,
              {
                padding: [50, 50]
              }
            );
          });

      }, 15000);

  }

  ngOnDestroy() {

    clearInterval(this.trackingInterval);

    clearInterval(this.trackingInterval);

  }
}
