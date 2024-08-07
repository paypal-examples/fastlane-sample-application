# frozen_string_literal: true

require 'base64'
require 'json'

def get_auth_assertion_token(client_id, merchant_id)
  header = { alg: 'none' }
  body = { iss: client_id, payer_id: merchant_id }

  signature = ''
  jwt_parts = [header, body, signature]

  jwt_parts.map { |part| part && Base64.strict_encode64(part.to_json) }.join('.')
end
