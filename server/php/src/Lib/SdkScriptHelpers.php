<?php

use Symfony\Component\HttpClient\HttpClient;

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
