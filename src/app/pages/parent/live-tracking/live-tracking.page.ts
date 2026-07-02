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

  marker:any;

 ngAfterViewInit() {

  setTimeout(() => {

    this.loadMap();

    this.map.invalidateSize();

  }, 300);

}
  loadMap() {

    this.map = L.map('map').setView( [11.0168, 76.9558], 15);

    L.tileLayer( 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',  { maxZoom: 19 } ).addTo(this.map);

    this.marker = L.marker( [11.0168, 76.9558] ).addTo(this.map);

    setInterval(() => {

  this.parentService

  .getLiveLocation(

    'DRV1782128739598'

  )

  .subscribe((res:any)=>{

    this.marker.setLatLng([

      res.latitude,

      res.longitude

    ]);
    this.map.panTo([ res.latitude,  res.longitude]);
  });

},15000);

  }
}
