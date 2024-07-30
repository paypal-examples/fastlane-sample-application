import os
import chevron
from flask import make_response

from helpers import get_paypal_sdk_url, get_client_token


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
