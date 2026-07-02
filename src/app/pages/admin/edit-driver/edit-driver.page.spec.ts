import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditDriverPage } from './edit-driver.page';

describe('EditDriverPage', () => {
  let component: EditDriverPage;
  let fixture: ComponentFixture<EditDriverPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EditDriverPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
