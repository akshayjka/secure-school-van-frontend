import { Injectable } from '@angular/core';

import { RideService } from '../services/ride';

@Injectable({
  providedIn: 'root'
})
export class LocationService {

  private watchId: any;

  constructor(
    private rideService: RideService
  ) {}

  startTracking(driverId: string) {

    this.watchId = setInterval(() => {

      navigator.geolocation.getCurrentPosition(

        (position) => {

          this.rideService
            .updateLocation({

              driverId,

              latitude:
                position.coords.latitude,

              longitude:
                position.coords.longitude,

              timestamp:
                new Date()

            })

            .subscribe();

        },

        (error) => {

          console.error(
            'GPS Error',
            error
          );

        }

      );

    }, 15000);

  }

  stopTracking() {

    if (this.watchId) {

      clearInterval(this.watchId);

      this.watchId = null;

    }

  }

}