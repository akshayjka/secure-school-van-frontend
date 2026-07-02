import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DriversPage } from './drivers.page';

describe('DriversPage', () => {
  let component: DriversPage;
  let fixture: ComponentFixture<DriversPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DriversPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
