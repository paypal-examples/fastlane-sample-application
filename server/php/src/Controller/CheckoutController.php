<?php

namespace App\Controller;

use Mustache_Engine;
use SdkScriptHelpers;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;

class CheckoutController extends AbstractController
{
    private $mustache;

    public function __construct()
    {
        $this->mustache = new Mustache_Engine(["entity_flags" => ENT_QUOTES]);
    }

    public function index(Request $request)
    {
        $isFlexibleIntegration = $request->query->get("flexible", false);

        $sdkUrl = SdkScriptHelpers::getPayPalSDKUrl();
        $clientToken = SdkScriptHelpers::getClientToken();

        $locals = [
            "title" =>
                "Fastlane - Paypal Integration" .
                ($isFlexibleIntegration ? " (Flexible)" : ""),
            "prerequisiteScripts" => "
                <script src='$sdkUrl'
                    data-sdk-client-token='$clientToken'
                    defer
                ></script>
            ",
            "initScriptPath" => $isFlexibleIntegration
                ? "init-fastlane-flexible.js"
                : "init-fastlane.js",
            "stylesheetPath" => "styles.css",
        ];

        $htmlTemplate = file_get_contents(
            __DIR__ . "/../../../shared/views/checkout.html"
        );

        $template = $this->mustache->render($htmlTemplate, $locals);

        return new Response($template);
    }
}
