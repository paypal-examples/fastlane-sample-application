import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { ComponentFormState } from 'src/app/interfaces/types';

export interface BillingAddressData {
  addressLine1: string,
  addressLine2: string,
  adminArea2: string,
  adminArea1: string,
  postalCode: string,
  countryCode: string,
};

@Component({
  selector: 'app-billing',
  templateUrl: './billing.component.html',
  styleUrls: ['../../app.component.css']
})
export class BillingComponent {

  @ViewChild("billingFormElement")
  public billingFormElement!: ElementRef<HTMLFormElement>;

  @Input()
  public set billingAddressData(billing: BillingAddressData | undefined) {
    this.billingForm.reset();
    this.updateBillingForm(billing);
    this._billingAddressData = billing;
  };

  public get billingAddressData(): BillingAddressData | undefined {
    return this._billingAddressData
  }

  public billingFormState = ComponentFormState.Valid;

  public get billingFormInvalid(): boolean {
    return this.billingFormState === ComponentFormState.Invalid;
  }

  @Input()
  public set isActive(active: boolean) {
    if (active) {
      this.visited = true;
    }

    this._isActive = active;
  }

  public get isActive(): boolean {
    return this._isActive;
  }

  @Output()
  public editClickEvent = new EventEmitter<void>();

  @Output()
  public billingChangeEvent = new EventEmitter<BillingAddressData>();

  public billingForm = new FormGroup({
    streetAddress: new FormControl(""),
    extendedAddress: new FormControl(""),
    locality: new FormControl(""),
    region: new FormControl(""),
    postalCode: new FormControl(""),
    countryCodeAlpha2: new FormControl(""),
  });

  public visited = false;

  private _isActive = false;

  private _billingAddressData: BillingAddressData | undefined;

  public onContinueButtonClick(): void {

    if (!this.billingForm.valid) {
      this.billingFormState = ComponentFormState.Invalid;
      this.billingFormElement.nativeElement.reportValidity();
      return;
    }

    const form = this.billingForm.value;

    const billingData: BillingAddressData = {
      addressLine1: form.streetAddress || "",
      addressLine2: form.extendedAddress || "",
      adminArea2: form.locality || "",
      adminArea1: form.region || "",
      postalCode: form.postalCode || "",
      countryCode: form.countryCodeAlpha2 || ""
    };

    this.billingAddressData = billingData;

    this.billingChangeEvent.emit(billingData);

    this.billingFormState = ComponentFormState.Valid;
  }

  public updateBillingForm(billingData: BillingAddressData | undefined) {

    if (!billingData) {
      return;
    }

    const params = {
      streetAddress: billingData.addressLine1,
      extendedAddress: billingData.addressLine2,
      locality: billingData.adminArea2,
      region: billingData.adminArea1,
      postalCode: billingData.postalCode,
      countryCodeAlpha2: billingData.countryCode,
    };

    this.billingForm.setValue(params);
  }

  public onEditButtonClick() {
    this.editClickEvent.emit();
  }
}
