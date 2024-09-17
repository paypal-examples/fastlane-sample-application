import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaymentFlexibleComponent } from './payment-flexible.component';

describe('PaymentComponent', () => {
  let component: PaymentFlexibleComponent;
  let fixture: ComponentFixture<PaymentFlexibleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PaymentFlexibleComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaymentFlexibleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
