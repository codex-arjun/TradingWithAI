package com.tradewithai.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ai_decision_logs")
public class AiDecisionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String ticker;

    private LocalDateTime timestamp;
    private double spotPrice;

    private String fingptAction; // BUY, SELL, HOLD
    private double fingptConfidence;

    @Column(columnDefinition = "TEXT")
    private String fingptReasoning;

    private boolean geminiApproved;
    private int geminiQuantity;
    private String geminiAction; // BUY, SELL, HOLD
    private boolean geminiTrailStop;
    private double geminiBookProfitAt;

    @Column(columnDefinition = "TEXT")
    private String geminiReasoning;

    @Column(columnDefinition = "TEXT")
    private String rawFinGPTResponse;

    @Column(columnDefinition = "TEXT")
    private String rawGeminiResponse;

    public AiDecisionLog() {}

    public AiDecisionLog(String ticker, LocalDateTime timestamp, double spotPrice, String fingptAction, double fingptConfidence, String fingptReasoning, boolean geminiApproved, int geminiQuantity, String geminiAction, boolean geminiTrailStop, double geminiBookProfitAt, String geminiReasoning, String rawFinGPTResponse, String rawGeminiResponse) {
        this.ticker = ticker;
        this.timestamp = timestamp;
        this.spotPrice = spotPrice;
        this.fingptAction = fingptAction;
        this.fingptConfidence = fingptConfidence;
        this.fingptReasoning = fingptReasoning;
        this.geminiApproved = geminiApproved;
        this.geminiQuantity = geminiQuantity;
        this.geminiAction = geminiAction;
        this.geminiTrailStop = geminiTrailStop;
        this.geminiBookProfitAt = geminiBookProfitAt;
        this.geminiReasoning = geminiReasoning;
        this.rawFinGPTResponse = rawFinGPTResponse;
        this.rawGeminiResponse = rawGeminiResponse;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTicker() { return ticker; }
    public void setTicker(String ticker) { this.ticker = ticker; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public double getSpotPrice() { return spotPrice; }
    public void setSpotPrice(double spotPrice) { this.spotPrice = spotPrice; }

    public String getFingptAction() { return fingptAction; }
    public void setFingptAction(String fingptAction) { this.fingptAction = fingptAction; }

    public double getFingptConfidence() { return fingptConfidence; }
    public void setFingptConfidence(double fingptConfidence) { this.fingptConfidence = fingptConfidence; }

    public String getFingptReasoning() { return fingptReasoning; }
    public void setFingptReasoning(String fingptReasoning) { this.fingptReasoning = fingptReasoning; }

    public boolean isGeminiApproved() { return geminiApproved; }
    public void setGeminiApproved(boolean geminiApproved) { this.geminiApproved = geminiApproved; }

    public int getGeminiQuantity() { return geminiQuantity; }
    public void setGeminiQuantity(int geminiQuantity) { this.geminiQuantity = geminiQuantity; }

    public String getGeminiAction() { return geminiAction; }
    public void setGeminiAction(String geminiAction) { this.geminiAction = geminiAction; }

    public boolean isGeminiTrailStop() { return geminiTrailStop; }
    public void setGeminiTrailStop(boolean geminiTrailStop) { this.geminiTrailStop = geminiTrailStop; }

    public double getGeminiBookProfitAt() { return geminiBookProfitAt; }
    public void setGeminiBookProfitAt(double geminiBookProfitAt) { this.geminiBookProfitAt = geminiBookProfitAt; }

    public String getGeminiReasoning() { return geminiReasoning; }
    public void setGeminiReasoning(String geminiReasoning) { this.geminiReasoning = geminiReasoning; }

    public String getRawFinGPTResponse() { return rawFinGPTResponse; }
    public void setRawFinGPTResponse(String rawFinGPTResponse) { this.rawFinGPTResponse = rawFinGPTResponse; }

    public String getRawGeminiResponse() { return rawGeminiResponse; }
    public void setRawGeminiResponse(String rawGeminiResponse) { this.rawGeminiResponse = rawGeminiResponse; }
}
