# frozen_string_literal: true

require 'webrick'
require 'uri'
require 'net/http'
require 'openssl'
require 'json'

require_relative '../lib/sdk_script_helpers'

class TransactionServlet < WEBrick::HTTPServlet::AbstractServlet
  def do_POST(request, response)
    data = JSON.parse(request.body)

    payload = get_payload(data)

    access_token = get_access_token

    headers = {
      'PayPal-Request-Id': Time.now.to_s,
      'Authorization': format('Bearer %<access_token>s', access_token: access_token),
      'Content-Type': 'application/json'
    }

    uri = URI("#{ENV['PAYPAL_API_BASE_URL']}/v2/checkout/orders")

    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = true
    http.verify_mode = OpenSSL::SSL::VERIFY_NONE

    request = Net::HTTP::Post.new(uri, headers)

    request.body = payload.to_json

    transaction_response = http.request(request)

    json_response = JSON.parse(transaction_response.body)

    response.status = 201
    response.content_type = 'application/json'
    response.body = { result: json_response }.to_json
    response
  end

  def get_payload(data)
    payment_token = data['paymentToken']
    shipping_address = data['shippingAddress']

    payload = {
      intent: 'CAPTURE',
      payment_source: {
        card: {
          single_use_token: payment_token['id']
        }
      },
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: '110.0'
          }
        }
      ]
    }

    if shipping_address
      full_name = shipping_address['fullName']
      country_code = shipping_address.dig('phoneNumber', 'countryCode')
      national_number = shipping_address.dig('phoneNumber', 'nationalNumber')

      payload[:purchase_units][0][:shipping] = {
        type: 'SHIPPING',
        name: full_name ? { full_name: full_name } : nil,
        address: {
          address_line_1: shipping_address.dig('address', 'addressLine1'),
          address_line_2: shipping_address.dig('address', 'addressLine2'),
          admin_area_2: shipping_address.dig('address', 'adminArea2'),
          admin_area_1: shipping_address.dig('address', 'adminArea1'),
          postal_code: shipping_address.dig('address', 'postalCode'),
          country_code: shipping_address.dig('address', 'countryCode')
        }
      }
    end

    if country_code && national_number
      payload[:purchase_units][0][:shipping][:phone_number] = {
        country_code: country_code,
        national_number: national_number
      }
    end
    payload
  end
end
