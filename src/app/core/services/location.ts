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

  startTracking(
    driverId: string,
    rideType: 'morning' | 'evening'
  ) {

    this.stopTracking();

    this.watchId = setInterval(() => {

      navigator.geolocation.getCurrentPosition(

        (position) => {

          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;

          this.rideService.updateLocation(
            driverId,
            rideType,
            latitude,
            longitude
          ).subscribe({
            error: (err) => console.error('Location update failed', err)
          });

        },

        (error) => {
          console.error('GPS Error', error);
        },

        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
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