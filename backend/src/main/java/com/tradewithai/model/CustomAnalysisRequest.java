package com.tradewithai.model;

public class CustomAnalysisRequest {
    private String ticker;
    private String query;
    private Double optionStrike;
    private String optionType; // CALL, PUT, NONE
    private String optionExpiry;

    public CustomAnalysisRequest() {}

    public String getTicker() {
        return ticker;
    }

    public void setTicker(String ticker) {
        this.ticker = ticker;
    }

    public String getQuery() {
        return query;
    }

    public void setQuery(String query) {
        this.query = query;
    }

    public Double getOptionStrike() {
        return optionStrike;
    }

    public void setOptionStrike(Double optionStrike) {
        this.optionStrike = optionStrike;
    }

    public String getOptionType() {
        return optionType;
    }

    public void setOptionType(String optionType) {
        this.optionType = optionType;
    }

    public String getOptionExpiry() {
        return optionExpiry;
    }

    public void setOptionExpiry(String optionExpiry) {
        this.optionExpiry = optionExpiry;
    }
}
