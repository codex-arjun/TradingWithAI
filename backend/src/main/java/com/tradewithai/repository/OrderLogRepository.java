package com.tradewithai.repository;

import com.tradewithai.model.OrderLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderLogRepository extends JpaRepository<OrderLog, String> {
    List<OrderLog> findAllByOrderByTimestampDesc();
}
