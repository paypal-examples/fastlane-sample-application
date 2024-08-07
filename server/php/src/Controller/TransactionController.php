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

        $result = $httpClient
            ->request("POST", $url, [
                "headers" => $headers,
                "body" => json_encode($body),
            ])
            ->toArray();

        return new JsonResponse(["result" => $result]);
    }
}
