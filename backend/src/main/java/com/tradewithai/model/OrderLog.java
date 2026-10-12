package com.tradewithai.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "order_logs")
public class OrderLog {

    @Id
    private String id; // Order ID, e.g. ORD-12345678

    @Column(nullable = false)
    private String ticker;

    @Column(nullable = false)
    private String transactionType; // BUY, SELL

    private int quantity;
    private double price;
    private double totalCost;

    private String orderType; // MARKET, LIMIT
    private String product; // INTRADAY, DELIVERY

    private double targetPrice;
    private double stopLoss;

    private String status; // PENDING, EXECUTED, CANCELLED, REJECTED
    private LocalDateTime timestamp;

    public OrderLog() {}

    public OrderLog(String id, String ticker, String transactionType, int quantity, double price, double totalCost, String orderType, String product, double targetPrice, double stopLoss, String status, LocalDateTime timestamp) {
        this.id = id;
        this.ticker = ticker;
        this.transactionType = transactionType;
        this.quantity = quantity;
        this.price = price;
        this.totalCost = totalCost;
        this.orderType = orderType;
        this.product = product;
        this.targetPrice = targetPrice;
        this.stopLoss = stopLoss;
        this.status = status;
        this.timestamp = timestamp;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTicker() { return ticker; }
    public void setTicker(String ticker) { this.ticker = ticker; }

    public String getTransactionType() { return transactionType; }
    public void setTransactionType(String transactionType) { this.transactionType = transactionType; }

    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }

    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }

    public double getTotalCost() { return totalCost; }
    public void setTotalCost(double totalCost) { this.totalCost = totalCost; }

    public String getOrderType() { return orderType; }
    public void setOrderType(String orderType) { this.orderType = orderType; }

    public String getProduct() { return product; }
    public void setProduct(String product) { this.product = product; }

    public double getTargetPrice() { return targetPrice; }
    public void setTargetPrice(double targetPrice) { this.targetPrice = targetPrice; }

    public double getStopLoss() { return stopLoss; }
    public void setStopLoss(double stopLoss) { this.stopLoss = stopLoss; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
