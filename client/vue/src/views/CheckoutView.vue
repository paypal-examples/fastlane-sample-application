<script setup>
import { useScript } from '@unhead/vue';
import { onMounted, ref } from 'vue';
import { validateFields } from '../utils/form';

onMounted(async () => {
  await initialize();
});

const email = ref('');
const addressSummary = ref('');
const shippingAddressForm = ref({});
const isShippingRequired = ref(true);
const isDisabled = ref(false);
const checkoutForm = ref(null);

let name;
let deviceData;
let paymentToken;
let shippingAddress;
let paymentComponent;
let memberAuthenticatedSuccessfully = false;

let identity, profile, FastlanePaymentComponent, FastlaneWatermarkComponent;

const activeSection = ref('customer');
const pinnedSection = ref('');
const visitedSections = ref(['customer']);

async function requestSdkData() {
  const resClientToken = await fetch(
    `${import.meta.env.VITE_SERVER_URL}/sdk/client-token`,
  );
  const resUrl = await fetch(`${import.meta.env.VITE_SERVER_URL}/sdk/url`);
  const { clientToken } = await resClientToken.json();
  const { url } = await resUrl.json();
  return { clientToken, url };
}

async function initialize() {
  const { clientToken, url } = await requestSdkData();

  const client = useScript({
    src: url,
    'data-sdk-client-token': clientToken,
    defer: true,
    async: true,
  });

  await client;
  ({ identity, profile, FastlanePaymentComponent, FastlaneWatermarkComponent } =
    await window.paypal.Fastlane({
      // shippingAddressOptions: {
      //   allowedLocations: ['US:TX', 'US:CA', 'MX', 'CA:AB', 'CA:ON'],
      // },
      // cardOptions: {
      //   allowedBrands: ['VISA', 'MASTER_CARD'],
      // },
      styles: { root: { backgroundColor: '#faf8f5' } }
    }));

  paymentComponent = await FastlanePaymentComponent();

  const watermarkComponent = await FastlaneWatermarkComponent({
    includeAdditionalInfo: true,
  });

  watermarkComponent.render('#watermark-container');
}

async function lookupEmailProfile() {
  
  // Checks if email is empty or in a invalid format
  const isEmailValid = validateFields(checkoutForm.value, ['email']);
  
  if (!isEmailValid) {
    return;
  }
  
  shippingAddress = undefined;
  paymentToken = undefined;
  shippingAddressForm.value = {};
  addressSummary.value = '';
  pinnedSection.value = '';
  visitedSections.value = ['customer'];
  memberAuthenticatedSuccessfully = false;
  isShippingRequired.value = true;
  isDisabled.value = true;

  paymentComponent.render('#payment-component');

  const { customerContextId } = await identity.lookupCustomerByEmail(
    email.value,
  );

  if (customerContextId) {
    const authResponse =
      await identity.triggerAuthenticationFlow(customerContextId);
    console.log('Auth response:', authResponse);

    if (authResponse?.authenticationState === 'succeeded') {
      memberAuthenticatedSuccessfully = true;
      shippingAddress = authResponse.profileData.shippingAddress;
      paymentToken = authResponse.profileData.card;
    }
  } else {
    console.log('No customerContextId');
  }

  if (shippingAddress) {
    addressSummary.value = getAddressSummary(shippingAddress);
  }

  if (memberAuthenticatedSuccessfully) {
    activeSection.value = 'payment';
  } else {
    activeSection.value = 'shipping';
  }
  visitedSections.value.push('shipping');

  isDisabled.value = false;
}

async function handleEditCustomer() {
  activeSection.value = 'customer';
}

async function handleEditShipping() {
  if (memberAuthenticatedSuccessfully) {
    // open Shipping Address Selector for Fastlane members
    const { selectionChanged, selectedAddress } =
      await profile.showShippingAddressSelector();

    if (selectionChanged) {
      // selectedAddress contains the new address
      console.log('New address:', selectedAddress);

      // update state & form UI
      shippingAddress = selectedAddress;
      addressSummary.value = getAddressSummary(shippingAddress);
      paymentComponent.setShippingAddress(shippingAddress);
    } else {
      // selection modal was dismissed without selection
    }
  } else {
    activeSection.value = 'shipping';
    visitedSections.value.push('shipping');
  }
}

async function submitShippingAddress() {
  
  if (!isShippingRequired.value) {
    shippingAddress = undefined;
    activeSection.value = 'payment';
    addressSummary.value = getAddressSummary({});
    return;
  }
  
  const isShippingFormValid = validateFields(checkoutForm.value, [
    'given-name',
    'family-name',
    'address-line1',
    'address-level2',
    'address-level1',
    'postal-code',
    'country',
    'tel-country-code',
    'tel-national',
  ]);
  
  if (!isShippingFormValid) {
    return;
  }
  
  const {
    firstName,
    lastName,
    company,
    addressLine1,
    addressLine2,
    adminArea2,
    adminArea1,
    postalCode,
    countryCode,
    telCountryCode,
    telNational,
  } = shippingAddressForm.value;

  shippingAddress = {
    companyName: company,
    address: {
      addressLine1,
      addressLine2,
      adminArea2,
      adminArea1,
      postalCode,
      countryCode,
    },
    name: {
      firstName,
      lastName,
      fullName: [firstName, lastName].filter((field) => !!field).join(' '),
    },
    phoneNumber: {
      countryCode: telCountryCode,
      nationalNumber: telNational,
    },
  };

  addressSummary.value = getAddressSummary(shippingAddress);
  paymentComponent.setShippingAddress(shippingAddress);
  activeSection.value = 'payment';
  visitedSections.value.push('payment');
}

async function handleEditPayment() {
  activeSection.value = 'payment';
}

async function submitCheckout() {
  isDisabled.value = true;

  paymentToken = await paymentComponent.getPaymentToken();
  console.log('Payment token:', paymentToken);

  const headers = new Headers();
  headers.append('Content-Type', 'application/json');
  const body = JSON.stringify({
    amount: 1,
    deviceData,
    email: email.value,
    name,
    paymentToken,
    ...(isShippingRequired && { shippingAddress }),
  });
  const response = await fetch(
    `${import.meta.env.VITE_SERVER_URL}/transaction`,
    {
      method: 'POST',
      headers,
      body,
    },
  );
  const { result, error } = await response.json();

  if (error) {
    console.error(error);
  } else {
    if (result.id) {
      const message = `Order ${result.id}: ${result.status}`;
      console.log(message);
      alert(message);
    } else {
      console.error(result);
    }
  }

  isDisabled.value = false;
}

function getSectionStatus(sectionName) {
  const isActive = activeSection.value === sectionName;
  const isVisited = visitedSections.value.includes(sectionName);
  const isPinned = pinnedSection.value === sectionName;

  return {
    active: isActive,
    visited: isVisited,
    pinned: isPinned,
  };
}

function getAddressSummary({
  companyName,
  address: {
    addressLine1,
    addressLine2,
    adminArea2,
    adminArea1,
    postalCode,
    countryCode,
  } = {},
  name: { firstName, lastName, fullName } = {},
  phoneNumber: { countryCode: telCountryCode, nationalNumber } = {},
}) {
  const isNotEmpty = (field) => !!field;
  const summary = [
    fullName || [firstName, lastName].filter(isNotEmpty).join(' '),
    companyName,
    [addressLine1, addressLine2].filter(isNotEmpty).join(', '),
    [
      adminArea2,
      [adminArea1, postalCode].filter(isNotEmpty).join(' '),
      countryCode,
    ]
      .filter(isNotEmpty)
      .join(', '),
    [telCountryCode, nationalNumber].filter(isNotEmpty).join(''),
  ];
  return summary.filter(isNotEmpty).join('\n');
}
</script>

<template>
  <form ref="checkoutForm" @submit.prevent="() => null">
    <h1>Fastlane - PayPal Integration</h1>
    <section id="customer" :class="getSectionStatus('customer')">
      <div class="header">
        <h2>Customer</h2>
        <button
          id="email-edit-button"
          type="button"
          class="edit-button"
          @click="handleEditCustomer"
        >
          <span class="button-icon"></span>
          Edit
        </button>
      </div>
      <div class="email-section">
        <div class="summary">{{ email }}</div>
        <fieldset class="email-input-with-watermark">
          <div class="email-container">
            <div class="form-group">
              <input
                required
                maxlength="255"
                name="email"
                type="email"
                placeholder="Email"
                autocomplete="email"
                v-model="email"
              />
              <label for="email-input" class="label">E-mail</label>
            </div>
            <button
              id="email-submit-button"
              type="button"
              class="submit-button"
              @click="lookupEmailProfile"
              :disabled="isDisabled"
            >
              Continue
            </button>
          </div>
          <div id="watermark-container"></div>
        </fieldset>
      </div>
    </section>

    <hr />

    <section id="shipping" :class="getSectionStatus('shipping')">
      <div class="header">
        <h2>Shipping</h2>
        <button
          id="shipping-edit-button"
          type="button"
          class="edit-button"
          @click="handleEditShipping"
        >
          <span class="button-icon"></span>
          Edit
        </button>
      </div>
      <div class="summary">{{ addressSummary }}</div>
      <fieldset>
        <span>
          <input
            id="shipping-required-checkbox"
            name="shipping-required"
            type="checkbox"
            v-model="isShippingRequired"
            :checked="isShippingRequired"
          />
          <label for="shipping-required-checkbox">
            This purchase requires shipping
          </label>
        </span>
        <div class="form-row">
          <div class="form-group">
            <input
              required
              maxlength="255"
              id="given-name"
              name="given-name"
              autocomplete="given-name"
              placeholder="First Name"
              v-model="shippingAddressForm.firstName"
            />
            <label for="given-name" class="label">First Name</label>
          </div>
          <div class="form-group">
            <input
              required
              maxlength="255"
              id="family-name"
              name="family-name"
              autocomplete="family-name"
              placeholder="Last Name"
              v-model="shippingAddressForm.lastName"
            />
            <label for="family-name" class="label">Last Name</label>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <input
              maxlength="255"
              id="company"
              name="company"
              autocomplete="organization"
              placeholder="Company name (optional)"
              v-model="shippingAddressForm.company"
            />
            <label for="company" class="label">Company name (optional)</label>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <input
              required
              maxlength="255"
              id="address-line1"
              name="address-line1"
              autocomplete="address-line1"
              placeholder="Address Line 1"
              v-model="shippingAddressForm.addressLine1"
            />
            <label for="address-line1" class="label">Address Line 1</label>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <input
              maxlength="255"
              id="address-line2"
              name="address-line2"
              autocomplete="address-line2"
              placeholder="Apt., ste., bldg. (optional)"
              v-model="shippingAddressForm.addressLine2"
            />
            <label for="address-line2" class="label">
              Apt., ste, bldg. (optional)
            </label>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <input
              required
              maxlength="255"
              id="address-level2"
              name="address-level2"
              autocomplete="address-level2"
              placeholder="City"
              v-model="shippingAddressForm.adminArea2"
            />
            <label for="address-level2" class="label">City</label>
          </div>

          <div class="form-group">
            <input
              required
              maxlength="255"
              id="address-level1"
              name="address-level1"
              autocomplete="address-level1"
              placeholder="State"
              v-model="shippingAddressForm.adminArea1"
            />
            <label for="address-level1" class="label">State</label>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <input
              required 
              pattern="\d{5}(-\d{4})?"
              title="The ZIP code must have the one of the following formats: 12345 or 12345-6789"
              id="postal-code"
              name="postal-code"
              autocomplete="postal-code"
              placeholder="ZIP Code"
              v-model="shippingAddressForm.postalCode"
            />
            <label for="postal-code" class="label">ZIP Code</label>
          </div>
          <div class="form-group">
            <input
              required pattern="US" 
              minlength="2" 
              maxlength="2" 
              title="Currently only available to the US"
              id="country"
              name="country"
              autocomplete="country"
              placeholder="Country (eg. US, UK)"
              v-model="shippingAddressForm.countryCode"
            />
            <label for="country" class="label">Country (eg. US, UK)</label>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <input
              pattern="([0-9]{1,3})?" 
              title="Please enter a valid country calling code with 1 to 3 digits" 
              minlength="1"
              maxlength="3"
              id="tel-country-code"
              name="tel-country-code"
              autocomplete="tel-country-code"
              placeholder="Country calling code"
            />
            <label for="tel-country-code" class="label">
              Country calling code
            </label>
          </div>

          <div class="form-group">
            <input
              pattern="([0-9]{10})?" 
              title="Please enter a valid US phone number like (123) 456-7890, type only numbers"
              id="tel-national"
              name="tel-national"
              type="tel"
              autocomplete="tel-national"
              placeholder="Phone Number"
              v-model="shippingAddressForm.telCountryCode"
            />
            <label for="tel-national" class="label">Phone Number</label>
          </div>
        </div>
      </fieldset>
      <button
        id="shipping-submit-button"
        type="button"
        class="submit-button"
        @click="submitShippingAddress"
      >
        Confirm
      </button>
    </section>

    <hr />

    <section id="payment" :class="getSectionStatus('payment')">
      <div class="header">
        <h2>Payment</h2>
        <button
          id="payment-edit-button"
          type="button"
          class="edit-button"
          @click="handleEditPayment"
        >
          <span class="button-icon"></span>
          Edit
        </button>
      </div>
      <fieldset>
        <div id="payment-component"></div>
      </fieldset>
    </section>

    <button
      id="checkout-button"
      type="button"
      class="submit-button"
      @click="submitCheckout"
      :disabled="isDisabled"
    >
      Checkout
    </button>
  </form>
</template>

<style scoped></style>
