import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddDriverPage } from './add-driver.page';

describe('AddDriverPage', () => {
  let component: AddDriverPage;
  let fixture: ComponentFixture<AddDriverPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AddDriverPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
