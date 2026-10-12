package com.tradewithai.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "portfolio_holdings")
public class PortfolioHolding {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String ticker;

    @Column(nullable = false)
    private String name;

    private int quantity;
    private double avgPrice;
    private double currentPrice;
    private double prevPrice;

    private String transactionType; // BUY, SELL
    private String product; // INTRADAY, DELIVERY
    
    private double targetPrice;
    private double stopLoss;

    private LocalDateTime timestamp;

    public PortfolioHolding() {}

    public PortfolioHolding(String ticker, String name, int quantity, double avgPrice, double currentPrice, String transactionType, String product, double targetPrice, double stopLoss, LocalDateTime timestamp) {
        this.ticker = ticker;
        this.name = name;
        this.quantity = quantity;
        this.avgPrice = avgPrice;
        this.currentPrice = currentPrice;
        this.prevPrice = currentPrice;
        this.transactionType = transactionType;
        this.product = product;
        this.targetPrice = targetPrice;
        this.stopLoss = stopLoss;
        this.timestamp = timestamp;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTicker() { return ticker; }
    public void setTicker(String ticker) { this.ticker = ticker; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public double getAvgPrice() { return avgPrice; }
    public void setAvgPrice(double avgPrice) { this.avgPrice = avgPrice; }

    public double getCurrentPrice() { return currentPrice; }
    public void setCurrentPrice(double currentPrice) { this.currentPrice = currentPrice; }

    public double getPrevPrice() { return prevPrice; }
    public void setPrevPrice(double prevPrice) { this.prevPrice = prevPrice; }

    public String getTransactionType() { return transactionType; }
    public void setTransactionType(String transactionType) { this.transactionType = transactionType; }

    public String getProduct() { return product; }
    public void setProduct(String product) { this.product = product; }

    public double getTargetPrice() { return targetPrice; }
    public void setTargetPrice(double targetPrice) { this.targetPrice = targetPrice; }

    public double getStopLoss() { return stopLoss; }
    public void setStopLoss(double stopLoss) { this.stopLoss = stopLoss; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
