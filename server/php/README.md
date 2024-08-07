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
3. Go to [localhost:8080](localhost:8080) for the Quick Start Integration or [localhost:8080/?flexible](localhost:8080/?flexible) for the Flexible Integration