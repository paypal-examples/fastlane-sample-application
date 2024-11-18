<?php

use App\Controller\ServerController;
use Symfony\Component\Routing\Loader\Configurator\RoutingConfigurator;

return function (RoutingConfigurator $routes): void {
    $routes
        ->add("getCheckout", "/")
        ->controller([ServerController::class, "index"]);

    $routes
        ->add("createTransaction", "/transaction")
        ->controller([ServerController::class, "createTransaction"]);

    $routes
        ->add("getSdkUrl", "/sdk/url")
        ->controller([ServerController::class, "getSDKUrl"]);

    $routes
        ->add("getClientToken", "/sdk/client-token")
        ->controller([ServerController::class, "getClientToken"]);
};
