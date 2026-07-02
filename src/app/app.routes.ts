import { Routes } from '@angular/router';

export const routes: Routes = [

  //   {
  //   path: '**',
  //   redirectTo: 'auth/registration'
  // },

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

  // {
  //   path: 'drivers/dashboard',
  //   loadComponent: () =>
  //     import('./pages/dashboard/dashboard.page')
  //       .then(m => m.DashboardPage)
  // },

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
    path: 'driver/dashboard',
    loadComponent: () => import('./pages/driver/dashboard/dashboard.page').then( m => m.DashboardPage)
  },
  {
    path: 'parent/dashboard',
    loadComponent: () => import('./pages/parent/dashboard/dashboard.page').then( m => m.DashboardPage)
  },
  {
    path: 'admin/dashboard',
    loadComponent: () => import('./pages/admin/dashboard/dashboard.page').then( m => m.DashboardPage)
  },
  {
    path: 'admin/drivers',
    loadComponent: () => import('./pages/admin/drivers/drivers.page').then( m => m.DriverPage)
  },
  {
  path: 'admin/parents',
  loadComponent: () =>
    import('./pages/admin/parents/parents.page')
      .then(m => m.ParentsPage)
},
{
  path: 'admin/parents/add',
  loadComponent: () =>
    import('./pages/admin/add-parent/add-parent.component')
      .then(m => m.AddParentComponent)
},
  {
  path: 'admin/edit-driver/:id',
  loadComponent: () =>
    import('./pages/admin/edit-driver/edit-driver.page')
      .then(m => m.EditDriverPage)
},
{
  path: 'admin/parents/edit/:id',
  loadComponent: () =>
    import('./pages/admin/edit-parent/edit-parent.page')
      .then(m => m.EditParentPage)
},

  {
  path: 'admin/add-driver',
  loadComponent: () =>
    import('./pages/admin/add-driver/add-driver.page')
      .then(m => m.AddDriverPage)
},
  {
    path: 'live-tracking',
    loadComponent: () => import('./pages/parent/live-tracking/live-tracking.page').then( m => m.LiveTrackingPage)
  },
];