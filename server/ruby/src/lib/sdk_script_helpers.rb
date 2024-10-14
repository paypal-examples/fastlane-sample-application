# frozen_string_literal: true

require 'uri'
require 'net/http'
require 'openssl'
require 'base64'
require 'json'

require_relative './auth'

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
