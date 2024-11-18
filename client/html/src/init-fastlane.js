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
      FastlanePaymentComponent,
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

    const paymentComponent = await FastlanePaymentComponent();

    (
      await FastlaneWatermarkComponent({
        includeAdditionalInfo: true,
      })
    ).render('#watermark-container');

    /* ######################################################################
     * State & data required for Fastlane
     * ###################################################################### */

    let memberAuthenticatedSuccessfully;
    let email;
    let shippingAddress;
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
    const paymentSection = document.getElementById('payment');
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
      paymentSection.classList.remove('visited', 'pinned');

      memberAuthenticatedSuccessfully = undefined;
      shippingAddress = undefined;
      paymentToken = undefined;

      // render payment component
      paymentComponent.render('#payment-component');

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
        if (memberAuthenticatedSuccessfully) {
          shippingSection.classList.add('visited');
          paymentSection.classList.add('pinned');
          setActiveSection(paymentSection);
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
          shippingAddress = undefined;
          setActiveSection(paymentSection);
          setShippingSummary({});
          return;
        }

        const isShippingFormValid = validateFields(form, [
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

        // extract form values
        const firstName = form.elements['given-name'].value;
        const lastName = form.elements['family-name'].value;
        const company = form.elements['company'].value;
        const addressLine1 = form.elements['address-line1'].value;
        const addressLine2 = form.elements['address-line2'].value;
        const adminArea2 = form.elements['address-level2'].value;
        const adminArea1 = form.elements['address-level1'].value;
        const postalCode = form.elements['postal-code'].value;
        const countryCode = form.elements['country'].value;
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
        paymentComponent.setShippingAddress(shippingAddress);
        setActiveSection(paymentSection);
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
            paymentComponent.setShippingAddress(shippingAddress);
          } else {
            // selection modal was dismissed without selection
          }
        } else {
          setActiveSection(shippingSection);
        }
      });

    document
      .getElementById('payment-edit-button')
      .addEventListener('click', () => setActiveSection(paymentSection));

    checkoutButton.addEventListener('click', async () => {
      // disable button until transaction succeeds or fails
      checkoutButton.setAttribute('disabled', '');

      try {
        // get payment token
        paymentToken = await paymentComponent.getPaymentToken();
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
