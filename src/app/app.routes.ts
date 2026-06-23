import { Routes } from '@angular/router';

export const routes: Routes = [

  {
    path: '',
    redirectTo: 'auth/registration',
    pathMatch: 'full'
  },

  {
    path: 'home',
    loadComponent: () =>
      import('./home/home.page')
        .then(m => m.HomePage),
  },

  {
    path: 'auth/registration',
    loadComponent: () =>
      import('./pages/auth/registration/registration.page')
        .then(m => m.RegistrationPage)
  },

  {
    path: 'auth/login',
    loadComponent: () =>
      import('./pages/auth/login/login.page')
        .then(m => m.LoginPage)
  },

  {
    path: 'driver/dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.page')
        .then(m => m.DashboardPage)
  },

  {
    path: 'add-parent',
    loadComponent: () =>
      import('./pages/parent/add-parent/add-parent.page')
        .then(m => m.AddParentPage)
  },


  {
    path: 'add-driver',
    loadComponent: () => import('./pages/parent/add-driver/add-driver.page').then( m => m.AddDriverPage)
  },
    {
    path: '**',
    redirectTo: 'auth/registration'
  },

];