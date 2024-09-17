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
3. To view the application in your browser, choose a front-end implementation from the `client` folder at the root of this repository and follow the instructions in that folder's README.
