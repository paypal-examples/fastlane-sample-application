import os
import time
import requests
from requests.auth import HTTPBasicAuth
from flask import jsonify, make_response

from controllers.auth import get_auth_assertion_token

PAYPAL_API_BASE_URL = os.getenv(
    "PAYPAL_API_BASE_URL", "https://api-m.sandbox.paypal.com"
)  # use https://api-m.paypal.com for production environment
PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET")
PAYPAL_MERCHANT_ID = os.getenv("PAYPAL_MERCHANT_ID")
PAYPAL_BN_CODE = os.getenv("PAYPAL_BN_CODE")


def get_client_token():
    try:
        url = f"{PAYPAL_API_BASE_URL}/v1/oauth2/token"
        auth = HTTPBasicAuth(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET)
        headers = {"Content-Type": "application/x-www-form-urlencoded"}

        if PAYPAL_MERCHANT_ID:
            headers["PayPal-Partner-Attribution-ID"] = PAYPAL_BN_CODE
            headers["PayPal-Auth-Assertion"] = get_auth_assertion_token(
                PAYPAL_CLIENT_ID, PAYPAL_MERCHANT_ID
            )

        data = {
            "grant_type": "client_credentials",
        }

        response = requests.post(url, headers=headers, data=data, auth=auth)
        response.raise_for_status()
        responseJson = response.json()

        return responseJson["access_token"]
    except Exception as error:
        print(error)
        return make_response(jsonify(error=str(error)), 500)


def create_order(body):
    try:
        transaction_data = body
        payment_token = transaction_data.get("paymentToken")
        shipping_address = transaction_data.get("shippingAddress")

        access_token = get_client_token()

        url = f"{PAYPAL_API_BASE_URL}/v2/checkout/orders"
        headers = {
            "PayPal-Request-Id": str(int(time.time())),
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        payload = {
            "intent": "CAPTURE",
            "payment_source": {"card": {"single_use_token": payment_token["id"]}},
            "purchase_units": [{"amount": {"currency_code": "USD", "value": "110.00"}}],
        }

        if shipping_address:
            shipping_address_name = shipping_address.get("name", {})
            shipping_address_phone_number = shipping_address.get("phoneNumber", {})

            payload["purchase_units"][0]["shipping"] = {
                "type": "SHIPPING",
                "name": (
                    {"full_name": shipping_address["name"]["fullName"]}
                    if shipping_address_name.get("fullName")
                    else None
                ),
                "company_name": shipping_address["companyName"] or None,
                "address": {
                    "address_line_1": shipping_address["address"]["addressLine1"],
                    "address_line_2": shipping_address["address"].get(
                        "addressLine2", None
                    ),
                    "admin_area_2": shipping_address["address"]["adminArea2"],
                    "admin_area_1": shipping_address["address"]["adminArea1"],
                    "postal_code": shipping_address["address"]["postalCode"],
                    "country_code": shipping_address["address"]["countryCode"],
                },
                "phone_number": (
                    {
                        "country_code": shipping_address["phoneNumber"]["countryCode"],
                        "national_number": shipping_address["phoneNumber"][
                            "nationalNumber"
                        ],
                    }
                    if shipping_address_phone_number.get("countryCode")
                    and shipping_address_phone_number.get("nationalNumber")
                    else None
                ),
            }
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        result = response.json()

        return jsonify(result=result)
    except Exception as error:
        print(error)
        return make_response(jsonify(error=str(error)), 500)
