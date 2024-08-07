# Ruby Example

This folder contains example code for a Fastlane integration using Ruby to complete transactions with PayPal's SDK.

## Prerequisites

- [Ruby 2.6 or later](https://www.ruby-lang.org/)
- [Bundler](https://bundler.io/)
- Configured `.env` file (see README in repository root)

## How to run

1. Install required packages
    ```
    bundle install --path vendor/bundle
    ```
2. Start the server
    ```
    ruby src/server.rb
    ```
3. Go to [localhost:8080](localhost:8080) for the Quick Start Integration or [localhost:8080/?flexible](localhost:8080/?flexible) for the Flexible Integration
