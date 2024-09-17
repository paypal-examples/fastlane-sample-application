import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, Inject, OnInit, Renderer2 } from '@angular/core';
import { finalize, Observable } from 'rxjs';
import { lastValueFrom } from 'rxjs/internal/lastValueFrom';
import { BillingAddressData } from 'src/app/components/billing/billing.component';
import { CustomerResponse } from 'src/app/components/customer/customer.component';
import { ShippingAddressData } from 'src/app/components/shipping/shipping.component';
import { CustomWindow } from 'src/app/interfaces/window.interface';
import { SDKService } from 'src/app/services/sdk.service';
import { TransactionService } from 'src/app/services/transaction.service';
import { WINDOW } from 'src/app/services/window.service';

enum Section {
    Customer = 'customer',
    Shipping = 'shipping',
    Billing = 'billing',
    Payment = 'payment'
}

@Component({
    selector: 'app-checkout-flexible',
    templateUrl: './checkout-flexible.component.html',
    styleUrls: ['../../app.component.css']
})
export class CheckoutFlexibleComponent implements OnInit {

    public currentSection = Section.Customer;

    public checkoutButtonEnabled = true;

    public fastlaneProfile: any;
    public fastlaneIdentity: any;
    public fastlaneCardComponent: any;
    public fastlaneWatermarkComponent: any;

    public currentCustomer: CustomerResponse = {
        authenticated: false,
        name: "",
        email: "",
        paymentToken: null
    };

    public constructor(
        @Inject(WINDOW)
        private window: CustomWindow,
        @Inject(DOCUMENT)
        private _document: Document,
        private _renderer2: Renderer2,
        private _sdkService: SDKService,
        private _el: ElementRef,
        private transactionService: TransactionService
    ) { }

    public get section(): typeof Section {
        return Section;
    }

    public async ngOnInit(): Promise<void> {
        const initPaypalScriptOb = await this.initPaypalScript();

        initPaypalScriptOb.subscribe(async () => {
            if (!this.window.paypal.Fastlane) {
                throw new Error('PayPal script loaded but no Fastlane module');
            }

            const {
                identity,
                profile,
                FastlaneCardComponent,
                FastlaneWatermarkComponent,
            } = await this.window.paypal.Fastlane({
                styles: {
                    root: {
                        backgroundColor: '#faf8f5'
                    },
                },
            });

            this.fastlaneIdentity = identity;
            this.fastlaneProfile = profile;
            this.fastlaneCardComponent = await FastlaneCardComponent();
            this.fastlaneWatermarkComponent = await FastlaneWatermarkComponent();
        });
    }


    public async initPaypalScript(): Promise<Observable<void>> {
        const { url: sdkUrl } = await lastValueFrom(this._sdkService.getSDKUrl());
        const { clientToken } = await lastValueFrom(this._sdkService.getSDKClientToken());

        return new Observable<void>((observer) => {
            const script = this._renderer2.createElement('script');

            script.src = sdkUrl;
            script.defer = true;

            script.onload = () => {
                observer.next();
                observer.complete();
            };

            script.onerror = (error: any) => {
                observer.error(error);
            };

            this._renderer2.setAttribute(script, 'data-sdk-client-token', clientToken)
            this._renderer2.appendChild(this._document.head, script);
        });
    }

    public async onCheckoutButtonClick(): Promise<void> {

        this.checkoutButtonEnabled = false;

        const { name, email, shippingAddress, paymentToken: customerPaymentToken, billingAddress } = this.currentCustomer;

        const paymentToken = customerPaymentToken ?? await this.fastlaneCardComponent.getPaymentToken({ billingAddress });

        this.transactionService
            .createTransaction({
                paymentToken,
                name,
                email,
                shippingAddress: shippingAddress ?? undefined
            })
            .pipe(finalize(() => {
                this.checkoutButtonEnabled = true;
            }))
            .subscribe((response) => {
                const { result, error } = response;

                if (error) {
                    console.error(error);
                    return;
                }

                if (!result.id) {
                    console.error(result);
                    return;
                }

                const message = `Order ${result.id}: ${result.status}`;

                console.log(message);
                alert(message);
            });
    }

    public onEmailChange(nextCustomer: CustomerResponse): void {
        this.currentCustomer = nextCustomer;

        this.resetPaymentSection();

        if (this.currentCustomer.paymentToken) {
            this.fastlaneWatermarkComponent.render('#payment-watermark');
        } else {
            this.fastlaneCardComponent.render('#card-component');
        }

        if (this.currentCustomer.authenticated && this.currentCustomer.paymentToken) {
            this.setActiveSection(Section.Payment);
            return;
        }

        if (this.currentCustomer.authenticated) {
            this.setActiveSection(Section.Billing);
            return;
        }

        this.setActiveSection(Section.Shipping);
    }

    public async onShippingEditButtonClick() {
        if (!this.currentCustomer.authenticated) {
            this.setActiveSection(Section.Shipping);
            return;
        }

        const { selectionChanged, selectedAddress } = await this.fastlaneProfile.showShippingAddressSelector();

        if (selectionChanged) {
            this.currentCustomer.shippingAddress = selectedAddress;
        }
    }

    public async onPaymentEdit() {
        if (!this.currentCustomer.paymentToken) {
            this.setActiveSection(this.section.Payment);
            return;
        }

        const { selectionChanged, selectedCard } = await this.fastlaneProfile.showCardSelector();

        if (selectionChanged) {
            this.currentCustomer.paymentToken = selectedCard;
        }
    }

    public onShippingChange(nextShipping: ShippingAddressData): void {
        this.currentCustomer.shippingAddress = nextShipping;
        this.setActiveSection(this.currentCustomer.paymentToken ? Section.Payment : Section.Billing);
    }
    
    public onBillingChange(nextBilling: BillingAddressData): void {
        this.currentCustomer.billingAddress = nextBilling;
        this.setActiveSection(Section.Payment);
    }

    public setActiveSection(nextSection: Section): void {
        this.currentSection = nextSection;
    }

    private resetPaymentSection() {
        const paymentWatermark = this._el.nativeElement.querySelector("#payment-watermark");
        const cardComponent = this._el.nativeElement.querySelector("#card-component");

        paymentWatermark?.replaceChildren();
        cardComponent?.replaceChildren();
    }
}
