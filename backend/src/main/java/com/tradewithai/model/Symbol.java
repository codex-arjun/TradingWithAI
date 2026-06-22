package com.tradewithai.model;

import jakarta.persistence.*;

@Entity
@Table(name = "symbols")
public class Symbol {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String ticker;
    
    @Column(nullable = false)
    private String name;
    
    private String type; // STOCK, CRYPTO

    public Symbol() {}

    public Symbol(String ticker, String name, String type) {
        this.ticker = ticker;
        this.name = name;
        this.type = type;
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

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }
}
