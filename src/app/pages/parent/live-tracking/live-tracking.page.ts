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
  ActivatedRoute,
  Router
} from '@angular/router';

import {
  Subscription
} from 'rxjs';

import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar
} from '@ionic/angular/standalone';

import {
  ParentService
} from 'src/app/core/services/parent';

import {
  SocketService
} from 'src/app/core/services/socket';

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

  selector:
    'app-live-tracking',

  templateUrl:
    './live-tracking.page.html',

  styleUrls:
    ['./live-tracking.page.scss'],

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


  // =====================================================
  // MAP
  // =====================================================

  map: any;

  vanMarker: any;

  schoolMarker: any;


  schoolLat =
    11.0168;

  schoolLng =
    76.9558;


  // =====================================================
  // TRACKING
  // =====================================================

  trackingInterval:
    any = null;


  trackingStarted = false;


  lastLatitude:
    number | null = null;


  lastLongitude:
    number | null = null;


  // =====================================================
  // IDENTIFIERS
  // =====================================================

  parentId = '';

  driverId = '';

  rideType = '';


  // =====================================================
  // SUBSCRIPTIONS
  // =====================================================

  private statusSubscription?:
    Subscription;


  private trackingStartedSubscription?:
    Subscription;


  private trackingStoppedSubscription?:
    Subscription;


  private locationSubscription?:
    Subscription;


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(

    private parentService:
      ParentService,

    private socketService:
      SocketService,

    private router:
      Router,

    private route:
      ActivatedRoute

  ) {}


  // =====================================================
  // INIT
  // =====================================================

  ngAfterViewInit(): void {

    setTimeout(() => {

      this.initializeTracking();

    }, 100);

  }


  // =====================================================
  // INITIALIZE
  // =====================================================

  private initializeTracking(): void {

    // -----------------------------------------------------
    // PARAMETERS
    // -----------------------------------------------------

    this.parentId =
      this.route.snapshot
        .queryParamMap
        .get('parentId')
      ||
      localStorage.getItem(
        'parentId'
      )
      ||
      '';


    this.driverId =
      this.route.snapshot
        .queryParamMap
        .get('driverId')
      || '';


    this.rideType =
      this.normalizeRideType(
        this.route.snapshot
          .queryParamMap
          .get('rideType')
      ) || '';


    console.log(
      '📍 LIVE TRACKING INIT',
      {
        parentId:
          this.parentId,

        driverId:
          this.driverId,

        rideType:
          this.rideType
      }
    );


    // -----------------------------------------------------
    // VALIDATE
    // -----------------------------------------------------

    if (
      !this.parentId ||
      !this.driverId ||
      !this.rideType
    ) {

      console.error(
        '❌ Missing live tracking parameters',
        {
          parentId:
            this.parentId,

          driverId:
            this.driverId,

          rideType:
            this.rideType
        }
      );

      this.goToDashboard();

      return;
    }


    // -----------------------------------------------------
    // SOCKET
    // -----------------------------------------------------

    this.socketService.connect();


    this.socketService.joinParentRoom(
      this.parentId
    );


    this.socketService.joinParentChannel(
      this.driverId
    );


    // -----------------------------------------------------
    // LISTENERS
    // -----------------------------------------------------

    this.registerSocketListeners();


    // -----------------------------------------------------
    // MAP
    // -----------------------------------------------------

    this.loadMap();


    setTimeout(() => {

      this.map?.invalidateSize();

    }, 200);


    // -----------------------------------------------------
    // FIRST LOCATION
    //
    // REST is ONLY used as initial/fallback location.
    // -----------------------------------------------------

    this.fetchInitialLocation();


    // -----------------------------------------------------
    // FALLBACK POLLING
    //
    // Socket is primary.
    // REST polling is secondary.
    // -----------------------------------------------------

    this.trackingInterval =
      setInterval(
        () => {

          if (
            !this.trackingStarted
          ) {

            return;
          }

          this.fetchInitialLocation();

        },
        15000
      );

  }


  // =====================================================
  // SOCKET LISTENERS
  // =====================================================

  private registerSocketListeners(): void {

    // ===================================================
    // TRACKING STARTED
    // ===================================================

    this.trackingStartedSubscription =
      this.socketService
        .trackingStarted()
        .subscribe(
          (data: any) => {

            console.log(
              '🟢 TRACKING STARTED EVENT',
              data
            );


            if (
              !this.matchesTrackingEvent(
                data
              )
            ) {

              return;
            }


            this.trackingStarted =
              true;


            // If event contains location,
            // immediately update map.

            this.applyLocation(
              data?.location ||
              data?.data ||
              data
            );

          }
        );


    // ===================================================
    // LOCATION UPDATED
    // ===================================================

    this.locationSubscription =
      this.socketService
        .listenLocationUpdated()
        .subscribe(
          (data: any) => {

            console.log(
              '📡 LOCATION UPDATED',
              data
            );


            if (
              !this.matchesTrackingEvent(
                data
              )
            ) {

              return;
            }


            this.trackingStarted =
              true;


            const location =
              data?.location ||
              data?.data ||
              data;


            this.applyLocation(
              location
            );

          }
        );


    // ===================================================
    // STUDENT STATUS
    // ===================================================

    this.statusSubscription =
      this.socketService
        .listenStudentStatusUpdated()
        .subscribe(
          (data: any) => {

            console.log(
              '📡 STUDENT STATUS',
              data
            );


            if (
              data?.parentId &&
              data.parentId !==
                this.parentId
            ) {

              return;
            }


            if (
              data?.driverId &&
              data.driverId !==
                this.driverId
            ) {

              return;
            }


            const incomingRideType =
              this.normalizeRideType(
                data?.rideType
              );


            if (
              incomingRideType &&
              incomingRideType !==
                this.rideType
            ) {

              return;
            }


            const status =
              String(
                data?.status || ''
              )
                .trim()
                .toLowerCase();


            // ------------------------------------------------
            // PICKUP
            // ------------------------------------------------

            const pickedUp =
              status === 'picked_up' ||
              status === 'picked' ||
              status === 'picked_from_school';


            if (pickedUp) {

              this.trackingStarted =
                true;

              return;

            }


            // ------------------------------------------------
            // DROP
            // ------------------------------------------------

            const dropped =
              (
                this.rideType === 'morning' &&
                (
                  status ===
                    'dropped_at_school' ||
                  status ===
                    'dropped'
                )
              )
              ||
              (
                this.rideType === 'evening' &&
                (
                  status ===
                    'dropped_at_home' ||
                  status ===
                    'dropped'
                )
              );


            if (dropped) {

              this.stopTracking();

              this.goToDashboard();

            }

          }
        );


    // ===================================================
    // TRACKING STOPPED
    // ===================================================

    this.trackingStoppedSubscription =
      this.socketService
        .trackingStopped()
        .subscribe(
          (data: any) => {

            console.log(
              '🔴 TRACKING STOPPED',
              data
            );


            if (
              !this.matchesTrackingEvent(
                data
              )
            ) {

              return;
            }


            this.stopTracking();

            this.goToDashboard();

          }
        );

  }


  // =====================================================
  // EVENT FILTER
  // =====================================================

  private matchesTrackingEvent(
    data: any
  ): boolean {

    if (!data) {

      return true;

    }


    if (
      data.parentId &&
      String(data.parentId) !==
        String(this.parentId)
    ) {

      return false;

    }


    if (
      data.driverId &&
      String(data.driverId) !==
        String(this.driverId)
    ) {

      return false;

    }


    const incomingRideType =
      this.normalizeRideType(
        data.rideType
      );


    if (
      incomingRideType &&
      incomingRideType !==
        this.rideType
    ) {

      return false;

    }


    return true;

  }


  // =====================================================
  // MAP
  // =====================================================

  private loadMap(): void {

    const element =
      document.getElementById(
        'map'
      );


    if (!element) {

      console.error(
        '❌ Map element not found'
      );

      return;

    }


    this.map =
      L.map(
        element
      ).setView(
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
    ).addTo(
      this.map
    );


    this.schoolMarker =
      L.marker(
        [
          this.schoolLat,
          this.schoolLng
        ]
      )
      .addTo(
        this.map
      );


    this.schoolMarker.bindPopup(
      '🏫 Lisieux Matriculation School'
    );


    this.vanMarker =
      L.marker(
        [
          this.schoolLat,
          this.schoolLng
        ]
      )
      .addTo(
        this.map
      );


    this.vanMarker.bindPopup(
      '🚐 School Van'
    );

  }


  // =====================================================
  // INITIAL / FALLBACK LOCATION
  // =====================================================

  private fetchInitialLocation(): void {

    if (
      !this.parentId ||
      !this.driverId ||
      !this.rideType
    ) {

      return;

    }


    this.parentService
      .getLiveLocation(
        this.driverId,
        this.rideType as
          'morning' |
          'evening',
        this.parentId
      )
      .subscribe({

        next: (
          response: any
        ) => {

          console.log(
            '📍 REST LOCATION',
            response
          );


          const data =
            response?.data ??
            response;


          // ------------------------------------------------
          // Backend explicitly says tracking is unavailable
          // ------------------------------------------------

          if (
            data?.trackingAvailable ===
              false
          ) {

            console.warn(
              '🔴 Backend says tracking unavailable'
            );

            return;

          }


          const location =
            data?.location ??
            data;


          this.applyLocation(
            location
          );

        },


        error: (
          error: any
        ) => {

          console.warn(
            '⚠️ REST live-location request failed',
            {
              status:
                error?.status,

              message:
                error?.message
            }
          );


          // IMPORTANT:
          //
          // DO NOT redirect to dashboard
          // on 404.
          //
          // Socket.IO remains the primary
          // tracking channel.
          //
          // This is exactly where your
          // current code was kicking the
          // parent out of live tracking.

        }

      });

  }


  // =====================================================
  // APPLY LOCATION
  // =====================================================

  private applyLocation(
    location: any
  ): void {

    const latitude =
      Number(
        location?.latitude ??
        location?.lat
      );


    const longitude =
      Number(
        location?.longitude ??
        location?.lng ??
        location?.lon
      );


    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {

      console.warn(
        '⚠️ Invalid vehicle coordinates',
        location
      );

      return;

    }


    this.lastLatitude =
      latitude;

    this.lastLongitude =
      longitude;


    this.trackingStarted =
      true;


    if (!this.vanMarker) {

      return;

    }


    this.vanMarker.setLatLng([
      latitude,
      longitude
    ]);


    // -----------------------------------------------------
    // Only fit bounds when we receive a new location.
    // -----------------------------------------------------

    if (this.map) {

      const bounds =
        L.latLngBounds([

          [
            latitude,
            longitude
          ],

          [
            this.schoolLat,
            this.schoolLng
          ]

        ]);


      this.map.fitBounds(
        bounds,
        {
          padding:
            [
              50,
              50
            ],

          maxZoom:
            16
        }
      );

    }


    console.log(
      '🟢 VAN POSITION UPDATED',
      {
        latitude,
        longitude
      }
    );

  }


  // =====================================================
  // NORMALIZE RIDE TYPE
  // =====================================================

  private normalizeRideType(
    value: any
  ):
    | 'morning'
    | 'evening'
    | null {

    const type =
      String(
        value || ''
      )
        .trim()
        .toLowerCase();


    if (
      type === 'morning' ||
      type === 'pickup' ||
      type === 'home_to_school'
    ) {

      return 'morning';

    }


    if (
      type === 'evening' ||
      type === 'return' ||
      type === 'school_to_home'
    ) {

      return 'evening';

    }


    return null;

  }


  // =====================================================
  // STOP
  // =====================================================

  private stopTracking(): void {

    this.trackingStarted =
      false;


    if (
      this.trackingInterval
    ) {

      clearInterval(
        this.trackingInterval
      );

      this.trackingInterval =
        null;

    }

  }


  // =====================================================
  // DASHBOARD
  // =====================================================

  private goToDashboard(): void {

    this.router.navigateByUrl(
      '/parent/dashboard',
      {
        replaceUrl:
          true
      }
    );

  }


  // =====================================================
  // DESTROY
  // =====================================================

  ngOnDestroy(): void {

    this.stopTracking();


    this.statusSubscription
      ?.unsubscribe();


    this.trackingStartedSubscription
      ?.unsubscribe();


    this.trackingStoppedSubscription
      ?.unsubscribe();


    this.locationSubscription
      ?.unsubscribe();


    // IMPORTANT:
    // Don't destroy the global socket
    // when merely leaving tracking page.
    //
    // Parent dashboard also uses it.

  }

}