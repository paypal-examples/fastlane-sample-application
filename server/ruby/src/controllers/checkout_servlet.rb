# frozen_string_literal: true

require 'mustache'
require 'webrick'

require_relative '../lib/sdk_script_helpers'

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

    response['Content-Type'] = 'text/html'
    response.body = rendered_template
  end
end
