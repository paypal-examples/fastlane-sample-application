package com.fastlane.paypalsample.sample;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fastlane.paypalsample.sample.models.Request;
import io.github.cdimascio.dotenv.Dotenv;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.ModelAndView;

@Controller
public class SampleController {

    Dotenv dotenv = Dotenv.load();

    private final String title = "Fastlane - PayPal Integration";
    private final String basePrerequisiteScripts =
        """
            <script
                    src="%s"
                    data-sdk-client-token="%s"
                    defer
            ></script>
        """;
    private final String initScriptPath = "init-fastlane%s.js";
    private final String stylesheetPath = "../styles.css";

    private final String PAYPAL_SDK_BASE_URL = dotenv.get("PAYPAL_SDK_BASE_URL", "https://www.sandbox.paypal.com");
    private final String PAYPAL_CLIENT_ID = dotenv.get("PAYPAL_CLIENT_ID");

    private final TokenService tokenService;
    private final OrderService orderService;

    public SampleController(TokenService tokenService, OrderService orderService) {
        this.tokenService = tokenService;
        this.orderService = orderService;
    }

    @GetMapping("/")
    public ModelAndView getCheckout(
        @RequestParam(name = "flexible", required = false) String isFlexible,
        Model model,
        HttpServletResponse response
    ) {
        String clientToken = tokenService.getClientToken();
        String sdkUrl = PAYPAL_SDK_BASE_URL + "/sdk/js?client-id=" + PAYPAL_CLIENT_ID + "&components=buttons,fastlane";

        String prerequisiteScripts = String.format(basePrerequisiteScripts, sdkUrl, clientToken);

        model.addAttribute("title", isFlexible != null ? title + " (Flexible)" : title);
        model.addAttribute("prerequisiteScripts", prerequisiteScripts);
        model.addAttribute(
            "initScriptPath",
            isFlexible != null ? String.format(initScriptPath, "-flexible") : String.format(initScriptPath, "")
        );
        model.addAttribute("stylesheetPath", stylesheetPath);

        String page = isFlexible != null ? "checkout-flexible" : "checkout";

        return new ModelAndView(page, model.asMap());
    }

    @CrossOrigin
    @PostMapping("/transaction")
    public ResponseEntity<?> createOrder(@RequestBody Request body) {
        try {
            String accessToken = tokenService.getAccessToken();

            ObjectMapper mapper = new ObjectMapper();
            JsonNode rootNode = mapper.valueToTree(body);
            JsonNode paymentTokenNode = rootNode.at("/paymentToken");
            JsonNode shippingNode = rootNode.at("/shippingAddress");
            JsonNode addressNode = shippingNode.at("/address");
            JsonNode phoneNumberNode = shippingNode.at("/phoneNumber");
            JsonNode nameNode = shippingNode.at("/name");

            Map<String, String> card = new HashMap<>();
            card.put("single_use_token", paymentTokenNode.get("id").asText());

            Map<String, Object> paymentSource = new HashMap<>();
            paymentSource.put("card", card);

            Map<String, Object> amount = new HashMap<>();
            amount.put("currency_code", "USD");
            amount.put("value", "110.00");

            Map<String, Object> shipping = new HashMap<>();
            shipping.put("type", "SHIPPING");

            if (shippingNode.hasNonNull("name")) {
                Map<String, String> name = new HashMap<>();

                name.put("full_name", nameNode.path("fullName").textValue());

                Boolean isFullNameEmpty = name.get("full_name").isEmpty();

                shipping.put("name", !isFullNameEmpty ? name : null);
            }

            if (shippingNode.hasNonNull("companyName")) {
                String companyName = shippingNode.path("companyName").textValue();
                shipping.put("company_name", !companyName.isEmpty() ? companyName : null);
            }

            if (shippingNode.hasNonNull("address")) {
                Map<String, String> address = new HashMap<>();

                address.put("address_line_1", addressNode.path("addressLine1").textValue());
                address.put("address_line_2", addressNode.path("addressLine2").textValue());
                address.put("admin_area_1", addressNode.path("adminArea1").textValue());
                address.put("admin_area_2", addressNode.path("adminArea2").textValue());
                address.put("postal_code", addressNode.path("postalCode").textValue());
                address.put("country_code", addressNode.path("countryCode").textValue());

                shipping.put("address", address);
            }

            if (shippingNode.hasNonNull("phoneNumber")) {
                Map<String, String> phoneNumber = new HashMap<>();

                phoneNumber.put("country_code", phoneNumberNode.path("countryCode").textValue());
                phoneNumber.put("national_number", phoneNumberNode.path("nationalNumber").textValue());

                Boolean isCountryCodeEmpty = phoneNumber.get("country_code").isEmpty();
                Boolean isNationalNumberEmpty = phoneNumber.get("national_number").isEmpty();

                shipping.put("phone_number", !isCountryCodeEmpty && !isNationalNumberEmpty ? phoneNumber : null);
            }

            Map<String, Object> purchaseUnit = new HashMap<>();
            purchaseUnit.put("amount", amount);
            purchaseUnit.put("shipping", shipping);

            Map<String, Object> payload = new HashMap<>();
            payload.put("intent", "CAPTURE");
            payload.put("payment_source", paymentSource);
            payload.put("purchase_units", Arrays.asList(purchaseUnit));

            ResponseEntity<Map<String, Object>> result = this.orderService.createOrder(accessToken, payload);

            Map<String, Object> response = new HashMap<>();
            response.put("result", result.getBody());

            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @CrossOrigin
    @GetMapping("/sdk/url")
    public ResponseEntity<?> getSdkUrl() {
        String sdkUrl = PAYPAL_SDK_BASE_URL + "/sdk/js?client-id=" + PAYPAL_CLIENT_ID + "&components=buttons,fastlane";
        Map<String, Object> response = new HashMap<>();

        response.put("url", sdkUrl);

        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    @CrossOrigin
    @GetMapping("/sdk/client-token")
    public ResponseEntity<?> getClientToken() {
        String clientToken = tokenService.getClientToken();
        Map<String, Object> response = new HashMap<>();

        response.put("clientToken", clientToken);

        return new ResponseEntity<>(response, HttpStatus.OK);
    }
}
