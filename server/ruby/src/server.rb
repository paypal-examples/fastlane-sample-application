# frozen_string_literal: true

require 'bundler/setup'
require 'dotenv/load'
require 'webrick'

Dotenv.load

require_relative './controllers/checkout_servlet'
require_relative './controllers/transaction_servlet'

views_root = File.expand_path '../shared/views'
client_root = File.expand_path '../../client'

server = WEBrick::HTTPServer.new Port: 8080, DocumentRoot: views_root

trap 'INT' do server.shutdown end

server.mount '/public', WEBrick::HTTPServlet::FileHandler, client_root
server.mount '/', CheckoutServlet, views_root
server.mount '/transaction', TransactionServlet

server.start
