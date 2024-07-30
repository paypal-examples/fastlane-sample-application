package com.fastlane.paypalsample.sample;

import io.github.cdimascio.dotenv.Dotenv;
import java.util.Map;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class OrderService {

    private final Dotenv dotenv;

    private final RestClient restClient;

    private final String PAYPAL_API_BASE_URL;

    public OrderService(RestClient.Builder restClientBuilder) {
        this.dotenv = Dotenv.load();

        this.PAYPAL_API_BASE_URL = this.dotenv.get("PAYPAL_API_BASE_URL", "https://api-m.sandbox.paypal.com");

        this.restClient = restClientBuilder.baseUrl(this.PAYPAL_API_BASE_URL).build();
    }

    public ResponseEntity<Map<String, Object>> createOrder(String accessToken, Map<String, Object> payload) {
        ResponseEntity<Map<String, Object>> result =
            this.restClient.post()
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
}
