import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CheckoutComponent } from './pages/checkout/checkout.component';
import { WINDOW_PROVIDER } from './services/window.service';
import { CustomerComponent } from './components/customer/customer.component';
import { ReactiveFormsModule } from '@angular/forms';
import { PaymentComponent } from './components/payment/payment.component';
import { ShippingComponent } from './components/shipping/shipping.component';
import { CheckoutFlexibleComponent } from './pages/checkout-flexible/checkout-flexible.component';
import { BillingComponent } from './components/billing/billing.component';
import { PaymentFlexibleComponent } from './components/payment-flexible/payment-flexible.component';
import { CheckoutSwitcherComponent } from './pages/checkout-switcher/checkout-switcher.component';

@NgModule({
    declarations: [
        AppComponent,
        CheckoutComponent,
        CheckoutFlexibleComponent,
        CheckoutSwitcherComponent,
        CustomerComponent,
        PaymentComponent,
        PaymentFlexibleComponent,
        ShippingComponent,
        BillingComponent
    ],
    bootstrap: [AppComponent], imports: [BrowserModule,
        AppRoutingModule,
        ReactiveFormsModule], providers: [
            WINDOW_PROVIDER,
            provideHttpClient(withInterceptorsFromDi())
        ]
})
export class AppModule { }
