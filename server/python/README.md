# Python Example

This folder contains example code for a Fastlane integration using Python to complete transactions with PayPal's REST APIs.

## Prerequisites

- Python 3.x
- pip (Python package installer)
- Configured `.env` file (see README in repository root)

## How to run

1. Create a virtual environment and activate it
    ```
    python -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    ```
2. Install the required packages
    ```
    pip install -r requirements.txt
    ```
3. Start the server
    ```
    python app.py
    ```
4. To view the application in your browser, choose a front-end implementation from the `client` folder at the root of this repository and follow the instructions in that folder's README.
