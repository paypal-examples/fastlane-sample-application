export interface CustomWindow extends Window {
    paypal: any;
}

declare var window: CustomWindow;