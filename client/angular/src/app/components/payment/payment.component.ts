import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-payment',
  templateUrl: './payment.component.html',
  styleUrls: ['../../app.component.css']
})
export class PaymentComponent {

  @Input()
  public isAuthenticated = false;

  @Input()
  public set isActive(active: boolean) {
    if (active) {
      this.visited = true;
    }

    if (!this.visited) {
      this.paymentComponent.render("#payment-component");
    }

    this._isActive = active;
  }

  public get isActive(): boolean {
    return this._isActive;
  }

  @Input()
  public paymentComponent: { render: Function } = {
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
