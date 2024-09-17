import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

interface SDKUrlResponse { 
    url: string 
};

interface SDKClientTokenResponse { 
    clientToken: string 
};

@Injectable({
    providedIn: 'root',
})
export class SDKService {

    constructor(private httpClient: HttpClient) { }

    public getSDKUrl(): Observable<SDKUrlResponse> {
        return this.httpClient.get<SDKUrlResponse>(`${environment.apiUrl}/sdk/url`);
    }

    public getSDKClientToken(): Observable<SDKClientTokenResponse> {
        return this.httpClient.get<SDKClientTokenResponse>(`${environment.apiUrl}/sdk/client-token`);
    }
}