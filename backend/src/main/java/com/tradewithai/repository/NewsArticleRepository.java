package com.tradewithai.repository;

import com.tradewithai.model.NewsArticle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface NewsArticleRepository extends JpaRepository<NewsArticle, Long> {
    List<NewsArticle> findByTickerOrderByPublishedAtDesc(String ticker);
    
    @Transactional
    void deleteByTicker(String ticker);
}
