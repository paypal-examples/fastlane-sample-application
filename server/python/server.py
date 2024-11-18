import os
import requests
import base64
import json
import chevron
import time

from flask import Flask, send_from_directory, request, jsonify, make_response
from dotenv import load_dotenv
from flask_cors import CORS
from requests.auth import HTTPBasicAuth
from urllib.parse import urljoin, urlencode

load_dotenv("../.env")

PAYPAL_API_BASE_URL = os.getenv(
    "PAYPAL_API_BASE_URL", "https://api-m.sandbox.paypal.com"
)  # use https://api-m.paypal.com for production environment
PAYPAL_SDK_BASE_URL = os.getenv(
    "PAYPAL_SDK_BASE_URL", "https://www.sandbox.paypal.com"
)  # use https://www.paypal.com for production environment
PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET")
PAYPAL_MERCHANT_ID = os.getenv("PAYPAL_MERCHANT_ID")
PAYPAL_BN_CODE = os.getenv("PAYPAL_BN_CODE")
DOMAINS = os.getenv("DOMAINS")

app = Flask(__name__)

app.config["TEMPLATES_FOLDER"] = os.path.abspath(
    os.path.join(app.root_path, "../shared/views")
)

CORS(app)

#######################################################################
## Token generation helpers
#######################################################################


def get_auth_assertion_token(client_id, merchant_id):
    header = {"alg": "none"}
    body = {"iss": client_id, "payer_id": merchant_id}
    signature = ""

    def encode_part(part):
        return base64.urlsafe_b64encode(json.dumps(part).encode()).decode().rstrip("=")

    jwt_parts = [header, body, signature]
    encoded_parts = [encode_part(part) if part else "" for part in jwt_parts]
    auth_assertion = ".".join(encoded_parts)

    return auth_assertion


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


def get_access_token():
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


#######################################################################
## Serve checkout page
#######################################################################


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


def render_paypal(args, templates_folder):
    is_flexible_integration = "flexible" in args

    sdk_url = get_paypal_sdk_url()
    client_token = get_client_token()

    locals = {
        "title": "Fastlane - PayPal Integration"
        + (" (Flexible)" if is_flexible_integration else ""),
        "prerequisiteScripts": f"""
            <script
                src="{sdk_url}"
                data-sdk-client-token="{client_token['clientToken']}"
                defer
            ></script>
        """,
        "initScriptPath": (
            "init-fastlane-flexible.js"
            if is_flexible_integration
            else "init-fastlane.js"
        ),
        "stylesheetPath": "styles.css",
    }

    template_name = (
        "checkout-flexible.html" if is_flexible_integration else "checkout.html"
    )
    template_path = os.path.join(templates_folder, template_name)

    with open(template_path, "r") as f:
        template = f.read()

    html = chevron.render(template, locals)
    response = make_response(html)
    return response


#######################################################################
## Process transactions
#######################################################################


def create_order(body):
    try:
        transaction_data = body
        payment_token = transaction_data.get("paymentToken")
        shipping_address = transaction_data.get("shippingAddress")

        access_token = get_access_token()

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


#######################################################################
## Run the server
#######################################################################


@app.route("/")
def paypal_render():
    return render_paypal(request.args, app.config["TEMPLATES_FOLDER"])


@app.route("/transaction", methods=["POST"])
def paypal_transaction():
    return create_order(request.json)


@app.route("/<path:filename>")
def serve_static(filename):
    return send_from_directory(
        os.path.join(app.root_path, "../../client/html/src"), filename
    )


@app.get("/sdk/url")
def get_sdk_url():
    sdk_url = get_paypal_sdk_url()
    return jsonify(url=sdk_url)


@app.get("/sdk/client-token")
def get_sdk_client_token():
    data = get_client_token()
    return jsonify(clientToken=data["clientToken"])


# Run the server
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    app.run(host="0.0.0.0", port=port, debug=True)
