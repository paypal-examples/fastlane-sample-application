package com.fastlane.paypalsample.sample.models;

public class ClientTokenResponse {

    private String clientToken;
    private String clientId;
    private String paypalSdkBaseUrl;

    public ClientTokenResponse(String clientId, String clientToken, String paypalSdkBaseUrl) {
        this.clientId = clientId;
        this.clientToken = clientToken;
        this.paypalSdkBaseUrl = paypalSdkBaseUrl;
    }

    public String getClientToken() {
        return clientToken;
    }

    public void setClientToken(String clientToken) {
        this.clientToken = clientToken;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getPaypalSdkBaseUrl() {
        return paypalSdkBaseUrl;
    }

    public void setPaypalSdkBaseUrl(String paypalSdkBaseUrl) {
        this.paypalSdkBaseUrl = paypalSdkBaseUrl;
    }
}
