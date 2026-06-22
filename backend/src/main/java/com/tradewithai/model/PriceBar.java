package com.tradewithai.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "price_bars", indexes = {
    @Index(name = "idx_ticker_interval_timestamp", columnList = "ticker, barInterval, timestamp")
})
public class PriceBar {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String ticker;

    @Column(nullable = false)
    private String barInterval = "1d";

    @Column(nullable = false)
    private LocalDateTime timestamp;

    private double openPrice;
    private double highPrice;
    private double lowPrice;
    private double closePrice;
    private long volume;
    private double vwap;
    private Double rsi;
    private Double macdLine;
    private Double signalLine;
    private Double macdHist;

    public PriceBar() {}

    public PriceBar(String ticker, String barInterval, LocalDateTime timestamp, double openPrice, double highPrice, double lowPrice, double closePrice, long volume) {
        this.ticker = ticker;
        this.barInterval = barInterval;
        this.timestamp = timestamp;
        this.openPrice = openPrice;
        this.highPrice = highPrice;
        this.lowPrice = lowPrice;
        this.closePrice = closePrice;
        this.volume = volume;
    }

    public PriceBar(String ticker, LocalDateTime timestamp, double openPrice, double highPrice, double lowPrice, double closePrice, long volume) {
        this.ticker = ticker;
        this.barInterval = "1d";
        this.timestamp = timestamp;
        this.openPrice = openPrice;
        this.highPrice = highPrice;
        this.lowPrice = lowPrice;
        this.closePrice = closePrice;
        this.volume = volume;
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

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public double getOpenPrice() {
        return openPrice;
    }

    public void setOpenPrice(double openPrice) {
        this.openPrice = openPrice;
    }

    public double getHighPrice() {
        return highPrice;
    }

    public void setHighPrice(double highPrice) {
        this.highPrice = highPrice;
    }

    public double getLowPrice() {
        return lowPrice;
    }

    public void setLowPrice(double lowPrice) {
        this.lowPrice = lowPrice;
    }

    public double getClosePrice() {
        return closePrice;
    }

    public void setClosePrice(double closePrice) {
        this.closePrice = closePrice;
    }

    public long getVolume() {
        return volume;
    }

    public void setVolume(long volume) {
        this.volume = volume;
    }

    public double getVwap() {
        return vwap;
    }

    public void setVwap(double vwap) {
        this.vwap = vwap;
    }

    public Double getRsi() {
        return rsi;
    }

    public void setRsi(Double rsi) {
        this.rsi = rsi;
    }

    public Double getMacdLine() {
        return macdLine;
    }

    public void setMacdLine(Double macdLine) {
        this.macdLine = macdLine;
    }

    public Double getSignalLine() {
        return signalLine;
    }

    public void setSignalLine(Double signalLine) {
        this.signalLine = signalLine;
    }

    public Double getMacdHist() {
        return macdHist;
    }

    public void setMacdHist(Double macdHist) {
        this.macdHist = macdHist;
    }

    public String getBarInterval() {
        return barInterval;
    }

    public void setBarInterval(String barInterval) {
        this.barInterval = barInterval;
    }
}
