package com.tradewithai.repository;

import com.tradewithai.model.PriceBar;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface PriceBarRepository extends JpaRepository<PriceBar, Long> {
    List<PriceBar> findByTickerAndBarIntervalOrderByTimestampAsc(String ticker, String barInterval);
    
    @Transactional
    void deleteByTickerAndBarInterval(String ticker, String barInterval);
}
