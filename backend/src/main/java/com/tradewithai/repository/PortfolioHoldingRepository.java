package com.tradewithai.repository;

import com.tradewithai.model.PortfolioHolding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PortfolioHoldingRepository extends JpaRepository<PortfolioHolding, Long> {
    Optional<PortfolioHolding> findByTicker(String ticker);
    void deleteByTicker(String ticker);
}
