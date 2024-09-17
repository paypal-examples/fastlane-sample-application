import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckoutSwitcherComponent } from './checkout-switcher.component';

describe('CheckoutSwitcherComponent', () => {
  let component: CheckoutSwitcherComponent;
  let fixture: ComponentFixture<CheckoutSwitcherComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckoutSwitcherComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CheckoutSwitcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
