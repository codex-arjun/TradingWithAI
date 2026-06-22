package com.tradewithai.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ai_recommendations")
public class AiRecommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String ticker;

    @Column(nullable = false)
    private String tradeType; // INTRADAY, LONG_TERM

    @Column(nullable = false)
    private String action; // BUY, SELL, HOLD

    private double entryPrice;
    private double stopLoss;
    private double profitTarget;
    private double riskPercentage;
    private String holdDuration;
    private String optionSuggest;

    @Column(columnDefinition = "TEXT")
    private String reasoning;

    private LocalDateTime generatedAt;

    public AiRecommendation() {}

    public AiRecommendation(String ticker, String tradeType, String action, double entryPrice, double stopLoss, double profitTarget, double riskPercentage, String holdDuration, String optionSuggest, String reasoning, LocalDateTime generatedAt) {
        this.ticker = ticker;
        this.tradeType = tradeType;
        this.action = action;
        this.entryPrice = entryPrice;
        this.stopLoss = stopLoss;
        this.profitTarget = profitTarget;
        this.riskPercentage = riskPercentage;
        this.holdDuration = holdDuration;
        this.optionSuggest = optionSuggest;
        this.reasoning = reasoning;
        this.generatedAt = generatedAt;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTicker() {
        return ticker;
    }

    public void setTicker(String ticker) {
        this.ticker = ticker;
    }

    public String getTradeType() {
        return tradeType;
    }

    public void setTradeType(String tradeType) {
        this.tradeType = tradeType;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public double getEntryPrice() {
        return entryPrice;
    }

    public void setEntryPrice(double entryPrice) {
        this.entryPrice = entryPrice;
    }

    public double getStopLoss() {
        return stopLoss;
    }

    public void setStopLoss(double stopLoss) {
        this.stopLoss = stopLoss;
    }

    public double getProfitTarget() {
        return profitTarget;
    }

    public void setProfitTarget(double profitTarget) {
        this.profitTarget = profitTarget;
    }

    public double getRiskPercentage() {
        return riskPercentage;
    }

    public void setRiskPercentage(double riskPercentage) {
        this.riskPercentage = riskPercentage;
    }

    public String getHoldDuration() {
        return holdDuration;
    }

    public void setHoldDuration(String holdDuration) {
        this.holdDuration = holdDuration;
    }

    public String getReasoning() {
        return reasoning;
    }

    public void setReasoning(String reasoning) {
        this.reasoning = reasoning;
    }

    public String getOptionSuggest() {
        return optionSuggest;
    }

    public void setOptionSuggest(String optionSuggest) {
        this.optionSuggest = optionSuggest;
    }

    public LocalDateTime getGeneratedAt() {
        return generatedAt;
    }

    public void setGeneratedAt(LocalDateTime generatedAt) {
        this.generatedAt = generatedAt;
    }
}
