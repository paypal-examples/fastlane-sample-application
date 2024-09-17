<?php

namespace App\Controller;

use Env;
use SdkScriptHelpers;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpClient\HttpClient;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

class TransactionController extends AbstractController
{
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
}
