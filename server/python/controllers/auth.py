import base64
import json


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
