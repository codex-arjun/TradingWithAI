package com.tradewithai.repository;

import com.tradewithai.model.AiDecisionLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AiDecisionLogRepository extends JpaRepository<AiDecisionLog, Long> {
    List<AiDecisionLog> findAllByOrderByTimestampDesc();
    List<AiDecisionLog> findByTickerOrderByTimestampDesc(String ticker);
}
