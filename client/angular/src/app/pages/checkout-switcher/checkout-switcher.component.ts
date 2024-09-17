import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-checkout-switcher',
  templateUrl: './checkout-switcher.component.html',
})
export class CheckoutSwitcherComponent implements OnInit {
  public isFlexible = false;
  
  constructor(private route: ActivatedRoute) {}

  public ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.isFlexible = params['flexible'] === 'true';
    });
  }
}
