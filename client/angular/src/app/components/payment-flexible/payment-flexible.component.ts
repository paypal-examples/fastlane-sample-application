import { Component, EventEmitter, Input, Output } from '@angular/core';

type PaymentToken = {
  paymentSource: {
    card: {
      lastDigits: string;
    }
  }
} | { [key: string]: any } | null;

@Component({
  selector: 'app-payment-flexible',
  templateUrl: './payment-flexible.component.html',
  styleUrls: ['../../app.component.css']
})
export class PaymentFlexibleComponent {

  @Input()
  public isAuthenticated = false;

  @Input()
  public set paymentToken(token: PaymentToken) {
    this.cardSummary = "";

    if (token) {
      this.cardSummary = `💳 •••• ${token.paymentSource.card.lastDigits}`
    }
  }

  @Input()
  public set isActive(active: boolean) {
    if (active) {
      this.visited = true;
    }

    this._isActive = active;
  }

  public cardSummary: string = "";

  public get isActive(): boolean {
    return this._isActive;
  }

  @Input()
  public cardComponent: { render: Function } = {
    render: () => { }
  };

  @Output()
  public editClickEvent = new EventEmitter<void>();

  public visited = false;

  private _isActive = false;

  public onEditButtonClick(): void {
    this.editClickEvent.emit();
  }
}
