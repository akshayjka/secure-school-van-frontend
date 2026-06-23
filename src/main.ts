import { bootstrapApplication } from '@angular/platform-browser';

import { provideRouter } from '@angular/router';

import { provideHttpClient } from '@angular/common/http';

import { provideIonicAngular } from '@ionic/angular/standalone';

import { routes } from './app/app.routes';

import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {

  providers: [

    provideIonicAngular(),

    provideRouter(routes),

    provideHttpClient()

  ]

});