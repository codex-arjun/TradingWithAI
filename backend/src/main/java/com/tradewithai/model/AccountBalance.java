package com.tradewithai.model;

import jakarta.persistence.*;

@Entity
@Table(name = "account_balances")
public class AccountBalance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private double availableMargin;
    private double totalBalance;
    private double initialBalance;
    private double realizedTodayPnl;

    public AccountBalance() {}

    public AccountBalance(double availableMargin, double totalBalance, double initialBalance) {
        this.availableMargin = availableMargin;
        this.totalBalance = totalBalance;
        this.initialBalance = initialBalance;
        this.realizedTodayPnl = 0.0;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public double getAvailableMargin() { return availableMargin; }
    public void setAvailableMargin(double availableMargin) { this.availableMargin = availableMargin; }

    public double getTotalBalance() { return totalBalance; }
    public void setTotalBalance(double totalBalance) { this.totalBalance = totalBalance; }

    public double getInitialBalance() { return initialBalance; }
    public void setInitialBalance(double initialBalance) { this.initialBalance = initialBalance; }

    public double getRealizedTodayPnl() { return realizedTodayPnl; }
    public void setRealizedTodayPnl(double realizedTodayPnl) { this.realizedTodayPnl = realizedTodayPnl; }
}
