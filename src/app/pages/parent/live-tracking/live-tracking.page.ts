import {
  AfterViewInit,
  Component,
  OnDestroy
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  Router
} from '@angular/router';

import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';

import {
  Subscription
} from 'rxjs';

import {
  SocketService
} from 'src/app/core/services/socket';

import {
  ParentService
} from 'src/app/core/services/parent';

import * as L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'assets/leaflet/marker-icon-2x.png',

  iconUrl:
    'assets/leaflet/marker-icon.png',

  shadowUrl:
    'assets/leaflet/marker-shadow.png'
});

@Component({
  selector: 'app-live-tracking',
  templateUrl: './live-tracking.page.html',
  styleUrls: ['./live-tracking.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonBackButton,
    IonButtons,
    IonToolbar,
    CommonModule,
    FormsModule
  ]
})
export class LiveTrackingPage
  implements AfterViewInit, OnDestroy {

  map: any;

  vanMarker: any;

  schoolMarker: any;

  trackingInterval: any;

  studentStatusSubscription?:
    Subscription;

  dashboardSubscription?:
    Subscription;

  schoolLat = 11.0168;

  schoolLng = 76.9558;

  parentId = '';

  driverId = '';

  rideType:
    | 'morning'
    | 'evening'
    | null = null;

  trackingAvailable = false;

  constructor(
    private parentService: ParentService,
    private socketService: SocketService,
    private router: Router
  ) {}

  // =====================================================
  // INIT
  // =====================================================

  ngAfterViewInit(): void {

    this.parentId =
      localStorage.getItem('parentId') || '';

    if (!this.parentId) {

      this.router.navigateByUrl(
        '/auth/login'
      );

      return;
    }

    this.socketService.connect();

    this.socketService.joinParentRoom(
      this.parentId
    );

    this.checkTrackingAccess();

  }

  // =====================================================
  // CHECK TRACKING ACCESS
  // =====================================================

  checkTrackingAccess(): void {

    this.parentService
      .getDashboard(this.parentId)
      .subscribe({

        next: (response: any) => {

          const data =
            response?.data;

          if (!data) {

            this.stopTracking();

            return;
          }

          this.driverId =
            data.driver?.driverId || '';

          this.rideType =
            data.rideType || null;

          this.trackingAvailable =
            data.trackingAvailable === true;

          if (
            !this.trackingAvailable ||
            !this.driverId ||
            !this.rideType
          ) {

            this.stopTracking();

            this.router.navigateByUrl(
              '/parent/dashboard'
            );

            return;
          }

          this.loadMap();

          this.listenForStudentStatus();

          this.startLocationPolling();

        },

        error: (error) => {

          console.error(
            'Tracking access check failed',
            error
          );

          this.stopTracking();

          this.router.navigateByUrl(
            '/parent/dashboard'
          );

        }

      });

  }

  // =====================================================
  // MAP
  // =====================================================

  loadMap(): void {

    if (this.map) {
      return;
    }

    this.map =
      L.map('map')
        .setView(
          [
            this.schoolLat,
            this.schoolLng
          ],
          15
        );

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19
      }
    ).addTo(this.map);

    this.schoolMarker =
      L.marker([
        this.schoolLat,
        this.schoolLng
      ])
      .addTo(this.map);

    this.schoolMarker.bindPopup(
      '🏫 Lisieux Matriculation School'
    );

    this.vanMarker =
      L.marker([
        this.schoolLat,
        this.schoolLng
      ])
      .addTo(this.map);

    this.vanMarker.bindPopup(
      '🚐 School Van'
    );

    setTimeout(() => {

      this.map.invalidateSize();

    }, 300);

  }

  // =====================================================
  // LOCATION
  // =====================================================

  startLocationPolling(): void {

    this.stopLocationPolling();

    this.fetchLocation();

    this.trackingInterval =
      setInterval(() => {

        this.fetchLocation();

      }, 15000);

  }

  fetchLocation(): void {

    if (
      !this.trackingAvailable ||
      !this.driverId ||
      !this.rideType ||
      !this.parentId
    ) {

      return;
    }

    this.parentService
      .getLiveLocation(
        this.driverId,
        this.rideType,
        this.parentId
      )
      .subscribe({

        next: (response: any) => {

          const data =
            response?.data;

          if (
            !data ||
            data.latitude === undefined ||
            data.longitude === undefined
          ) {

            return;
          }

          if (!this.vanMarker) {
            return;
          }

          this.vanMarker.setLatLng([
            data.latitude,
            data.longitude
          ]);

          const bounds =
            L.latLngBounds([

              [
                data.latitude,
                data.longitude
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

        },

        error: (error) => {

          if (
            error?.status === 403 ||
            error?.status === 404
          ) {

            this.stopTracking();

            this.router.navigateByUrl(
              '/parent/dashboard'
            );

          }

        }

      });

  }

  // =====================================================
  // STUDENT STATUS SOCKET
  // =====================================================

  listenForStudentStatus(): void {

    this.studentStatusSubscription =
      this.socketService
        .listenStudentStatusUpdated()
        .subscribe((event: any) => {

          if (
            event?.parentId !==
            this.parentId
          ) {

            return;
          }

          const status =
            event?.status;

          if (
            status === 'picked_up' &&
            event.rideType === 'morning'
          ) {

            this.trackingAvailable = true;

            return;
          }

          if (
            status ===
            'picked_from_school' &&
            event.rideType === 'evening'
          ) {

            this.trackingAvailable = true;

            return;
          }

          if (
            status ===
            'dropped_at_school' ||
            status ===
            'dropped_at_home'
          ) {

            this.trackingAvailable = false;

            this.stopTracking();

            this.router.navigateByUrl(
              '/parent/dashboard'
            );

          }

        });

  }

  // =====================================================
  // STOP
  // =====================================================

  stopLocationPolling(): void {

    if (this.trackingInterval) {

      clearInterval(
        this.trackingInterval
      );

      this.trackingInterval = null;

    }

  }

  stopTracking(): void {

    this.trackingAvailable = false;

    this.stopLocationPolling();

  }

  // =====================================================
  // DESTROY
  // =====================================================

  ngOnDestroy(): void {

    this.stopTracking();

    this.studentStatusSubscription
      ?.unsubscribe();

    this.dashboardSubscription
      ?.unsubscribe();

  }

}