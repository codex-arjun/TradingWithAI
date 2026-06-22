package com.tradewithai.repository;

import com.tradewithai.model.AiRecommendation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface AiRecommendationRepository extends JpaRepository<AiRecommendation, Long> {
    List<AiRecommendation> findByTickerOrderByGeneratedAtDesc(String ticker);
    
    @Transactional
    void deleteByTicker(String ticker);
}
