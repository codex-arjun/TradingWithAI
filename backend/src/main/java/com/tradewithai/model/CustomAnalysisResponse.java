package com.tradewithai.model;

public class CustomAnalysisResponse {
    private String ticker;
    private String direction; // UP, DOWN, STAGNANT
    private double probability; // e.g. 75.5%
    private double targetPrice;
    private double stopLoss;
    private String explanation;
    private String query;

    public CustomAnalysisResponse() {}

    public CustomAnalysisResponse(String ticker, String direction, double probability, double targetPrice, double stopLoss, String explanation, String query) {
        this.ticker = ticker;
        this.direction = direction;
        this.probability = probability;
        this.targetPrice = targetPrice;
        this.stopLoss = stopLoss;
        this.explanation = explanation;
        this.query = query;
    }

    public String getTicker() {
        return ticker;
    }

    public void setTicker(String ticker) {
        this.ticker = ticker;
    }

    public String getDirection() {
        return direction;
    }

    public void setDirection(String direction) {
        this.direction = direction;
    }

    public double getProbability() {
        return probability;
    }

    public void setProbability(double probability) {
        this.probability = probability;
    }

    public double getTargetPrice() {
        return targetPrice;
    }

    public void setTargetPrice(double targetPrice) {
        this.targetPrice = targetPrice;
    }

    public double getStopLoss() {
        return stopLoss;
    }

    public void setStopLoss(double stopLoss) {
        this.stopLoss = stopLoss;
    }

    public String getExplanation() {
        return explanation;
    }

    public void setExplanation(String explanation) {
        this.explanation = explanation;
    }

    public String getQuery() {
        return query;
    }

    public void setQuery(String query) {
        this.query = query;
    }
}
