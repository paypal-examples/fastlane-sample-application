# PHP Example

This folder contains example code for a Fastlane integration using PHP to complete transactions with PayPal's SDK.

## Prerequisites

- [PHP 8.2 or later](https://www.php.net/manual/en/install.php)
- [Composer](https://getcomposer.org/download/)
- Configured `.env` file (see README in repository root)

## How to run

1. Install required packages
    ```
    composer install
    ```
2. Start the server
    ```
    php -S localhost:8080 -t public/
    ```
3. To view the application in your browser, choose a front-end implementation from the `client` folder at the root of this repository and follow the instructions in that folder's README.