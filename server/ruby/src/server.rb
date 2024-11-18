# frozen_string_literal: true

require 'bundler/setup'
require 'dotenv/load'
require 'webrick'
require 'mustache'
require 'uri'
require 'net/http'
require 'openssl'
require 'base64'
require 'json'

Dotenv.load

views_root = File.expand_path '../shared/views'
client_root = File.expand_path '../../client/html/src'

#######################################################################
## Token generation helpers
#######################################################################

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

def get_client_token
  raise 'Missing API credentials' if !ENV['PAYPAL_CLIENT_ID'] || !ENV['PAYPAL_CLIENT_SECRET']

  auth_key = Base64.strict_encode64(
    format('%<paypal_client_id>s:%<paypal_client_secret>s', paypal_client_id: ENV['PAYPAL_CLIENT_ID'],
                                                            paypal_client_secret: ENV['PAYPAL_CLIENT_SECRET'])
  )

  headers = {
    'Authorization': format('Basic %<auth_key>s', auth_key: auth_key)
  }

  if ENV['PAYPAL_MERCHANT_ID']
    headers['PayPal-Auth-Assertion'] = get_auth_assertion_token(ENV['PAYPAL_CLIENT_ID'], ENV['PAYPAL_MERCHANT_ID'])
  end

  uri = URI("#{ENV['PAYPAL_API_BASE_URL']}/v1/oauth2/token")

  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true
  http.verify_mode = OpenSSL::SSL::VERIFY_NONE

  request = Net::HTTP::Post.new(uri, headers)

  request.body = URI.encode_www_form({
                                       grant_type: 'client_credentials',
                                       response_type: 'client_token',
                                       intent: 'sdk_init',
                                       'domains[]': ENV['DOMAINS']
                                     })

  request.content_type = 'application/x-www-form-urlencoded'

  response = http.request(request)

  json_response = JSON.parse(response.body)

  json_response['access_token']
end

def get_access_token
  raise 'Missing API credentials' if !ENV['PAYPAL_CLIENT_ID'] || !ENV['PAYPAL_CLIENT_SECRET']

  auth_key = Base64.strict_encode64(
    format('%<paypal_client_id>s:%<paypal_client_secret>s', paypal_client_id: ENV['PAYPAL_CLIENT_ID'],
                                                            paypal_client_secret: ENV['PAYPAL_CLIENT_SECRET'])
  )

  headers = {
    'Authorization': format('Basic %<auth_key>s', auth_key: auth_key)
  }

  if ENV['PAYPAL_MERCHANT_ID']
    headers['PayPal-Partner-Attribution-ID'] = ENV['PAYPAL_BN_CODE']
    headers['PayPal-Auth-Assertion'] = get_auth_assertion_token(ENV['PAYPAL_CLIENT_ID'], ENV['PAYPAL_MERCHANT_ID'])
  end

  uri = URI("#{ENV['PAYPAL_API_BASE_URL']}/v1/oauth2/token")

  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true
  http.verify_mode = OpenSSL::SSL::VERIFY_NONE

  request = Net::HTTP::Post.new(uri, headers)

  request.body = URI.encode_www_form({
                                       grant_type: 'client_credentials'
                                     })

  request.content_type = 'application/x-www-form-urlencoded'

  response = http.request(request)

  json_response = JSON.parse(response.body)

  json_response['access_token']
end

#######################################################################
## Serve checkout page
#######################################################################

def get_paypal_sdk_url
  sdk_query_params = {
    'client-id': ENV['PAYPAL_CLIENT_ID'],
    components: 'buttons,fastlane'
  }

  uri = URI.parse(ENV['PAYPAL_SDK_BASE_URL'])

  sdk_query_string = URI.encode_www_form(sdk_query_params)

  sdk_uri = URI::HTTPS.build(
    host: uri.host,
    path: '/sdk/js',
    query: sdk_query_string
  )

  sdk_uri.to_s
end

class CheckoutServlet < WEBrick::HTTPServlet::AbstractServlet
  def initialize(server, document_root)
    super(server)
    @document_root = document_root
  end

  def do_GET(request, response)
    is_flexible_integration = request.query.key?('flexible')

    sdk_url = get_paypal_sdk_url
    client_token = get_client_token

    data = {
      title: "Fastlane - PayPal Integration#{is_flexible_integration ? ' (Flexible)' : ''}",
      prerequisiteScripts: format('
        <script
          src="%<sdk_url>s"
          data-sdk-client-token="%<client_token>s"
          defer
        ></script>
      ', sdk_url: sdk_url, client_token: client_token),
      initScriptPath: is_flexible_integration ? '/public/init-fastlane-flexible.js' : '/public/init-fastlane.js',
      stylesheetPath: '/public/styles.css'
    }

    template_path = File.join(@document_root, is_flexible_integration ? 'checkout-flexible.html' : 'checkout.html')
    template = File.read(template_path)
    rendered_template = Mustache.render(template, data)

    response['Content-Type'] = 'text/html;charset=UTF-8'
    response.body = rendered_template
  end
end

#######################################################################
## Process transactions
#######################################################################

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
    response.header['Access-Control-Allow-Origin'] = '*'
    response.header['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, PUT, DELETE'
    response.body = { result: json_response }.to_json
    response
  end

  def do_OPTIONS(request, response)
    response.header['Access-Control-Allow-Origin'] = '*'
    response.header['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, PUT, DELETE'
    response.header['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
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
      full_name = shipping_address.dig('name', 'fullName')
      country_code = shipping_address.dig('phoneNumber', 'countryCode')
      national_number = shipping_address.dig('phoneNumber', 'nationalNumber')
      company_name = shipping_address.dig('companyName')

      payload[:purchase_units][0][:shipping] = {
        type: 'SHIPPING',
        name: full_name ? { full_name: full_name } : nil,
        company_name: company_name.nil? || company_name.empty? ? nil : company_name,
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

#######################################################################
## Run the server
#######################################################################

server = WEBrick::HTTPServer.new Port: 8080, DocumentRoot: views_root

trap 'INT' do server.shutdown end

server.mount '/public', WEBrick::HTTPServlet::FileHandler, client_root
server.mount '/', CheckoutServlet, views_root
server.mount '/transaction', TransactionServlet

server.mount_proc '/sdk/url' do |req, res|
  sdk_url = get_paypal_sdk_url

  res.status = 200
  res.content_type = 'application/json'
  res.header['Access-Control-Allow-Origin'] = '*'
  res.header['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, PUT, DELETE'
  res.body = { url: sdk_url }.to_json
  res
end

server.mount_proc '/sdk/client-token' do |req, res|
  client_token = get_client_token

  res.status = 200
  res.content_type = 'application/json'
  res.header['Access-Control-Allow-Origin'] = '*'
  res.header['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, PUT, DELETE'
  res.body = { clientToken: client_token }.to_json
  res
end

server.start
