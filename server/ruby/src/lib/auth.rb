# frozen_string_literal: true

require 'base64'
require 'json'

def get_auth_assertion_token(client_id, merchant_id)
  header = { alg: 'none' }
  body = { iss: client_id, payer_id: merchant_id }

  jwt_parts = [
    Base64.strict_encode64(header.to_json),
    Base64.strict_encode64(body.to_json),
    ''
  ]

  joined_jwt_parts = jwt_parts.join('.')
  joined_jwt_parts
end
