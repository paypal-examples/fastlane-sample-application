import os
import requests
from requests.auth import HTTPBasicAuth
from urllib.parse import urljoin, urlencode
from flask import jsonify, make_response
from controllers.auth import get_auth_assertion_token

PAYPAL_API_BASE_URL = os.getenv(
    "PAYPAL_API_BASE_URL", "https://api-m.sandbox.paypal.com"
)  # use https://api-m.paypal.com for production environment
PAYPAL_SDK_BASE_URL = os.getenv(
    "PAYPAL_SDK_BASE_URL", "https://www.sandbox.paypal.com"
)  # use https://www.paypal.com for production environment
PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET")
PAYPAL_MERCHANT_ID = os.getenv("PAYPAL_MERCHANT_ID")
DOMAINS = os.getenv("DOMAINS")


def get_paypal_sdk_url():
    if not PAYPAL_CLIENT_ID:
        raise ValueError("Missing PAYPAL_CLIENT_ID")

    sdk_url = urljoin(PAYPAL_SDK_BASE_URL, "/sdk/js")
    sdk_params = {
        "client-id": PAYPAL_CLIENT_ID,
        "components": "buttons,fastlane",
    }
    sdk_url_with_params = f"{sdk_url}?{urlencode(sdk_params)}"
    return sdk_url_with_params


def get_client_token():
    try:
        url = f"{PAYPAL_API_BASE_URL}/v1/oauth2/token"
        auth = HTTPBasicAuth(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET)
        headers = {"Content-Type": "application/x-www-form-urlencoded"}

        if PAYPAL_MERCHANT_ID:
            headers["PayPal-Auth-Assertion"] = get_auth_assertion_token(
                PAYPAL_CLIENT_ID, PAYPAL_MERCHANT_ID
            )

        data = {
            "grant_type": "client_credentials",
            "response_type": "client_token",
            "intent": "sdk_init",
            "domains[]": DOMAINS,
        }

        response = requests.post(url, headers=headers, data=data, auth=auth)
        response.raise_for_status()
        responseJson = response.json()

        return {
            "clientId": PAYPAL_CLIENT_ID,
            "clientToken": responseJson["access_token"],
            "paypalSdkBaseUrl": PAYPAL_SDK_BASE_URL,
        }
    except Exception as error:
        print(error)
        return make_response(jsonify(error=str(error)), 500)
