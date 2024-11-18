package com.fastlane.paypalsample.sample;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fastlane.paypalsample.sample.models.Request;
import io.github.cdimascio.dotenv.Dotenv;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.client.RestClient;
import org.springframework.web.servlet.ModelAndView;
import org.springframework.web.util.UriComponentsBuilder;

enum TokenType {
    CLIENT_TOKEN,
    ACCESS_TOKEN
}

@Controller
public class ServerController {

    private final Dotenv dotenv;

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

    private final String PAYPAL_API_BASE_URL;
    private final String PAYPAL_SDK_BASE_URL;
    private final String PAYPAL_CLIENT_ID;
    private final String PAYPAL_CLIENT_SECRET;
    private final String PAYPAL_MERCHANT_ID;
    private final String PAYPAL_BN_CODE;
    private final String DOMAINS;

    private final RestClient tokenHttpClient;
    private final RestClient orderHttpClient;

    public ServerController() {
        this.dotenv = Dotenv.load();

        this.PAYPAL_API_BASE_URL = this.dotenv.get("PAYPAL_API_BASE_URL", "https://api-m.sandbox.paypal.com");
        this.PAYPAL_SDK_BASE_URL = dotenv.get("PAYPAL_SDK_BASE_URL", "https://www.sandbox.paypal.com");
        this.PAYPAL_CLIENT_ID = dotenv.get("PAYPAL_CLIENT_ID");
        this.PAYPAL_CLIENT_SECRET = this.dotenv.get("PAYPAL_CLIENT_SECRET");
        this.PAYPAL_MERCHANT_ID = this.dotenv.get("PAYPAL_MERCHANT_ID");
        this.PAYPAL_BN_CODE = this.dotenv.get("PAYPAL_BN_CODE");
        this.DOMAINS = this.dotenv.get("DOMAINS");

        String auth = this.PAYPAL_CLIENT_ID + ":" + this.PAYPAL_CLIENT_SECRET;
        String apiKey = new String(Base64.getEncoder().encode(auth.getBytes()));

        this.tokenHttpClient = RestClient.builder()
            .baseUrl(this.PAYPAL_API_BASE_URL)
            .defaultHeader("Authorization", "Basic " + apiKey)
            .build();

        this.orderHttpClient = RestClient.builder().baseUrl(this.PAYPAL_API_BASE_URL).build();
    }

    /* ######################################################################
     * Token generation helpers
     * ###################################################################### */

    private String getAuthAssertionToken(String clientId, String merchantId) {
        try {
            HashMap<String, String> header = new HashMap<>();
            header.put("alg", "none");

            HashMap<String, String> body = new HashMap<>();
            body.put("iss", clientId);
            body.put("payer_id", merchantId);

            String signature = "";

            ObjectMapper mapper = new ObjectMapper();
            String headerJson;
            String bodyJson;
            headerJson = mapper.writeValueAsString(header);
            bodyJson = mapper.writeValueAsString(body);

            String headerEncoded = Base64.getEncoder().encodeToString(headerJson.getBytes(StandardCharsets.UTF_8));
            String bodyEncoded = Base64.getEncoder().encodeToString(bodyJson.getBytes(StandardCharsets.UTF_8));
            String signatureEncoded = Base64.getEncoder().encodeToString(signature.getBytes(StandardCharsets.UTF_8));

            String result = headerEncoded + "." + bodyEncoded + ".";

            if (!signature.isEmpty()) {
                result += signatureEncoded;
            }

            return result;
        } catch (JsonProcessingException e) {
            return "";
        }
    }

    private String getToken(UriComponentsBuilder bodyUriBuilder, TokenType tokenType) {
        Boolean hasMerchantId = this.PAYPAL_MERCHANT_ID != null && !this.PAYPAL_MERCHANT_ID.isEmpty();

        String bodyUri = bodyUriBuilder.buildAndExpand().toUriString().substring(1);

        RestClient.RequestBodyUriSpec client = this.tokenHttpClient.post();

        if (hasMerchantId) {
            client.header("PayPal-Auth-Assertion", getAuthAssertionToken(PAYPAL_CLIENT_ID, PAYPAL_MERCHANT_ID));
        }

        if (tokenType == TokenType.ACCESS_TOKEN && hasMerchantId) {
            client.header("PayPal-Partner-Attribution-ID", this.PAYPAL_BN_CODE);
        }

        ResponseEntity<Map> result = client
            .uri("/v1/oauth2/token")
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .body(bodyUri)
            .retrieve()
            .toEntity(Map.class);

        String accessToken = (String) result.getBody().get("access_token");

        return accessToken;
    }

    private String getClientToken() {
        UriComponentsBuilder bodyUriBuilder = UriComponentsBuilder.newInstance()
            .queryParam("grant_type", "client_credentials")
            .queryParam("response_type", "client_token")
            .queryParam("intent", "sdk_init")
            .queryParam("domains[]", this.DOMAINS);

        String clientToken = this.getToken(bodyUriBuilder, TokenType.CLIENT_TOKEN);

        return clientToken;
    }

    private String getAccessToken() {
        UriComponentsBuilder bodyUriBuilder = UriComponentsBuilder.newInstance().queryParam("grant_type", "client_credentials");

        String accessToken = this.getToken(bodyUriBuilder, TokenType.ACCESS_TOKEN);

        return accessToken;
    }

    /* ######################################################################
     * Serve checkout page
     * ###################################################################### */

    @GetMapping("/")
    public ModelAndView getCheckout(
        @RequestParam(name = "flexible", required = false) String isFlexible,
        Model model,
        HttpServletResponse response
    ) {
        String clientToken = getClientToken();
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

    /* ######################################################################
     * Process transactions
     * ###################################################################### */

    @CrossOrigin
    @PostMapping("/transaction")
    public ResponseEntity<?> createOrder(@RequestBody Request body) {
        try {
            String accessToken = getAccessToken();

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

            ResponseEntity<Map<String, Object>> result = this.createOrder(accessToken, payload);

            Map<String, Object> response = new HashMap<>();
            response.put("result", result.getBody());

            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    public ResponseEntity<Map<String, Object>> createOrder(String accessToken, Map<String, Object> payload) {
        ResponseEntity<Map<String, Object>> result =
            this.orderHttpClient.post()
                .uri("/v2/checkout/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .headers(header -> {
                    header.add("PayPal-Request-Id", Long.toString(System.currentTimeMillis()));
                    header.add("Authorization", "Bearer " + accessToken);
                })
                .body(payload)
                .retrieve()
                .toEntity(new ParameterizedTypeReference<Map<String, Object>>() {});

        return result;
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
    public ResponseEntity<?> getSdkClientToken() {
        String clientToken = getClientToken();
        Map<String, Object> response = new HashMap<>();

        response.put("clientToken", clientToken);

        return new ResponseEntity<>(response, HttpStatus.OK);
    }
}
