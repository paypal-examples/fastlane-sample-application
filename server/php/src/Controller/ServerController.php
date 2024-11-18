<?php

namespace App\Controller;

use Mustache_Engine;
use Error;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpClient\HttpClient;
use Symfony\Component\HttpFoundation\JsonResponse;

/* ######################################################################
 * Token generation helpers
 * ###################################################################### */

class SdkScriptHelpers
{
    public static function getPayPalSDKUrl(): string
    {
        $sdkUrl = Env::get("PAYPAL_SDK_BASE_URL") . "/sdk/js";

        $sdkQueryParams = http_build_query([
            "client-id" => Env::get("PAYPAL_CLIENT_ID"),
            "components" => "buttons,fastlane",
        ]);

        $fullUrl = $sdkUrl . "?" . $sdkQueryParams;

        return $fullUrl;
    }

    public static function getClientToken(): string
    {
        if (
            !Env::get("PAYPAL_CLIENT_ID") ||
            !Env::get("PAYPAL_CLIENT_SECRET")
        ) {
            throw new Error("Missing API credentials");
        }

        $httpClient = HttpClient::create();

        $url = Env::get("PAYPAL_API_BASE_URL") . "/v1/oauth2/token";

        $authKey = base64_encode(
            Env::get("PAYPAL_CLIENT_ID") .
                ":" .
                Env::get("PAYPAL_CLIENT_SECRET")
        );

        $headers = [
            "Authorization" => "Basic " . $authKey,
            "Content-Type" => "application/x-www-form-urlencoded",
        ];

        if (Env::get("PAYPAL_MERCHANT_ID")) {
            $headers["PayPal-Auth-Assertion"] = Auth::getAuthAssertionToken(
                Env::get("PAYPAL_CLIENT_ID"),
                Env::get("PAYPAL_MERCHANT_ID")
            );
        }

        $response = $httpClient
            ->request("POST", $url, [
                "headers" => $headers,
                "body" => [
                    "grant_type" => "client_credentials",
                    "response_type" => "client_token",
                    "intent" => "sdk_init",
                    "domains[]" => Env::get("DOMAINS"),
                ],
            ])
            ->toArray();

        return $response["access_token"];
    }

    public static function getAccessToken(): string
    {
        if (
            !Env::get("PAYPAL_CLIENT_ID") ||
            !Env::get("PAYPAL_CLIENT_SECRET")
        ) {
            throw new Error("Missing API credentials");
        }

        $httpClient = HttpClient::create();

        $url = Env::get("PAYPAL_API_BASE_URL") . "/v1/oauth2/token";

        $authKey = base64_encode(
            Env::get("PAYPAL_CLIENT_ID") .
                ":" .
                Env::get("PAYPAL_CLIENT_SECRET")
        );

        $headers = [
            "Authorization" => "Basic " . $authKey,
            "Content-Type" => "application/x-www-form-urlencoded",
        ];

        if (Env::get("PAYPAL_MERCHANT_ID")) {
            $headers["PayPal-Partner-Attribution-ID"] = Env::get(
                "PAYPAL_BN_CODE"
            );
            $headers["PayPal-Auth-Assertion"] = Auth::getAuthAssertionToken(
                Env::get("PAYPAL_CLIENT_ID"),
                Env::get("PAYPAL_MERCHANT_ID")
            );
        }

        $response = $httpClient
            ->request("POST", $url, [
                "headers" => $headers,
                "body" => [
                    "grant_type" => "client_credentials",
                ],
            ])
            ->toArray();

        return $response["access_token"];
    }
}

class ServerController extends AbstractController
{
    private $mustache;

    public function __construct()
    {
        $this->mustache = new Mustache_Engine(["entity_flags" => ENT_QUOTES]);
    }

    /* ######################################################################
     * Serve checkout page
     * ###################################################################### */

    public function index(Request $request)
    {
        $isFlexibleIntegration = $request->query->get("flexible", false);

        $sdkUrl = SdkScriptHelpers::getPayPalSDKUrl();
        $clientToken = SdkScriptHelpers::getClientToken();

        $locals = [
            "title" =>
                "Fastlane - PayPal Integration" .
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
            __DIR__ .
                "/../../../shared/views/" .
                ($isFlexibleIntegration
                    ? "checkout-flexible.html"
                    : "checkout.html")
        );

        $template = $this->mustache->render($htmlTemplate, $locals);

        return new Response($template);
    }

    /* ######################################################################
     * Process transactions
     * ###################################################################### */

    public function createTransaction(Request $request)
    {
        $data = $request->toArray();

        $url = Env::get("PAYPAL_API_BASE_URL") . "/v2/checkout/orders";

        $accessToken = SdkScriptHelpers::getAccessToken();

        $headers = [
            "PayPal-Request-Id" => (string) (time() * 1000),
            "Authorization" => "Bearer " . $accessToken,
            "Content-Type" => "application/json",
        ];

        $httpClient = HttpClient::create();

        $body = [
            "intent" => "CAPTURE",
            "payment_source" => [
                "card" => [
                    "single_use_token" => $data["paymentToken"]["id"],
                ],
            ],
            "purchase_units" => [
                [
                    "amount" => [
                        "currency_code" => "USD",
                        "value" => "110.00",
                    ],
                ],
            ],
        ];

        if (array_key_exists("shippingAddress", $data)) {
            $shippingAddress = $data["shippingAddress"];

            $fullName = isset($shippingAddress["name"]["fullName"])
                ? $shippingAddress["name"]["fullName"]
                : null;

            $companyName = isset($shippingAddress["companyName"])
                ? $shippingAddress["companyName"]
                : null;
            $countryCode = isset($shippingAddress["phoneNumber"]["countryCode"])
                ? $shippingAddress["phoneNumber"]["countryCode"]
                : null;
            $nationalNumber = isset(
                $shippingAddress["phoneNumber"]["nationalNumber"]
            )
                ? $shippingAddress["phoneNumber"]["nationalNumber"]
                : null;

            $body["purchase_units"][0]["shipping"] = [
                "type" => "SHIPPING",
                "name" => $fullName ? ["full_name" => $fullName] : null,
                "company_name" => !empty($companyName) ? $companyName : null,
                "address" => [
                    "address_line_1" => isset(
                        $shippingAddress["address"]["addressLine1"]
                    )
                        ? $shippingAddress["address"]["addressLine1"]
                        : null,
                    "address_line_2" => isset(
                        $shippingAddress["address"]["addressLine2"]
                    )
                        ? $shippingAddress["address"]["addressLine2"]
                        : null,
                    "admin_area_2" => isset(
                        $shippingAddress["address"]["adminArea2"]
                    )
                        ? $shippingAddress["address"]["adminArea2"]
                        : null,
                    "admin_area_1" => isset(
                        $shippingAddress["address"]["adminArea1"]
                    )
                        ? $shippingAddress["address"]["adminArea1"]
                        : null,
                    "postal_code" => isset(
                        $shippingAddress["address"]["postalCode"]
                    )
                        ? $shippingAddress["address"]["postalCode"]
                        : null,
                    "country_code" => isset(
                        $shippingAddress["address"]["countryCode"]
                    )
                        ? $shippingAddress["address"]["countryCode"]
                        : null,
                ],
            ];
        }

        if ($countryCode && $nationalNumber) {
            $body["purchase_units"][0]["shipping"]["phone_number"] = [
                "country_code" => $countryCode,
                "national_number" => $nationalNumber,
            ];
        }

        $result = $httpClient
            ->request("POST", $url, [
                "headers" => $headers,
                "body" => json_encode($body),
            ])
            ->toArray();

        return new JsonResponse(["result" => $result]);
    }

    public function getSDKUrl()
    {
        $sdkUrl = SdkScriptHelpers::getPayPalSDKUrl();
        return $this->json(["url" => $sdkUrl])->setEncodingOptions(
            JSON_UNESCAPED_SLASHES
        );
    }

    public function getClientToken()
    {
        $clientToken = SdkScriptHelpers::getClientToken();
        return $this->json(["clientToken" => $clientToken]);
    }
}

class Auth
{
    public static function getAuthAssertionToken(
        string $clientId,
        string $merchantId
    ): string {
        $header = [
            "alg" => "none",
        ];

        $body = [
            "iss" => $clientId,
            "payer_id" => $merchantId,
        ];

        $signature = "";

        $jwtParts = [$header, $body, $signature];

        $authAssertion = array_map(function ($part) {
            return $part ? base64_encode(json_encode($part)) : "";
        }, $jwtParts);

        return join(".", $authAssertion);
    }
}

class Env
{
    static function get(string $key): string|null
    {
        return $_ENV[$key] ?? null;
    }
}
