# Fastlane Sample Application

This sample app demonstrates how to integrate with Fastlane using PayPal's REST APIs.

## Before You Code

1. **Setup a PayPal Account**

    To get started, you'll need a developer, personal, or business account.

    [Sign Up](https://www.paypal.com/signin/client?flow=provisionUser) or [Log In](https://www.paypal.com/signin?returnUri=https%253A%252F%252Fdeveloper.paypal.com%252Fdashboard&intent=developer)

    You'll then need to visit the [Developer Dashboard](https://developer.paypal.com/dashboard/) to obtain credentials and to make sandbox accounts.

2. **Create an Application**

    Once you've setup a PayPal account, you'll need to obtain a **Client ID** and **Secret**. [Create a sandbox application](https://developer.paypal.com/dashboard/applications/sandbox/create).

## How to Run Locally

1. Clone the repository by running the following command in your terminal:
    ```
    git clone https://github.com/paypal-examples/fastlane-sample-application.git
    ```
2. Copy the `.env.example` file from the `server` folder and paste it into the folder for the server technology you want to use as `.env`. For example (substitute `node` for the technology of your choice):
    ```
    cd fastlane-sample-application/server
    cp .env.example node/.env
    cd node
    ```
    To run this application, you will need this folder and the `shared` folder. The other folders under `server` can be safely deleted or ignored.
3. Open the `.env` file in a text editor and replace the placeholders with the appropriate values.
4. Follow the instructions in your chosen folder's README.

## Client Integrations

### Quick Start Integration

#### Overview
Fastlane Quick Start Integration uses PayPal's pre-built UI for payment collection, thereby allowing you to integrate quickly and easily. The Fastlane Payment Component will automatically render the following:
1. Customer's selected card and "Change" link which allows users to choose a different saved card or use a new card (for Fastlane members)
2. Credit card and billing address fields (for Guest users or for Fastlane members who don't have an accepted card in their profile)

#### Key Features
- Quickest way to integrate Fastlane
- Pre-formatted display to show Fastlane members their selected payment method
- Payment form including billing address for Guest users
- Data Security: Quick Start Integration is PCI DSS compliant, ensuring that customer payment information is handled securely

### Flexible Integration

#### Overview
Fastlane Flexible Integration allows you to customize and style your payment page according to the look and feel of your website. The Fastlane Card Component renders input fields for Guest users to enter their credit card details, while the Card Selector provides an interface for Fastlane members to choose a different saved card or use a new card. You will be responsible for:
1. Showing the selected payment method, the Fastlane watermark, and a button to open the Card Selector (for Fastlane members)
2. Collecting billing address information and rendering the Fastlane Card Component (for Guest users and Fastlane members who don't have an accepted card in their profile)

#### Key Features
- Further customize the behavior and experience of your checkout
- Data Security: Flexible Integration is PCI DSS compliant, ensuring that customer payment information is handled securely

# Running on Codespaces
Follow below steps to use Codespaces.

1) Click "New with options..." to open a page where you can choose the Dev container to run.
![image](https://github.com/user-attachments/assets/0d4bf202-0c94-42ec-aa2e-d8ccb6da9eb8)

2) Choose the Dev container to run
![image](https://github.com/user-attachments/assets/b612467d-9fdc-4666-8dfa-0d99af6a2d39)

3) Client ID and Client Secrets are required for running the application in codespace.
![image](https://github.com/user-attachments/assets/cbbc4521-aa43-403f-9243-e3c555e67f4a)



### Link to codespaces 

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/paypal-examples/fastlane-sample-application)

### Learn more 

You can read more about codespaces in the [PayPal Developer Docs](https://developer.paypal.com/api/rest/sandbox/codespaces).

### Feedback 

* To report a bug or suggest a new feature, create an [issue in GitHub](https://github.com/paypal-examples/paypaldevsupport/issues/new/choose). 
* To submit feedback, go to [PayPal Developer Docs](https://developer.paypal.com/api/rest/sandbox/codespaces) and select the "Feedback" tab
