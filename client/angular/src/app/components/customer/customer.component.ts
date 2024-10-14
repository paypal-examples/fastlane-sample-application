import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ShippingAddressData } from '../shipping/shipping.component';
import { BillingAddressData } from '../billing/billing.component';
import { ComponentFormState } from 'src/app/interfaces/types';

export interface CustomerResponse {
  authenticated: boolean;
  email: string;
  name: string;
  shippingAddress?: ShippingAddressData;
  billingAddress?: BillingAddressData;
  paymentToken: { [key: string]: any } | null;
}

@Component({
  selector: 'app-customer',
  templateUrl: './customer.component.html',
  styleUrls: ['../../app.component.css']
})
export class CustomerComponent implements OnInit {

  @ViewChild('emailInputElement')
  public emailInputElement!: ElementRef<HTMLInputElement>;

  @Input()
  public watermarkComponent: { render: Function } = {
    render: () => { }
  };

  @Input()
  public identity: { lookupCustomerByEmail: Function; triggerAuthenticationFlow: Function } = {
    lookupCustomerByEmail: () => { },
    triggerAuthenticationFlow: () => { }
  };

  @Input()
  public set isActive(active: boolean) {
    if (active) {
      this.visited = true;
      this.watermarkComponent.render("#watermark-container");
    }

    this._isActive = active;
  }

  @Output()
  public editClickEvent = new EventEmitter<void>();

  @Output()
  public emailChangeEvent = new EventEmitter<CustomerResponse>();

  public visited = true;

  public email: FormControl = new FormControl("");

  public currentEmail: string = "";

  public isContinueButtonEnabled = false;

  public customerFormState = ComponentFormState.Valid;

  private _isActive = false;

  public get isActive(): boolean {
    return this._isActive;
  }

  public get customerFormInvalid(): boolean {
    return this.customerFormState === ComponentFormState.Invalid;
  }

  public ngOnInit(): void {
    this.isContinueButtonEnabled = true;
  }

  public onEditButtonClick(): void {
    this.editClickEvent.emit();
  }

  public async onContinueButtonClick(event: Event): Promise<void> {
    event.preventDefault();

    if (!this.email.valid) {
      this.customerFormState = ComponentFormState.Invalid;
      this.emailInputElement.nativeElement.reportValidity();
      return;
    }

    this.isContinueButtonEnabled = false;

    this.currentEmail = this.email.value;

    let memberAuthenticatedSuccessfully = false;
    let name = undefined;
    let shippingAddress = undefined;
    let billingAddress = undefined;
    let paymentToken = undefined;

    try {
      const { customerContextId } = await this.identity.lookupCustomerByEmail(this.currentEmail);

      if (customerContextId) {
        const authResponse = await this.identity.triggerAuthenticationFlow(customerContextId);

        console.log("Auth response:", authResponse);

        if (authResponse?.authenticationState === "succeeded") {

          const { profileData } = authResponse;

          memberAuthenticatedSuccessfully = true;
          name = profileData.name;
          shippingAddress = profileData.shippingAddress;
          paymentToken = profileData.card;
          billingAddress = paymentToken?.paymentSource.card.billingAddress
        }
      } else {
        console.log("No customerContextId");
      }

      this.emailChangeEvent.emit({
        authenticated: memberAuthenticatedSuccessfully,
        email: this.currentEmail,
        name,
        shippingAddress,
        billingAddress,
        paymentToken
      });

      this.customerFormState = ComponentFormState.Valid;
    } finally {
      this.isContinueButtonEnabled = true;
    }
  }
}
