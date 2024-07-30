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
4. Go to [localhost:8080](localhost:8080) for the Quick Start Integration or [localhost:8080/?flexible](localhost:8080/?flexible) for the Flexible Integration
