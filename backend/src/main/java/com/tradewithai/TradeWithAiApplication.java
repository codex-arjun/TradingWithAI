package com.tradewithai;

import com.tradewithai.model.Symbol;
import com.tradewithai.repository.SymbolRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class TradeWithAiApplication {

    public static void main(String[] args) {
        SpringApplication.run(TradeWithAiApplication.class, args);
    }

    @Bean
    public CommandLineRunner seedDatabase(SymbolRepository symbolRepository, org.springframework.jdbc.core.JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                jdbcTemplate.execute("ALTER TABLE news_articles MODIFY url VARCHAR(2048)");
                System.out.println("Successfully altered news_articles url column to VARCHAR(2048) in MySQL.");
            } catch (Exception e) {
                System.out.println("Note: Could not alter news_articles table. " + e.getMessage());
            }

            symbolRepository.deleteAll();
            System.out.println("Seeding Indian Market watchlist symbols in MySQL for tradewithAI...");
            symbolRepository.save(new Symbol("^NSEI", "NSE Nifty 50 Index", "INDEX"));
            symbolRepository.save(new Symbol("^BSESN", "BSE SENSEX Index", "INDEX"));
            symbolRepository.save(new Symbol("^NSEBANK", "NSE Bank Nifty Index", "INDEX"));
            symbolRepository.save(new Symbol("RELIANCE.NS", "Reliance Industries Ltd.", "STOCK"));
            symbolRepository.save(new Symbol("TCS.NS", "Tata Consultancy Services Ltd.", "STOCK"));
            symbolRepository.save(new Symbol("HDFCBANK.NS", "HDFC Bank Ltd.", "STOCK"));
            symbolRepository.save(new Symbol("INFY.NS", "Infosys Ltd.", "STOCK"));
            symbolRepository.save(new Symbol("SBIN.NS", "State Bank of India", "STOCK"));
            symbolRepository.save(new Symbol("ICICIBANK.NS", "ICICI Bank Ltd.", "STOCK"));
            symbolRepository.save(new Symbol("TATAMOTORS.NS", "Tata Motors Ltd.", "STOCK"));
            symbolRepository.save(new Symbol("BHARTIARTL.NS", "Bharti Airtel Ltd.", "STOCK"));
            symbolRepository.save(new Symbol("LT.NS", "Larsen & Toubro Ltd.", "STOCK"));
            symbolRepository.save(new Symbol("ITC.NS", "ITC Ltd.", "STOCK"));
            System.out.println("Indian Watchlist seeded successfully.");
        };
    }
}
