import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ShippingAddressData } from '../components/shipping/shipping.component';

interface TransactionRequest {
    name: string;
    email: string;
    paymentToken: { [key: string]: any };
    shippingAddress?: ShippingAddressData;
}

interface TransactionResponse {
    result: { id: string; status: string; };
    error?: any;
}

@Injectable({
    providedIn: 'root',
})
export class TransactionService {

    constructor(private httpClient: HttpClient) { }

    public createTransaction(payload: TransactionRequest): Observable<TransactionResponse> {
        return this.httpClient.post<TransactionResponse>(`${environment.apiUrl}/transaction`, payload);
    }
}