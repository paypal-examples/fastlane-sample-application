# frozen_string_literal: true

require 'bundler/setup'
require 'dotenv/load'
require 'webrick'

Dotenv.load

require_relative './controllers/checkout_servlet'
require_relative './controllers/transaction_servlet'
require_relative './lib/sdk_script_helpers'

views_root = File.expand_path '../shared/views'
client_root = File.expand_path '../../client/html/src'

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
