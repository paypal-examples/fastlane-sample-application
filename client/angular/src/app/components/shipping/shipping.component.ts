import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { ComponentFormState } from 'src/app/interfaces/types';

export interface ShippingAddressData {
    companyName: string;
    address: {
        addressLine1: string;
        addressLine2: string;
        adminArea2: string;
        adminArea1: string;
        postalCode: string;
        countryCode: string;
    },
    name: {
        firstName: string;
        lastName: string;
        fullName: string;
    },
    phoneNumber: {
        countryCode: string;
        nationalNumber: string;
    },
};

@Component({
    selector: 'app-shipping',
    templateUrl: './shipping.component.html',
    styleUrls: ['../../app.component.css']
})
export class ShippingComponent {

    @ViewChild("shippingFormElement")
    public shippingFormElement!: ElementRef<HTMLFormElement>;

    @Input()
    public isAuthenticated = false;

    @Input()
    public set shippingAddressData(shipping: ShippingAddressData | undefined) {
        this.shippingForm.reset();
        this.updateShippingForm(shipping);
        this._shippingAddressData = shipping;
    };

    public get shippingAddressData(): ShippingAddressData | undefined {
        return this._shippingAddressData
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
    public shippingChangeEvent = new EventEmitter<ShippingAddressData>();

    public shippingFormState = ComponentFormState.Valid;

    public get getAddressSummary(): string {
        return this.formatAddressSummary(this.shippingAddressData);
    }

    public get shippingFormInvalid(): boolean {
        return this.shippingFormState === ComponentFormState.Invalid;
    }

    public shippingRequired = new FormControl(true);

    public shippingForm = new FormGroup({
        firstName: new FormControl(""),
        lastName: new FormControl(""),
        company: new FormControl(""),
        streetAddress: new FormControl(""),
        extendedAddress: new FormControl(""),
        locality: new FormControl(""),
        region: new FormControl(""),
        postalCode: new FormControl(""),
        countryCodeAlpha2: new FormControl(""),
        phoneCountryCode: new FormControl(""),
        phoneNumber: new FormControl(""),
    });

    public visited = false;

    private _isActive = false;

    private _shippingAddressData: ShippingAddressData | undefined;

    public onContinueButtonClick(): void {

        if (!this.shippingRequired.value) {
            this.shippingChangeEvent.emit(undefined);
            return;
        }

        if (!this.shippingForm.valid) {
            this.shippingFormState = ComponentFormState.Invalid;
            this.shippingFormElement.nativeElement.reportValidity();
            return;
        }

        const form = this.shippingForm.value;

        const shippingData: ShippingAddressData = {
            companyName: form.company || "",
            address: {
                addressLine1: form.streetAddress || "",
                addressLine2: form.extendedAddress || "",
                adminArea2: form.locality || "",
                adminArea1: form.region || "",
                postalCode: form.postalCode || "",
                countryCode: form.countryCodeAlpha2 || ""
            },
            name: {
                fullName: `${form.firstName || ""} ${form.lastName || ""}`,
                firstName: form.firstName || "",
                lastName: form.lastName || ""
            },
            phoneNumber: {
                countryCode: form.phoneCountryCode || "",
                nationalNumber: form.phoneNumber || ""
            }
        };

        this.shippingAddressData = shippingData;

        this.shippingChangeEvent.emit(shippingData);

        this.shippingFormState = ComponentFormState.Valid;
    }

    public updateShippingForm(shippingData: ShippingAddressData | undefined) {

        const params = {
            firstName: shippingData?.name?.firstName || "",
            lastName: shippingData?.name?.lastName || "",
            company: shippingData?.companyName || "",
            streetAddress: shippingData?.address?.addressLine1 || "",
            extendedAddress: shippingData?.address?.addressLine2 || "",
            locality: shippingData?.address?.adminArea2 || "",
            region: shippingData?.address?.adminArea1 || "",
            postalCode: shippingData?.address?.postalCode || "",
            countryCodeAlpha2: shippingData?.address?.countryCode || "",
            phoneCountryCode: shippingData?.phoneNumber?.countryCode || "",
            phoneNumber: shippingData?.phoneNumber?.nationalNumber || ""
        };

        this.shippingForm.setValue(params);
    }

    public formatAddressSummary(shipping: ShippingAddressData | undefined): string {
        if (!shipping) return "";
        const isNotEmpty = (field: any) => Boolean(field);
        const summary = [
            shipping.name.fullName || [shipping.name.firstName, shipping.name.lastName].filter(isNotEmpty).join(' '),
            shipping.companyName,
            [shipping.address.addressLine1, shipping.address.addressLine2].filter(isNotEmpty).join(', '),
            [
                shipping.address.adminArea2,
                [shipping.address.adminArea1, shipping.address.postalCode].filter(isNotEmpty).join(' '),
                shipping.address.countryCode,
            ].filter(isNotEmpty).join(', '),
            [shipping.phoneNumber.countryCode, shipping.phoneNumber.nationalNumber].filter(isNotEmpty).join(''),
        ];
        return summary.filter(isNotEmpty).join('<br>');
    };

    public onEditButtonClick() {
        this.editClickEvent.emit();
    }
}
