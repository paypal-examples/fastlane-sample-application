import { InjectionToken, Provider } from "@angular/core";
import { CustomWindow } from "../interfaces/window.interface";

export const WINDOW = new InjectionToken<CustomWindow>('WindowToken');

export function windowFactory(): Window {
    return window;
}

export const WINDOW_PROVIDER: Provider = {
    provide: WINDOW,
    useFactory: windowFactory
}