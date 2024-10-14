<?php

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
