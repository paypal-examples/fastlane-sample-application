<?php

use App\Controller\CheckoutController;
use App\Controller\TransactionController;
use Symfony\Component\Routing\Loader\Configurator\RoutingConfigurator;

return function (RoutingConfigurator $routes): void {
    $routes
        ->add("getCheckout", "/")
        ->controller([CheckoutController::class, "index"]);

    $routes
        ->add("createTransaction", "/transaction")
        ->controller([TransactionController::class, "createTransaction"]);

    $routes
        ->add("getSdkUrl", "/sdk/url")
        ->controller([CheckoutController::class, "getSDKUrl"]);

    $routes
        ->add("getClientToken", "/sdk/client-token")
        ->controller([CheckoutController::class, "getClientToken"]);
};
