import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CheckoutSwitcherComponent } from './pages/checkout-switcher/checkout-switcher.component';

const routes: Routes = [
  {
    path: '**',
    component: CheckoutSwitcherComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
