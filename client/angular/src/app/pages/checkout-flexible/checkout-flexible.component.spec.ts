import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckoutFlexibleComponent } from './checkout-flexible.component';

describe('CheckoutFlexibleComponent', () => {
  let component: CheckoutFlexibleComponent;
  let fixture: ComponentFixture<CheckoutFlexibleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CheckoutFlexibleComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CheckoutFlexibleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
