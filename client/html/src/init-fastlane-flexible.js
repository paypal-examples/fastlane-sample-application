async function initFastlane() {
  try {
    /* ######################################################################
     * Initialize Fastlane components
     * ###################################################################### */

    if (!window.paypal.Fastlane) {
      throw new Error('PayPal script loaded but no Fastlane module');
    }

    const {
      identity,
      profile,
      FastlaneCardComponent,
      FastlaneWatermarkComponent,
    } = await window.paypal.Fastlane({
      // shippingAddressOptions: {
      //   allowedLocations: [],
      // },
      // cardOptions: {
      //   allowedBrands: [],
      // },
      styles: {
        root: {
          backgroundColor: '#faf8f5',
          // errorColor: '',
          // fontFamily: '',
          // textColorBase: '',
          // fontSizeBase: '',
          // padding: '',
          // primaryColor: '',
        },
        // input: {
        //   backgroundColor: '',
        //   borderRadius: '',
        //   borderColor: '',
        //   borderWidth: '',
        //   textColorBase: '',
        //   focusBorderColor: '',
        // },
      },
    });

    const cardComponent = await FastlaneCardComponent();
    const paymentWatermark = await FastlaneWatermarkComponent({
      includeAdditionalInfo: false,
    });

    (
      await FastlaneWatermarkComponent({
        includeAdditionalInfo: true,
      })
    ).render('#watermark-container');

    /* ######################################################################
     * State & data required for Fastlane
     * ###################################################################### */

    let memberAuthenticatedSuccessfully;
    let memberHasSavedPaymentMethods;
    let email;
    let shippingAddress;
    let billingAddress;
    let paymentToken;

    /* ######################################################################
     * Checkout form helpers
     * (this will be different for individual websites and will depend on how
     * your own checkout flow functions)
     * ###################################################################### */

    const form = document.querySelector('form');
    const customerSection = document.getElementById('customer');
    const emailSubmitButton = document.getElementById('email-submit-button');
    const shippingSection = document.getElementById('shipping');
    const billingSection = document.getElementById('billing');
    const paymentSection = document.getElementById('payment');
    const paymentEditButton = document.getElementById('payment-edit-button');
    const checkoutButton = document.getElementById('checkout-button');
    let activeSection = customerSection;

    const setActiveSection = (section) => {
      activeSection.classList.remove('active');
      section.classList.add('active', 'visited');
      activeSection = section;
    };

    const getAddressSummary = ({
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
    }) => {
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
    };

    const setShippingSummary = (address) => {
      shippingSection.querySelector('.summary').innerText =
        getAddressSummary(address);
    };

    const setBillingSummary = (address) => {
      billingSection.querySelector('.summary').innerText = getAddressSummary({
        address,
      });
    };

    const setPaymentSummary = (paymentToken) => {
      document.getElementById('selected-card').innerText = paymentToken
        ? `💳 •••• ${paymentToken.paymentSource.card.lastDigits}`
        : '';
    };

    const validateFields = (form, fields = []) => {
      if (fields.length <= 0) return true;

      let valid = true;
      const invalidFields = [];

      for (let i = 0; i < fields.length; i++) {
        const currentFieldName = fields[i];
        const currentFieldElement = form.elements[currentFieldName];
        const isCurrentFieldValid = currentFieldElement.checkValidity();

        if (!isCurrentFieldValid) {
          valid = false;
          invalidFields.push(currentFieldName);
          currentFieldElement.classList.add('input-invalid');
          continue;
        }

        currentFieldElement.classList.remove('input-invalid');
      }

      if (invalidFields.length > 0) {
        const [firstInvalidField] = invalidFields;
        form.elements[firstInvalidField].reportValidity();
      }

      return valid;
    };

    /* ######################################################################
     * Checkout form interactable elements
     * (this will be different for individual websites and will depend on how
     * your own checkout flow functions)
     * ###################################################################### */

    emailSubmitButton.addEventListener('click', async () => {
      // Checks if email is empty or in a invalid format
      const isEmailValid = validateFields(form, ['email']);

      if (!isEmailValid) {
        return;
      }

      // disable button until authentication succeeds or fails
      emailSubmitButton.setAttribute('disabled', '');

      // reset form & state
      email = form.elements['email'].value;
      form.reset();
      document.getElementById('email-input').value = email;
      shippingSection.classList.remove('visited');
      setShippingSummary({});
      billingSection.classList.remove('visited');
      billingSection.removeAttribute('hidden');
      setBillingSummary({});
      paymentSection.classList.remove('visited', 'pinned');
      setPaymentSummary();
      document.getElementById('payment-watermark').replaceChildren();
      document.getElementById('card-component').replaceChildren();

      memberAuthenticatedSuccessfully = undefined;
      memberHasSavedPaymentMethods = undefined;
      shippingAddress = undefined;
      billingAddress = undefined;
      paymentToken = undefined;

      try {
        // identify and authenticate Fastlane members
        const { customerContextId } =
          await identity.lookupCustomerByEmail(email);

        if (customerContextId) {
          const authResponse =
            await identity.triggerAuthenticationFlow(customerContextId);
          console.log('Auth response:', authResponse);

          // save profile data
          if (authResponse?.authenticationState === 'succeeded') {
            memberAuthenticatedSuccessfully = true;
            shippingAddress = authResponse.profileData.shippingAddress;
            paymentToken = authResponse.profileData.card;
            billingAddress = paymentToken?.paymentSource.card.billingAddress;
          }
        } else {
          // user was not recognized
          console.log('No customerContextId');
        }

        // update form UI
        customerSection.querySelector('.summary').innerText = email;
        if (shippingAddress) {
          setShippingSummary(shippingAddress);
        }
        if (paymentToken) {
          // if available, display Fastlane user's selected card with watermark
          memberHasSavedPaymentMethods = true;
          setPaymentSummary(paymentToken);
          paymentWatermark.render('#payment-watermark');
        } else {
          // otherwise render card component
          cardComponent.render('#card-component');
        }
        if (memberAuthenticatedSuccessfully) {
          shippingSection.classList.add('visited');
          if (paymentToken) {
            billingSection.setAttribute('hidden', '');
            paymentSection.classList.add('pinned');
            paymentEditButton.classList.add('pinned');
            setActiveSection(paymentSection);
          } else {
            setActiveSection(billingSection);
          }
        } else {
          setActiveSection(shippingSection);
        }
      } finally {
        // re-enable button once authentication succeeds or fails
        emailSubmitButton.removeAttribute('disabled');
      }
    });

    // enable button after adding click event listener
    emailSubmitButton.removeAttribute('disabled');

    document
      .getElementById('email-edit-button')
      .addEventListener('click', () => setActiveSection(customerSection));

    document
      .getElementById('shipping-submit-button')
      .addEventListener('click', () => {
        const isShippingRequired = form.elements['shipping-required'].checked;

        if (!isShippingRequired) {
          const nextSection = memberHasSavedPaymentMethods
            ? paymentSection
            : billingSection;
          shippingAddress = undefined;
          setActiveSection(nextSection);
          setShippingSummary({});
          return;
        }

        // validate form values
        const isShippingFormValid = validateFields(form, [
          'given-name',
          'family-name',
          'shipping-address-line1',
          'shipping-address-level2',
          'shipping-address-level1',
          'shipping-postal-code',
          'shipping-country',
          'tel-country-code',
          'tel-national',
        ]);

        if (!isShippingFormValid) {
          return;
        }

        // extract form values
        const firstName = form.elements['given-name'].value;
        const lastName = form.elements['family-name'].value;
        const company = form.elements['company'].value;
        const addressLine1 = form.elements['shipping-address-line1'].value;
        const addressLine2 = form.elements['shipping-address-line2'].value;
        const adminArea2 = form.elements['shipping-address-level2'].value;
        const adminArea1 = form.elements['shipping-address-level1'].value;
        const postalCode = form.elements['shipping-postal-code'].value;
        const countryCode = form.elements['shipping-country'].value;
        const telCountryCode = form.elements['tel-country-code'].value;
        const telNational = form.elements['tel-national'].value;

        // update state & form UI
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
            fullName: [firstName, lastName]
              .filter((field) => !!field)
              .join(' '),
          },
          phoneNumber: {
            countryCode: telCountryCode,
            nationalNumber: telNational,
          },
        };
        setShippingSummary(shippingAddress);
        setActiveSection(
          memberHasSavedPaymentMethods ? paymentSection : billingSection,
        );
      });

    document
      .getElementById('shipping-edit-button')
      .addEventListener('click', async () => {
        if (memberAuthenticatedSuccessfully) {
          // open Shipping Address Selector for Fastlane members
          const { selectionChanged, selectedAddress } =
            await profile.showShippingAddressSelector();

          if (selectionChanged) {
            // selectedAddress contains the new address
            console.log('New address:', selectedAddress);

            // update state & form UI
            shippingAddress = selectedAddress;
            setShippingSummary(shippingAddress);
          } else {
            // selection modal was dismissed without selection
          }
        } else {
          setActiveSection(shippingSection);
        }
      });

    document
      .getElementById('billing-submit-button')
      .addEventListener('click', () => {
        // validate form values
        const isBillingFormValid = validateFields(form, [
          'billing-address-line1',
          'billing-address-level2',
          'billing-address-level1',
          'billing-postal-code',
          'billing-country',
        ]);

        if (!isBillingFormValid) {
          return;
        }

        // extract form values
        const addressLine1 = form.elements['billing-address-line1'].value;
        const addressLine2 = form.elements['billing-address-line2'].value;
        const adminArea2 = form.elements['billing-address-level2'].value;
        const adminArea1 = form.elements['billing-address-level1'].value;
        const postalCode = form.elements['billing-postal-code'].value;
        const countryCode = form.elements['billing-country'].value;

        // update state & form UI
        billingAddress = {
          addressLine1,
          addressLine2,
          adminArea2,
          adminArea1,
          postalCode,
          countryCode,
        };
        setBillingSummary(billingAddress);
        setActiveSection(paymentSection);
      });

    document
      .getElementById('billing-edit-button')
      .addEventListener('click', () => setActiveSection(billingSection));

    paymentEditButton.addEventListener('click', async () => {
      if (memberHasSavedPaymentMethods) {
        // open Card Selector for Fastlane members
        const { selectionChanged, selectedCard } =
          await profile.showCardSelector();

        if (selectionChanged) {
          // selectedCard contains the new card
          console.log('New card:', selectedCard);

          // update state & form UI
          paymentToken = selectedCard;
          setPaymentSummary(paymentToken);
        } else {
          // selection modal was dismissed without selection
        }
      } else {
        setActiveSection(paymentSection);
      }
    });

    checkoutButton.addEventListener('click', async () => {
      // disable button until transaction succeeds or fails
      checkoutButton.setAttribute('disabled', '');

      try {
        // get payment token if using card component
        if (!memberHasSavedPaymentMethods) {
          paymentToken = await cardComponent.getPaymentToken({
            billingAddress,
          });
        }
        console.log('Payment token:', paymentToken);

        // send transaction details to back-end
        const headers = new Headers();
        headers.append('Content-Type', 'application/json');
        const isShippingRequired = form.elements['shipping-required'].checked;
        const body = JSON.stringify({
          ...(isShippingRequired && { shippingAddress }),
          paymentToken,
        });
        const response = await fetch('transaction', {
          method: 'POST',
          headers,
          body,
        });
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
      } finally {
        // re-enable button once transaction succeeds or fails
        checkoutButton.removeAttribute('disabled');
      }
    });
  } catch (error) {
    console.error(error);
  }
}

initFastlane();
