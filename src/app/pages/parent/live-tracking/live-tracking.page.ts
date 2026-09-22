import {
  AfterViewInit,
  Component,
  OnDestroy
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

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
  IonIcon,
  IonSpinner,
  IonTitle,
  IonToolbar,
  IonButton
} from '@ionic/angular/standalone';

import {
  addIcons
} from 'ionicons';

import {
  locationOutline,
  homeOutline,
  schoolOutline,
  navigateOutline,
  informationCircleOutline,
  warningOutline,
  refreshOutline
} from 'ionicons/icons';

import {
  importLibrary,
  setOptions
} from '@googlemaps/js-api-loader';

import {
  ParentService
} from 'src/app/core/services/parent';

import {
  SocketService
} from 'src/app/core/services/socket';

import {
  environment
} from 'src/environments/environment';


/* =====================================================
   TYPES
===================================================== */

type RideType =
  | 'morning'
  | 'evening';


interface LatLng {

  lat: number;

  lng: number;

}


interface RouteLocation {

  latitude: number;

  longitude: number;

}


interface RouteData {

  /*
   * Your current backend appears to use
   * pickupLocation.
   *
   * homeLocation is also supported.
   */

  pickupLocation?:
    RouteLocation | null;

  homeLocation?:
    RouteLocation | null;

  schoolLocation?:
    RouteLocation | null;

}


interface LiveLocationData {

  latitude?:
    number;

  longitude?:
    number;

  lat?:
    number;

  lng?:
    number;

  timestamp?:
    string |
    number;

  updatedAt?:
    string |
    number;

  route?:
    RouteData;

  rideId?:
    string;

  driverId?:
    string;

  rideType?:
    string;

  status?:
    string;

  startTime?:
    string |
    number;

}


/* =====================================================
   COMPONENT
===================================================== */

@Component({

  selector:
    'app-live-tracking',

  templateUrl:
    './live-tracking.page.html',

  styleUrls:
    ['./live-tracking.page.scss'],

  standalone:
    true,

  imports: [

    CommonModule,

    IonContent,

    IonHeader,

    IonTitle,

    IonBackButton,

    IonButtons,

    IonToolbar,

    IonIcon,

    IonSpinner,

    IonButton

  ]

})
export class LiveTrackingPage
  implements AfterViewInit, OnDestroy {


  /* ===================================================
     MAP
  =================================================== */

  private map:
    google.maps.Map | null =
      null;


  private mapElement:
    HTMLElement | null =
      null;


  /* ===================================================
     MARKERS
  =================================================== */

  private vanMarker:
    google.maps.marker.AdvancedMarkerElement | null =
      null;


  private homeMarker:
    google.maps.marker.AdvancedMarkerElement | null =
      null;


  private schoolMarker:
    google.maps.marker.AdvancedMarkerElement | null =
      null;


  /* ===================================================
     ROUTE
  =================================================== */

  private routePolylines:
    google.maps.Polyline[] =
      [];


  /*
   * PUBLIC because HTML uses routeLoaded.
   */

  routeLoaded =
    false;


  private routeLoading =
    false;


  /*
   * Last location used to calculate a route.
   *
   * We don't want to call Google Routes API
   * for every tiny GPS movement.
   */

  private lastRouteOrigin:
    LatLng | null =
      null;


  /*
   * Minimum distance before recalculating route.
   *
   * 100 meters.
   */

  private readonly routeRefreshDistanceMeters =
    100;


  /*
   * Minimum time between route calculations.
   *
   * 15 seconds.
   */

  private readonly routeRefreshIntervalMs =
    15000;


  private lastRouteCalculationTime =
    0;


  /* ===================================================
     GOOGLE LIBRARIES
  =================================================== */

  private mapsLibrary:
    google.maps.MapsLibrary | null =
      null;


  private markerLibrary:
    google.maps.MarkerLibrary | null =
      null;


  private routesLibrary:
    google.maps.RoutesLibrary | null =
      null;


  private googleMapsLoaded =
    false;


  private googleMapsLoading:
    Promise<void> | null =
      null;


  /* ===================================================
     DEFAULT SCHOOL
  =================================================== */

  readonly defaultSchoolLocation:
    LatLng = {

      lat:
        11.0168,

      lng:
        76.9558

    };


  /* ===================================================
     REGISTERED LOCATIONS
  =================================================== */

  /*
   * Student's registered home / pickup location.
   */

  private homeLocation:
    LatLng | null =
      null;


  /*
   * School location.
   */

  private schoolLocation:
    LatLng =
      this.defaultSchoolLocation;


  /* ===================================================
     CURRENT VAN LOCATION
  =================================================== */

  lastLatitude:
    number | null =
      null;


  lastLongitude:
    number | null =
      null;


  lastLocationTime:
    Date | null =
      null;


  /* ===================================================
     TRACKING
  =================================================== */

  trackingStarted =
    false;


  mapLoading =
    true;


  mapError =
    false;


  routeMessage =
    '';


  /* ===================================================
     IDENTIFIERS
  =================================================== */

  parentId =
    '';


  driverId =
    '';


  rideType:
    RideType =
      'morning';


  /* ===================================================
     FALLBACK POLLING
  =================================================== */

  private trackingInterval:
    ReturnType<typeof setInterval> | null =
      null;


  private restRequestInProgress =
    false;


  /* ===================================================
     INITIALIZATION
  =================================================== */

  private initialized =
    false;


  private isDestroyed =
    false;


  /* ===================================================
     SOCKET SUBSCRIPTIONS
  =================================================== */

  private trackingStartedSubscription?:
    Subscription;


  private trackingStoppedSubscription?:
    Subscription;


  private locationSubscription?:
    Subscription;


  private statusSubscription?:
    Subscription;


  private rideEndedSubscription?:
    Subscription;


  /* ===================================================
     CONSTRUCTOR
  =================================================== */

  constructor(

    private parentService:
      ParentService,

    private socketService:
      SocketService,

    private router:
      Router,

    private route:
      ActivatedRoute

  ) {

    addIcons({

      locationOutline,

      homeOutline,

      schoolOutline,

      navigateOutline,

      informationCircleOutline,

      warningOutline,

      refreshOutline

    });

  }


  /* ===================================================
     AFTER VIEW INIT
  =================================================== */

  ngAfterViewInit(): void {

    setTimeout(

      () => {

        void this.initializeTracking();

      },

      100

    );

  }


  /* ===================================================
     INITIALIZE
  =================================================== */

  private async initializeTracking():
    Promise<void> {


    if (
      this.initialized
    ) {

      return;

    }


    this.initialized =
      true;


    /* -------------------------------------------------
       PARENT ID
    ------------------------------------------------- */

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


    /* -------------------------------------------------
       DRIVER ID
    ------------------------------------------------- */

    this.driverId =

      this.route.snapshot
        .queryParamMap
        .get('driverId')

      ||

      '';


    /* -------------------------------------------------
       RIDE TYPE
    ------------------------------------------------- */

    const routeType =
      this.normalizeRideType(

        this.route.snapshot
          .queryParamMap
          .get('rideType')

      );


    if (
      routeType
    ) {

      this.rideType =
        routeType;

    }


    console.log(
      '📍 LIVE TRACKING',
      {

        parentId:
          this.parentId,

        driverId:
          this.driverId,

        rideType:
          this.rideType

      }
    );


    /* -------------------------------------------------
       VALIDATION
    ------------------------------------------------- */

    if (
      !this.parentId ||
      !this.driverId
    ) {

      this.mapError =
        true;

      this.mapLoading =
        false;

      return;

    }


    /* -------------------------------------------------
       SOCKET
    ------------------------------------------------- */

    this.socketService.connect();


    this.socketService.joinParentRoom(
      this.parentId
    );


    this.socketService.joinParentChannel(
      this.driverId
    );


    /* -------------------------------------------------
       SOCKET LISTENERS
    ------------------------------------------------- */

    this.registerSocketListeners();


    /* -------------------------------------------------
       GOOGLE MAP
    ------------------------------------------------- */

    try {

      await this.loadGoogleMaps();


      await this.initializeMap();


      /*
       * Get current GPS + registered locations.
       */

      this.fetchInitialLocation();


      /*
       * REST fallback.
       */

      this.startFallbackPolling();


    } catch (
      error
    ) {

      console.error(
        '❌ Tracking initialization failed',
        error
      );


      this.mapError =
        true;

      this.mapLoading =
        false;

    }

  }


  /* ===================================================
     GOOGLE MAP LOADER
  =================================================== */

  private async loadGoogleMaps():
    Promise<void> {


    if (
      this.googleMapsLoaded
    ) {

      return;

    }


    if (
      this.googleMapsLoading
    ) {

      return this.googleMapsLoading;

    }


    this.googleMapsLoading =
      (async () => {


        const apiKey =
          String(

            (environment as any)
              ?.googleMapsApiKey

            ||

            ''

          ).trim();


        if (
          !apiKey
        ) {

          throw new Error(
            'Google Maps API key is missing'
          );

        }


        setOptions({

          key:
            apiKey,

          v:
            'weekly'

        });


        /* Maps */

        this.mapsLibrary =
          await importLibrary(
            'maps'
          ) as google.maps.MapsLibrary;


        /* Advanced Marker */

        this.markerLibrary =
          await importLibrary(
            'marker'
          ) as google.maps.MarkerLibrary;


        /* Routes */

        this.routesLibrary =
          await importLibrary(
            'routes'
          ) as google.maps.RoutesLibrary;


        if (
          !this.mapsLibrary?.Map
        ) {

          throw new Error(
            'Google Maps library unavailable'
          );

        }


        if (
          !this.markerLibrary
            ?.AdvancedMarkerElement
        ) {

          throw new Error(
            'AdvancedMarkerElement unavailable'
          );

        }


        if (
          !this.routesLibrary?.Route
        ) {

          throw new Error(
            'Google Routes library unavailable'
          );

        }


        this.googleMapsLoaded =
          true;

      })();


    try {

      await this.googleMapsLoading;

    } catch (
      error
    ) {

      this.googleMapsLoading =
        null;

      throw error;

    }

  }


  /* ===================================================
     INITIALIZE MAP
  =================================================== */

  private async initializeMap():
    Promise<void> {


    if (
      this.map
    ) {

      return;

    }


    if (
      !this.mapsLibrary
    ) {

      throw new Error(
        'Maps library is not loaded'
      );

    }


    const element =
      await this.waitForMapContainer(
        'map'
      );


    this.mapElement =
      element;


    const mapId =
      String(

        (environment as any)
          ?.googleMapsMapId

        ||

        'DEMO_MAP_ID'

      );


    this.map =
      new this.mapsLibrary.Map(

        element,

        {

          center:
            this.defaultSchoolLocation,

          zoom:
            13,

          mapId,

          mapTypeControl:
            false,

          streetViewControl:
            false,

          fullscreenControl:
            true,

          zoomControl:
            true,

          gestureHandling:
            'greedy',

          clickableIcons:
            false,

          fullscreenControlOptions: {

            position:
              google.maps.ControlPosition.RIGHT_TOP

          }

        }

      );


    this.createSchoolMarker();


    this.mapLoading =
      false;


    setTimeout(

      () => {

        this.triggerMapResize();

      },

      200

    );

  }


  /* ===================================================
     WAIT FOR MAP
  =================================================== */

  private async waitForMapContainer(

    elementId: string,

    attempts = 30

  ): Promise<HTMLElement> {


    for (
      let index = 0;
      index < attempts;
      index++
    ) {


      const element =
        document.getElementById(
          elementId
        );


      if (

        element &&

        element.offsetWidth > 0 &&

        element.offsetHeight > 0

      ) {

        return element;

      }


      await new Promise<void>(

        resolve => {

          setTimeout(
            resolve,
            50
          );

        }

      );

    }


    throw new Error(

      `${elementId} map container is not ready`

    );

  }


  /* ===================================================
     SCHOOL MARKER
  =================================================== */

  private createSchoolMarker(): void {


    if (

      !this.map ||

      !this.markerLibrary
        ?.AdvancedMarkerElement

    ) {

      return;

    }


    const pin =
      this.createPin(
        '#2563eb',
        'S'
      );


    if (
      this.schoolMarker
    ) {

      this.schoolMarker.position =
        this.schoolLocation;

      return;

    }


    this.schoolMarker =
      new this.markerLibrary
        .AdvancedMarkerElement({

          map:
            this.map,

          position:
            this.schoolLocation,

          title:
            'Lisieux Matriculation School',

          content:
            pin,

          zIndex:
            50

        });

  }


  /* ===================================================
     HOME MARKER
  =================================================== */

  private createHomeMarker(): void {


    if (

      !this.map ||

      !this.markerLibrary
        ?.AdvancedMarkerElement ||

      !this.homeLocation

    ) {

      return;

    }


    const pin =
      this.createPin(
        '#16a34a',
        'H'
      );


    if (
      this.homeMarker
    ) {

      this.homeMarker.position =
        this.homeLocation;

      return;

    }


    this.homeMarker =
      new this.markerLibrary
        .AdvancedMarkerElement({

          map:
            this.map,

          position:
            this.homeLocation,

          title:
            'Registered Home Address',

          content:
            pin,

          zIndex:
            50

        });

  }


  /* ===================================================
     CREATE PIN
  =================================================== */

  private createPin(

    background: string,

    label: string

  ): HTMLElement {


    const element =
      document.createElement(
        'div'
      );


    element.style.width =
      '38px';


    element.style.height =
      '38px';


    element.style.borderRadius =
      '50%';


    element.style.background =
      background;


    element.style.border =
      '3px solid #ffffff';


    element.style.boxShadow =
      '0 3px 10px rgba(0,0,0,.30)';


    element.style.display =
      'flex';


    element.style.alignItems =
      'center';


    element.style.justifyContent =
      'center';


    element.style.color =
      '#ffffff';


    element.style.fontWeight =
      '800';


    element.style.fontSize =
      '14px';


    element.style.fontFamily =
      'Arial, sans-serif';


    element.textContent =
      label;


    return element;

  }


  /* ===================================================
     VAN MARKER
  =================================================== */

  private createVanMarker(
    position: LatLng
  ): void {


    if (

      !this.map ||

      !this.markerLibrary
        ?.AdvancedMarkerElement

    ) {

      return;

    }


    /* Existing marker */

    if (
      this.vanMarker
    ) {

      this.vanMarker.position =
        position;

      return;

    }


    /* Create marker */

    const vanElement =
      document.createElement(
        'div'
      );


    vanElement.className =
      'school-van-marker';


    vanElement.innerHTML = `

      <div class="van-marker-pulse"></div>

      <div class="van-marker-body">

        <span class="van-marker-icon">
          🚐
        </span>

      </div>

    `;


    this.vanMarker =
      new this.markerLibrary
        .AdvancedMarkerElement({

          map:
            this.map,

          position,

          title:
            'School Van',

          content:
            vanElement,

          zIndex:
            100

        });

  }


  /* ===================================================
     GET ROUTE DESTINATION
  =================================================== */

  private getRouteDestination():
    LatLng | null {


    /*
     * MORNING
     *
     * Van → School
     */

    if (
      this.rideType === 'morning'
    ) {

      return this.schoolLocation;

    }


    /*
     * EVENING
     *
     * Van → Registered Home
     */

    if (
      this.rideType === 'evening'
    ) {

      return this.homeLocation;

    }


    return null;

  }


  /* ===================================================
     CALCULATE LIVE ROUTE
  =================================================== */

  private async calculateLiveRoute(
    origin: LatLng,
    force = false
  ): Promise<void> {


    const destination =
      this.getRouteDestination();


    /*
     * No destination yet.
     */

    if (
      !destination
    ) {

      this.routeMessage =
        this.rideType === 'morning'

          ? 'Waiting for school location...'

          : 'Waiting for registered home location...';

      return;

    }


    /*
     * Don't calculate two routes simultaneously.
     */

    if (
      this.routeLoading
    ) {

      return;

    }


    const now =
      Date.now();


    /*
     * Distance from previous route origin.
     */

    const movedDistance =
      this.lastRouteOrigin

        ? this.calculateDistanceMeters(

            this.lastRouteOrigin,

            origin

          )

        : Number.MAX_SAFE_INTEGER;


    /*
     * Don't refresh unless:
     *
     * 1. Forced
     * OR
     * 2. Van moved at least 100m
     * OR
     * 3. First route
     *
     * AND
     *
     * Minimum 15 seconds have passed.
     */

    if (

      !force &&

      this.lastRouteOrigin &&

      movedDistance <
        this.routeRefreshDistanceMeters

    ) {

      return;

    }


    if (

      !force &&

      this.lastRouteCalculationTime > 0 &&

      now -
      this.lastRouteCalculationTime <
      this.routeRefreshIntervalMs

    ) {

      return;

    }


    if (
      !this.routesLibrary?.Route ||
      !this.map
    ) {

      return;

    }


    this.routeLoading =
      true;


    this.routeMessage =

      this.rideType === 'morning'

        ? 'Finding road to school...'

        : 'Finding road to registered home...';


    try {


      console.log(
        '🗺️ LIVE ROUTE CALCULATION',
        {

          rideType:
            this.rideType,

          origin,

          destination

        }
      );


      const result =
        await this.routesLibrary.Route
          .computeRoutes({

            origin,

            destination,

            travelMode:
              'DRIVING',

            fields: [

              'path',

              'viewport',

              'localizedValues'

            ]

          });


      const routes =
        result?.routes || [];


      if (
        routes.length === 0
      ) {

        throw new Error(
          'No road route found'
        );

      }


      const route =
        routes[0];


      /*
       * Remove old blue route.
       */

      this.clearRoute();


      /*
       * Create new Google road route.
       */

      const polylines =
        route.createPolylines({

          polylineOptions: {

            strokeColor:
              '#1a73e8',

            strokeOpacity:
              0.95,

            strokeWeight:
              6,

            clickable:
              false,

            zIndex:
              2

          }

        });


      for (
        const polyline of polylines
      ) {

        polyline.setMap(
          this.map
        );


        this.routePolylines.push(
          polyline
        );

      }


      /*
       * Save route state.
       */

      this.routeLoaded =
        true;


      this.lastRouteOrigin = {

        lat:
          origin.lat,

        lng:
          origin.lng

      };


      this.lastRouteCalculationTime =
        Date.now();


      this.routeMessage =

        this.rideType === 'morning'

          ? 'Van → School route ready'

          : 'Van → Registered Home route ready';


      /*
       * Fit route on first calculation only.
       *
       * We don't want the map constantly zooming
       * every time GPS changes.
       */

      if (
        !this.lastRouteOrigin
      ) {

        if (
          route.viewport
        ) {

          this.map.fitBounds(

            route.viewport,

            {

              top:
                90,

              right:
                35,

              bottom:
                110,

              left:
                35

            }

          );

        }

      }


      console.log(
        '✅ LIVE BLUE ROAD ROUTE READY'
      );


    } catch (
      error
    ) {


      console.error(
        '❌ Live route calculation failed:',
        error
      );


      this.routeMessage =

        this.rideType === 'morning'

          ? 'Unable to find road to school'

          : 'Unable to find road to home';


    } finally {

      this.routeLoading =
        false;

    }

  }


  /* ===================================================
     DISTANCE CALCULATION
  =================================================== */

  private calculateDistanceMeters(

    point1: LatLng,

    point2: LatLng

  ): number {


    const earthRadius =
      6371000;


    const lat1 =
      this.toRadians(
        point1.lat
      );


    const lat2 =
      this.toRadians(
        point2.lat
      );


    const deltaLat =
      this.toRadians(

        point2.lat -
        point1.lat

      );


    const deltaLng =
      this.toRadians(

        point2.lng -
        point1.lng

      );


    const a =

      Math.sin(
        deltaLat / 2
      ) ** 2

      +

      Math.cos(lat1) *

      Math.cos(lat2) *

      Math.sin(
        deltaLng / 2
      ) ** 2;


    const c =

      2 *

      Math.atan2(

        Math.sqrt(a),

        Math.sqrt(
          1 - a
        )

      );


    return earthRadius * c;

  }


  /* ===================================================
     RADIANS
  =================================================== */

  private toRadians(
    value: number
  ): number {

    return value *
      Math.PI /
      180;

  }


  /* ===================================================
     CLEAR ROUTE
  =================================================== */

  private clearRoute(): void {


    for (
      const polyline of
      this.routePolylines
    ) {

      polyline.setMap(
        null
      );

    }


    this.routePolylines =
      [];

  }


  /* ===================================================
     FETCH INITIAL LOCATION
  =================================================== */

  private fetchInitialLocation(): void {


    if (

      !this.parentId ||

      !this.driverId ||

      this.restRequestInProgress ||

      this.isDestroyed

    ) {

      return;

    }


    this.restRequestInProgress =
      true;


    this.parentService
      .getLiveLocation(

        this.driverId,

        this.rideType,

        this.parentId

      )
      .subscribe({

        /* -------------------------------------------
           SUCCESS
        ------------------------------------------- */

        next:
          (response: any) => {


            this.restRequestInProgress =
              false;


            console.log(
              '📍 REST LIVE LOCATION',
              response
            );


            const data:
              LiveLocationData =

              response?.data

              ||

              response;


            /*
             * First get registered locations.
             */

            this.extractRouteData(
              data
            );


            /*
             * Then process current GPS.
             */

            this.applyLocation(
              data
            );


            /*
             * If tracking isn't currently active,
             * don't pretend it is.
             */

            if (
              response?.trackingAvailable === false
            ) {

              this.trackingStarted =
                false;

            }

          },


        /* -------------------------------------------
           ERROR
        ------------------------------------------- */

        error:
          (error: any) => {


            this.restRequestInProgress =
              false;


            console.error(
              '❌ REST live location error:',
              error
            );


            this.routeMessage =

              error?.status === 404

                ? 'Ride location not available'

                : 'Waiting for van location...';

          }

      });

  }


  /* ===================================================
     EXTRACT ROUTE DATA
  =================================================== */

  private extractRouteData(
    data: LiveLocationData
  ): void {


    const route =
      data?.route;


    if (
      !route
    ) {

      return;

    }


    /* -----------------------------------------------
       REGISTERED HOME
    ------------------------------------------------ */

    const home =
      this.normalizeRouteLocation(

        route.homeLocation

        ??

        route.pickupLocation

      );


    /* -----------------------------------------------
       SCHOOL
    ------------------------------------------------ */

    const school =
      this.normalizeRouteLocation(

        route.schoolLocation

      );


    /* -----------------------------------------------
       SAVE HOME
    ------------------------------------------------ */

    if (
      home
    ) {

      this.homeLocation =
        home;

    }


    /* -----------------------------------------------
       SAVE SCHOOL
    ------------------------------------------------ */

    if (
      school
    ) {

      this.schoolLocation =
        school;

    }


    /* -----------------------------------------------
       UPDATE MARKERS
    ------------------------------------------------ */

    this.createSchoolMarker();


    this.createHomeMarker();


    /*
     * If we already have the van GPS,
     * calculate the correct live route.
     */

    if (

      this.lastLatitude !== null &&

      this.lastLongitude !== null

    ) {

      void this.calculateLiveRoute(

        {

          lat:
            this.lastLatitude,

          lng:
            this.lastLongitude

        },

        true

      );

    }

  }


  /* ===================================================
     NORMALIZE LOCATION
  =================================================== */

  private normalizeRouteLocation(
    value: any
  ): LatLng | null {


    if (
      !value
    ) {

      return null;

    }


    const latitude =
      Number(

        value.latitude

        ??

        value.lat

      );


    const longitude =
      Number(

        value.longitude

        ??

        value.lng

      );


    if (

      !Number.isFinite(
        latitude
      )

      ||

      !Number.isFinite(
        longitude
      )

    ) {

      return null;

    }


    return {

      lat:
        latitude,

      lng:
        longitude

    };

  }


  /* ===================================================
     APPLY LIVE LOCATION
  =================================================== */

  private applyLocation(
    location: any
  ): void {


    if (

      !location ||

      this.isDestroyed

    ) {

      return;

    }


    /* -----------------------------------------------
       LATITUDE
    ------------------------------------------------ */

    const latitude =
      Number(

        location.latitude

        ??

        location.lat

      );


    /* -----------------------------------------------
       LONGITUDE
    ------------------------------------------------ */

    const longitude =
      Number(

        location.longitude

        ??

        location.lng

      );


    if (

      !Number.isFinite(
        latitude
      )

      ||

      !Number.isFinite(
        longitude
      )

    ) {

      return;

    }


    /* -----------------------------------------------
       SAVE CURRENT GPS
    ------------------------------------------------ */

    this.lastLatitude =
      latitude;


    this.lastLongitude =
      longitude;


    /* -----------------------------------------------
       TIMESTAMP
    ------------------------------------------------ */

    const timestampValue =

      location.timestamp

      ??

      location.updatedAt;


    const timestamp =

      timestampValue

        ? new Date(
            timestampValue
          )

        : new Date();


    this.lastLocationTime =

      Number.isNaN(
        timestamp.getTime()
      )

        ? new Date()

        : timestamp;


    /* -----------------------------------------------
       VAN MARKER
    ------------------------------------------------ */

    const vanPosition:
      LatLng = {

      lat:
        latitude,

      lng:
        longitude

    };


    this.createVanMarker(
      vanPosition
    );


    /* -----------------------------------------------
       TRACKING LIVE
    ------------------------------------------------ */

    this.trackingStarted =
      true;


    /* -----------------------------------------------
       FOLLOW VAN
    ------------------------------------------------ */

    this.followVan(
      vanPosition
    );


    /* -----------------------------------------------
       CALCULATE LIVE ROUTE
    ------------------------------------------------ */

    void this.calculateLiveRoute(
      vanPosition
    );

  }


  /* ===================================================
     FOLLOW VAN
  =================================================== */

  private followVan(
    position: LatLng
  ): void {


    if (
      !this.map
    ) {

      return;

    }


    /*
     * First GPS position.
     */

    if (
      !this.lastLatitude ||
      !this.lastLongitude
    ) {

      this.map.panTo(
        position
      );


      if (
        (this.map.getZoom() ?? 0) < 15
      ) {

        this.map.setZoom(
          15
        );

      }


      return;

    }


    /*
     * Keep the van visible.
     */

    this.map.panTo(
      position
    );

  }


  /* ===================================================
     SOCKET LISTENERS
  =================================================== */

  private registerSocketListeners(): void {


    /* =================================================
       TRACKING STARTED
    ================================================= */

    this.trackingStartedSubscription =
      this.socketService
        .trackingStarted()
        .subscribe(

          (data: any) => {


            console.log(
              '🟢 TRACKING STARTED',
              data
            );


            if (
              !this.matchesTrackingEvent(
                data
              )
            ) {

              return;

            }


            const location =

              data?.location

              ??

              data?.data

              ??

              data;


            /*
             * Get route information if included.
             */

            this.extractRouteData(
              location
            );


            /*
             * Get first GPS.
             */

            this.applyLocation(
              location
            );

          }

        );


    /* =================================================
       LOCATION UPDATED
    ================================================= */

    this.locationSubscription =
      this.socketService
        .listenLocationUpdated()
        .subscribe(

          (data: any) => {


            if (
              !this.matchesTrackingEvent(
                data
              )
            ) {

              return;

            }


            const location =

              data?.location

              ??

              data?.data

              ??

              data;


            /*
             * Route data may be included in
             * socket events.
             */

            this.extractRouteData(
              location
            );


            /*
             * Update van.
             */

            this.applyLocation(
              location
            );

          }

        );


    /* =================================================
       STUDENT STATUS
    ================================================= */

    this.statusSubscription =
      this.socketService
        .listenStudentStatusUpdated()
        .subscribe(

          (data: any) => {


            if (
              !this.matchesParentEvent(
                data
              )
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

                data?.status

                ||

                ''

              )
                .trim()
                .toLowerCase();


            console.log(
              '👨‍🎓 STUDENT STATUS',
              status
            );


            /*
             * Morning pickup.
             *
             * The destination remains school.
             */

            if (

              status ===
                'picked_up'

              ||

              status ===
                'picked'

            ) {

              this.trackingStarted =
                true;


              if (

                this.lastLatitude !== null &&

                this.lastLongitude !== null

              ) {

                void this.calculateLiveRoute(

                  {

                    lat:
                      this.lastLatitude,

                    lng:
                      this.lastLongitude

                  },

                  true

                );

              }


              return;

            }


            /*
             * Evening student picked from school.
             *
             * Now the destination is the registered home.
             */

            if (

              status ===
                'picked_from_school'

              ||

              (
                this.rideType ===
                  'evening'

                &&

                status ===
                  'picked_up'
              )

            ) {

              this.trackingStarted =
                true;


              if (

                this.lastLatitude !== null &&

                this.lastLongitude !== null

              ) {

                void this.calculateLiveRoute(

                  {

                    lat:
                      this.lastLatitude,

                    lng:
                      this.lastLongitude

                  },

                  true

                );

              }


              return;

            }


            /*
             * Drop completed.
             */

            if (

              status ===
                'dropped_at_school'

              ||

              status ===
                'dropped_at_home'

              ||

              status ===
                'dropped'

            ) {

              this.handleTrackingStopped();

            }

          }

        );


    /* =================================================
       TRACKING STOPPED
    ================================================= */

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
              !this.matchesParentEvent(
                data
              )
            ) {

              return;

            }


            this.handleTrackingStopped();

          }

        );


    /* =================================================
       RIDE ENDED
    ================================================= */

    this.rideEndedSubscription =
      this.socketService
        .listenRideEnded()
        .subscribe(

          (data: any) => {


            if (

              data?.driverId &&

              String(
                data.driverId
              ) !==

              String(
                this.driverId
              )

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


            this.handleTrackingStopped();

          }

        );

  }


  /* ===================================================
     MATCH TRACKING EVENT
  =================================================== */

  private matchesTrackingEvent(
    data: any
  ): boolean {


    if (
      !data
    ) {

      return false;

    }


    if (

      data.parentId &&

      String(
        data.parentId
      ) !==

      String(
        this.parentId
      )

    ) {

      return false;

    }


    if (

      data.driverId &&

      String(
        data.driverId
      ) !==

      String(
        this.driverId
      )

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


  /* ===================================================
     MATCH PARENT EVENT
  =================================================== */

  private matchesParentEvent(
    data: any
  ): boolean {


    if (
      !data
    ) {

      return false;

    }


    if (

      data.parentId &&

      String(
        data.parentId
      ) !==

      String(
        this.parentId
      )

    ) {

      return false;

    }


    if (

      data.driverId &&

      String(
        data.driverId
      ) !==

      String(
        this.driverId
      )

    ) {

      return false;

    }


    return true;

  }


  /* ===================================================
     FALLBACK POLLING
  =================================================== */

  private startFallbackPolling(): void {


    this.stopFallbackPolling();


    this.trackingInterval =
      setInterval(

        () => {


          if (
            this.isDestroyed
          ) {

            return;

          }


          /*
           * Only poll while tracking.
           */

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


  /* ===================================================
     STOP POLLING
  =================================================== */

  private stopFallbackPolling(): void {


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


  /* ===================================================
     TRACKING STOPPED
  =================================================== */

  private handleTrackingStopped(): void {


    if (
      this.isDestroyed
    ) {

      return;

    }


    this.trackingStarted =
      false;


    this.stopFallbackPolling();


    setTimeout(

      () => {


        if (
          !this.isDestroyed
        ) {

          this.goToDashboard();

        }

      },

      500

    );

  }


  /* ===================================================
     GO DASHBOARD
  =================================================== */

  private goToDashboard(): void {


    if (
      this.isDestroyed
    ) {

      return;

    }


    this.router.navigateByUrl(

      '/parent/dashboard',

      {

        replaceUrl:
          true

      }

    );

  }


  /* ===================================================
     NORMALIZE RIDE TYPE
  =================================================== */

  private normalizeRideType(
    value: any
  ):
    RideType | null {


    if (
      !value
    ) {

      return null;

    }


    const normalized =
      String(
        value
      )
        .trim()
        .toLowerCase();


    if (

      normalized ===
        'morning'

      ||

      normalized ===
        'pickup'

      ||

      normalized ===
        'home_to_school'

    ) {

      return 'morning';

    }


    if (

      normalized ===
        'evening'

      ||

      normalized ===
        'return'

      ||

      normalized ===
        'school_to_home'

    ) {

      return 'evening';

    }


    return null;

  }


  /* ===================================================
     MAP RESIZE
  =================================================== */

  private triggerMapResize(): void {


    if (
      !this.map
    ) {

      return;

    }


    google.maps.event.trigger(

      this.map,

      'resize'

    );

  }


  /* ===================================================
     RETRY
  =================================================== */

  retryMap(): void {


    if (
      this.isDestroyed
    ) {

      return;

    }


    this.mapError =
      false;


    this.mapLoading =
      true;


    this.routeLoaded =
      false;


    this.routeLoading =
      false;


    this.routeMessage =
      '';


    this.lastRouteOrigin =
      null;


    this.lastRouteCalculationTime =
      0;


    this.clearRoute();


    void this.retryMapInitialization();

  }


  /* ===================================================
     RETRY INITIALIZATION
  =================================================== */

  private async retryMapInitialization():
    Promise<void> {


    try {


      await this.loadGoogleMaps();


      if (
        !this.map
      ) {

        await this.initializeMap();

      }


      this.fetchInitialLocation();


      this.startFallbackPolling();


    } catch (
      error
    ) {


      console.error(
        '❌ Map retry failed',
        error
      );


      this.mapError =
        true;


      this.mapLoading =
        false;

    }

  }


  /* ===================================================
     DESTROY
  =================================================== */

  ngOnDestroy(): void {


    this.isDestroyed =
      true;


    this.stopFallbackPolling();


    /* Socket subscriptions */

    this.trackingStartedSubscription
      ?.unsubscribe();


    this.trackingStoppedSubscription
      ?.unsubscribe();


    this.locationSubscription
      ?.unsubscribe();


    this.statusSubscription
      ?.unsubscribe();


    this.rideEndedSubscription
      ?.unsubscribe();


    /* Route */

    this.clearRoute();


    /* Van */

    if (
      this.vanMarker
    ) {

      this.vanMarker.map =
        null;

      this.vanMarker =
        null;

    }


    /* Home */

    if (
      this.homeMarker
    ) {

      this.homeMarker.map =
        null;

      this.homeMarker =
        null;

    }


    /* School */

    if (
      this.schoolMarker
    ) {

      this.schoolMarker.map =
        null;

      this.schoolMarker =
        null;

    }


    /* Map */

    this.map =
      null;


    this.mapElement =
      null;


    /* Socket */

    this.socketService
      .disconnect();

  }

}