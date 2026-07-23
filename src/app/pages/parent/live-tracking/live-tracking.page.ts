import { AfterViewInit, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
export class LiveTrackingPage implements AfterViewInit  {

  constructor(private parentService:ParentService) { }

 map:any;

  vanMarker: any;

schoolMarker: any;

schoolLat = 11.0168;

schoolLng = 76.9558;

 ngAfterViewInit() {

  setTimeout(() => {

    this.loadMap();

    this.map.invalidateSize();

  }, 300);

}
  loadMap() {

    this.map = L.map('map').setView( [11.0168, 76.9558], 15);

    L.tileLayer( 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',  { maxZoom: 19 } ).addTo(this.map);

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

    setInterval(() => {

  this.parentService

  .getLiveLocation(

    'DRV1782128739598'

  )

  .subscribe((res:any)=>{

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

},15000);

  }
}
