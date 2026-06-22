package com.tradewithai.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tradewithai.service.MarketDataService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.servlet.view.RedirectView;

@RestController
public class UpstoxAuthController {

    private final MarketDataService marketDataService;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${upstox.api.key}")
    private String apiKey;

    @Value("${upstox.api.secret}")
    private String apiSecret;

    @Value("${upstox.redirect.uri}")
    private String redirectUri;

    public UpstoxAuthController(MarketDataService marketDataService) {
        this.marketDataService = marketDataService;
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    @GetMapping("/api/upstox/login")
    public RedirectView login() {
        String authUrl = "https://api.upstox.com/v2/login/authorization/dialog" +
                "?response_type=code" +
                "&client_id=" + apiKey +
                "&redirect_uri=" + redirectUri;
        return new RedirectView(authUrl);
    }

    @GetMapping("/api/upstox/callback")
    public ResponseEntity<String> callback(@RequestParam(required = false) String code, @RequestParam(required = false) String error) {
        if (error != null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("<html><body><h3>Upstox login failed: " + error + "</h3><script>setTimeout(() => window.close(), 3000);</script></body></html>");
        }

        if (code == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("<html><body><h3>Upstox code is missing</h3><script>setTimeout(() => window.close(), 3000);</script></body></html>");
        }

        try {
            // Exchange code for token
            String tokenUrl = "https://api.upstox.com/v2/login/authorization/token";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            headers.set("Accept", "application/json");

            String body = "code=" + code +
                    "&client_id=" + apiKey +
                    "&client_secret=" + apiSecret +
                    "&redirect_uri=" + redirectUri +
                    "&grant_type=authorization_code";

            HttpEntity<String> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(tokenUrl, entity, String.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                String accessToken = root.path("access_token").asText();
                
                if (accessToken != null && !accessToken.isBlank()) {
                    marketDataService.setUpstoxAccessToken(accessToken);
                    System.out.println("Upstox Access Token received and saved successfully.");
                    
                    // Return a script that posts a message to window.opener and closes itself
                    String successHtml = "<html><body>" +
                            "<div style='text-align: center; margin-top: 50px; font-family: sans-serif; color: #10b981;'>" +
                            "  <h2>Upstox Authenticated Successfully!</h2>" +
                            "  <p>This window will close automatically...</p>" +
                            "</div>" +
                            "<script>" +
                            "  if (window.opener) {" +
                            "    window.opener.postMessage({ type: 'UPSTOX_AUTH_SUCCESS' }, '*');" +
                            "  }" +
                            "  setTimeout(() => window.close(), 1200);" +
                            "</script>" +
                            "</body></html>";
                    return ResponseEntity.ok()
                            .header(HttpHeaders.CONTENT_TYPE, MediaType.TEXT_HTML_VALUE)
                            .body(successHtml);
                }
            }

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("<html><body><h3>Failed to obtain access token from Upstox response</h3><script>setTimeout(() => window.close(), 3000);</script></body></html>");

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("<html><body><h3>Error exchanging token: " + e.getMessage() + "</h3><script>setTimeout(() => window.close(), 5000);</script></body></html>");
        }
    }
}
