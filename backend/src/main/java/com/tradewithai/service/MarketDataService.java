package com.tradewithai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tradewithai.model.PriceBar;
import com.tradewithai.repository.PriceBarRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

@Service
public class MarketDataService {

    private final PriceBarRepository priceBarRepository;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    private String upstoxAccessToken;

    private static final Map<String, String> INDEX_MAPPINGS = Map.of(
        "^NSEI", "NSE_INDEX|Nifty 50",
        "NSEI", "NSE_INDEX|Nifty 50",
        "NIFTY50", "NSE_INDEX|Nifty 50",
        "NIFTY", "NSE_INDEX|Nifty 50",
        "^BSESN", "BSE_INDEX|SENSEX",
        "BSESN", "BSE_INDEX|SENSEX",
        "SENSEX", "BSE_INDEX|SENSEX"
    );

    public MarketDataService(PriceBarRepository priceBarRepository) {
        this.priceBarRepository = priceBarRepository;
        this.objectMapper = new ObjectMapper();
        this.restTemplate = new RestTemplate();
    }

    public void setUpstoxAccessToken(String token) {
        this.upstoxAccessToken = token;
    }

    public String getUpstoxAccessToken() {
        return this.upstoxAccessToken;
    }

    public boolean isUpstoxConnected() {
        return this.upstoxAccessToken != null && !this.upstoxAccessToken.isBlank();
    }

    public List<PriceBar> getMarketData(String ticker, boolean forceRefresh) {
        return getMarketData(ticker, "1d", forceRefresh);
    }

    public List<PriceBar> getMarketData(String ticker, String interval, boolean forceRefresh) {
        interval = interval.toLowerCase().trim();
        List<PriceBar> existing = priceBarRepository.findByTickerAndBarIntervalOrderByTimestampAsc(ticker, interval);
        
        if (!existing.isEmpty() && !forceRefresh) {
            return existing;
        }

        List<PriceBar> fetched = null;
        if (isUpstoxConnected()) {
            System.out.println("Upstox Access Token is active. Fetching data from Upstox for " + ticker + "...");
            fetched = fetchUpstoxData(ticker, interval);
        }

        if (fetched == null || fetched.isEmpty()) {
            if (isUpstoxConnected()) {
                System.out.println("Upstox API failed or returned empty. Falling back to Yahoo Finance for " + ticker + "...");
            }
            fetched = fetchYahooFinanceData(ticker, interval);
        }

        if (fetched == null || fetched.isEmpty()) {
            System.out.println("Yahoo Finance API failed for " + ticker + " (interval: " + interval + "). Falling back to simulation data...");
            fetched = generateSimulatedData(ticker, interval);
        }

        // Calculate Indicators
        calculateIndicators(fetched);

        // Save to DB
        priceBarRepository.deleteByTickerAndBarInterval(ticker, interval);
        priceBarRepository.saveAll(fetched);

        return fetched;
    }

    private List<PriceBar> fetchYahooFinanceData(String ticker, String interval) {
        try {
            // Map the interval to appropriate Yahoo Finance chart range & interval
            String range = "6mo"; // Default for daily
            String yahooInterval = interval;
            
            if (interval.equals("1m")) {
                range = "1d"; // Yahoo max 7 days for 1m
            } else if (interval.equals("5m")) {
                range = "5d"; // Yahoo max 60 days for intraday
            } else if (interval.equals("10m")) {
                yahooInterval = "5m"; // Fetch 5m and merge in pairs
                range = "5d";
            } else if (interval.equals("1h")) {
                range = "1mo"; // Yahoo max 730 days for hourly
            } else if (interval.equals("1d")) {
                range = "6mo";
            } else if (interval.equals("1mo")) {
                range = "2y";
                yahooInterval = "1mo";
            } else {
                yahooInterval = "1d";
                range = "6mo";
            }

            String url = String.format("https://query1.finance.yahoo.com/v8/finance/chart/%s?range=%s&interval=%s", ticker, range, yahooInterval);

            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            if (response.getStatusCode() != HttpStatus.OK) {
                return null;
            }

            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode chart = root.path("chart");
            JsonNode resultNode = chart.path("result");
            if (resultNode.isMissingNode() || !resultNode.isArray() || resultNode.isEmpty()) {
                return null;
            }

            JsonNode dataNode = resultNode.get(0);
            JsonNode timestampNode = dataNode.path("timestamp");
            JsonNode indicatorsNode = dataNode.path("indicators");
            JsonNode quoteNode = indicatorsNode.path("quote").get(0);

            JsonNode openNode = quoteNode.path("open");
            JsonNode highNode = quoteNode.path("high");
            JsonNode lowNode = quoteNode.path("low");
            JsonNode closeNode = quoteNode.path("close");
            JsonNode volumeNode = quoteNode.path("volume");

            List<PriceBar> rawBars = new ArrayList<>();
            for (int i = 0; i < timestampNode.size(); i++) {
                if (openNode.get(i) == null || closeNode.get(i) == null || openNode.get(i).isNull() || closeNode.get(i).isNull()) {
                    continue; // Skip invalid bars
                }

                long epochSeconds = timestampNode.get(i).asLong();
                LocalDateTime ldt = LocalDateTime.ofInstant(Instant.ofEpochSecond(epochSeconds), ZoneId.systemDefault());

                PriceBar bar = new PriceBar(
                    ticker,
                    interval,
                    ldt,
                    openNode.get(i).asDouble(),
                    highNode.get(i).asDouble(),
                    lowNode.get(i).asDouble(),
                    closeNode.get(i).asDouble(),
                    volumeNode.get(i).asLong()
                );
                rawBars.add(bar);
            }

            // Sort by timestamp
            rawBars.sort(Comparator.comparing(PriceBar::getTimestamp));

            // Group 5m into 10m bars if requested
            if (interval.equals("10m")) {
                return mergeTo10mBars(rawBars, ticker);
            }

            return rawBars;
        } catch (Exception e) {
            System.err.println("Error fetching Yahoo Finance data: " + e.getMessage());
            return null;
        }
    }

    private List<PriceBar> mergeTo10mBars(List<PriceBar> rawBars, String ticker) {
        List<PriceBar> merged = new ArrayList<>();
        int i = 0;
        while (i < rawBars.size()) {
            PriceBar bar1 = rawBars.get(i);
            if (i + 1 < rawBars.size()) {
                PriceBar bar2 = rawBars.get(i + 1);
                double open = bar1.getOpenPrice();
                double close = bar2.getClosePrice();
                double high = Math.max(bar1.getHighPrice(), bar2.getHighPrice());
                double low = Math.min(bar1.getLowPrice(), bar2.getLowPrice());
                long volume = bar1.getVolume() + bar2.getVolume();
                LocalDateTime ts = bar1.getTimestamp();
                
                PriceBar mergedBar = new PriceBar(ticker, "10m", ts, open, high, low, close, volume);
                merged.add(mergedBar);
                i += 2;
            } else {
                PriceBar mergedBar = new PriceBar(ticker, "10m", bar1.getTimestamp(), bar1.getOpenPrice(), bar1.getHighPrice(), bar1.getLowPrice(), bar1.getClosePrice(), bar1.getVolume());
                merged.add(mergedBar);
                i++;
            }
        }
        return merged;
    }

    private List<PriceBar> generateSimulatedData(String ticker, String interval) {
        List<PriceBar> bars = new ArrayList<>();
        double price = getInitialPriceForTicker(ticker);
        Random random = new Random();
        LocalDateTime now = LocalDateTime.now();

        int count = 60; // default bar count
        if (interval.equals("1h")) count = 48;
        else if (interval.equals("1d")) count = 120;
        else if (interval.equals("1mo")) count = 24;

        for (int i = count; i >= 0; i--) {
            LocalDateTime timestamp;
            if (interval.equals("1m")) {
                timestamp = now.minusMinutes(i);
            } else if (interval.equals("5m")) {
                timestamp = now.minusMinutes(i * 5L);
            } else if (interval.equals("10m")) {
                timestamp = now.minusMinutes(i * 10L);
            } else if (interval.equals("1h")) {
                timestamp = now.minusHours(i);
            } else if (interval.equals("1d")) {
                timestamp = now.minusDays(i);
                // Skip weekends for daily bars
                if (timestamp.getDayOfWeek().getValue() >= 6) {
                    continue;
                }
            } else if (interval.equals("1mo")) {
                timestamp = now.minusMonths(i);
            } else {
                timestamp = now.minusDays(i);
            }

            double changePercent = (random.nextDouble() - 0.49) * 0.03;
            double open = price;
            double close = price * (1 + changePercent);
            double high = Math.max(open, close) * (1 + random.nextDouble() * 0.015);
            double low = Math.min(open, close) * (1 - random.nextDouble() * 0.015);
            long volume = 500000 + random.nextInt(9500000);

            PriceBar bar = new PriceBar(ticker, interval, timestamp, open, high, low, close, volume);
            bars.add(bar);
            price = close;
        }
        return bars;
    }

    private double getInitialPriceForTicker(String ticker) {
        return switch (ticker.toUpperCase()) {
            case "^NSEI" -> 23500.0;
            case "^BSESN" -> 77000.0;
            case "^NSEBANK" -> 51000.0;
            case "RELIANCE.NS" -> 2950.0;
            case "TCS.NS" -> 3850.0;
            case "HDFCBANK.NS" -> 1600.0;
            case "INFY.NS" -> 1480.0;
            case "SBIN.NS" -> 840.0;
            case "ICICIBANK.NS" -> 1120.0;
            case "TATAMOTORS.NS" -> 960.0;
            case "BHARTIARTL.NS" -> 1380.0;
            case "LT.NS" -> 3550.0;
            case "ITC.NS" -> 430.0;
            case "AAPL" -> 175.0;
            case "TSLA" -> 180.0;
            case "NVDA" -> 900.0;
            case "MSFT" -> 410.0;
            case "BTC-USD" -> 65000.0;
            case "ETH-USD" -> 3500.0;
            default -> 150.0;
        };
    }

    private void calculateIndicators(List<PriceBar> bars) {
        int n = bars.size();
        if (n == 0) return;

        // 1. Calculate RSI (14)
        double[] rsi = calculateRSI(bars, 14);

        // 2. Calculate MACD (12, 26, 9)
        double[][] macd = calculateMACD(bars, 12, 26, 9);

        // 3. Calculate rolling VWAP (14)
        double[] vwap = calculateRollingVWAP(bars, 14);

        for (int i = 0; i < n; i++) {
            PriceBar bar = bars.get(i);
            bar.setRsi(rsi[i] != -1 ? rsi[i] : null);
            bar.setMacdLine(macd[0][i] != -1 ? macd[0][i] : null);
            bar.setSignalLine(macd[1][i] != -1 ? macd[1][i] : null);
            bar.setMacdHist(macd[2][i] != -1 ? macd[2][i] : null);
            bar.setVwap(vwap[i]);
        }
    }

    private double[] calculateRSI(List<PriceBar> bars, int period) {
        int n = bars.size();
        double[] rsi = new double[n];
        Arrays.fill(rsi, -1);

        if (n <= period) {
            return rsi;
        }

        double[] changes = new double[n];
        for (int i = 1; i < n; i++) {
            changes[i] = bars.get(i).getClosePrice() - bars.get(i - 1).getClosePrice();
        }

        double avgGain = 0;
        double avgLoss = 0;

        // First period Average Gain/Loss
        for (int i = 1; i <= period; i++) {
            double change = changes[i];
            if (change > 0) {
                avgGain += change;
            } else {
                avgLoss += Math.abs(change);
            }
        }

        avgGain /= period;
        avgLoss /= period;

        if (avgLoss == 0) {
            rsi[period] = 100;
        } else {
            rsi[period] = 100 - (100 / (1 + (avgGain / avgLoss)));
        }

        // Wilder's smoothing
        for (int i = period + 1; i < n; i++) {
            double change = changes[i];
            double gain = change > 0 ? change : 0;
            double loss = change < 0 ? Math.abs(change) : 0;

            avgGain = (avgGain * (period - 1) + gain) / period;
            avgLoss = (avgLoss * (period - 1) + loss) / period;

            if (avgLoss == 0) {
                rsi[i] = 100;
            } else {
                rsi[i] = 100 - (100 / (1 + (avgGain / avgLoss)));
            }
        }

        return rsi;
    }

    private double[][] calculateMACD(List<PriceBar> bars, int fastPeriod, int slowPeriod, int signalPeriod) {
        int n = bars.size();
        double[] macdLine = new double[n];
        double[] signalLine = new double[n];
        double[] macdHist = new double[n];

        Arrays.fill(macdLine, -1);
        Arrays.fill(signalLine, -1);
        Arrays.fill(macdHist, -1);

        if (n < slowPeriod) {
            return new double[][]{macdLine, signalLine, macdHist};
        }

        double[] emaFast = calculateEMA(bars, fastPeriod);
        double[] emaSlow = calculateEMA(bars, slowPeriod);

        for (int i = slowPeriod - 1; i < n; i++) {
            macdLine[i] = emaFast[i] - emaSlow[i];
        }

        // Calculate Signal Line (EMA of MACD Line)
        double multiplier = 2.0 / (signalPeriod + 1);
        double currentSignal = macdLine[slowPeriod - 1]; // starting point
        signalLine[slowPeriod - 1] = currentSignal;
        macdHist[slowPeriod - 1] = macdLine[slowPeriod - 1] - signalLine[slowPeriod - 1];

        for (int i = slowPeriod; i < n; i++) {
            currentSignal = (macdLine[i] - currentSignal) * multiplier + currentSignal;
            signalLine[i] = currentSignal;
            macdHist[i] = macdLine[i] - signalLine[i];
        }

        return new double[][]{macdLine, signalLine, macdHist};
    }

    private double[] calculateEMA(List<PriceBar> bars, int period) {
        int n = bars.size();
        double[] ema = new double[n];
        double multiplier = 2.0 / (period + 1);

        // Simple SMA as starting point for first index
        double sum = 0;
        for (int i = 0; i < period; i++) {
            sum += bars.get(i).getClosePrice();
        }
        double currentEma = sum / period;
        ema[period - 1] = currentEma;

        for (int i = period; i < n; i++) {
            currentEma = (bars.get(i).getClosePrice() - currentEma) * multiplier + currentEma;
            ema[i] = currentEma;
        }

        return ema;
    }

    private double[] calculateRollingVWAP(List<PriceBar> bars, int period) {
        int n = bars.size();
        double[] vwap = new double[n];

        for (int i = 0; i < n; i++) {
            int start = Math.max(0, i - period + 1);
            double sumPv = 0;
            double sumVol = 0;

            for (int j = start; j <= i; j++) {
                PriceBar bar = bars.get(j);
                double typicalPrice = (bar.getHighPrice() + bar.getLowPrice() + bar.getClosePrice()) / 3.0;
                sumPv += typicalPrice * bar.getVolume();
                sumVol += bar.getVolume();
            }

            vwap[i] = sumVol > 0 ? (sumPv / sumVol) : bars.get(i).getClosePrice();
        }

        return vwap;
    }

    public List<Map<String, Object>> getGlobalIndices() {
        String[] tickers = {"^GSPC", "^IXIC", "^DJI", "^FTSE", "^N225"};
        String[] names = {"S&P 500", "NASDAQ", "Dow Jones", "FTSE 100", "Nikkei 225"};
        
        List<Map<String, Object>> results = new ArrayList<>();
        
        for (int i = 0; i < tickers.length; i++) {
            String ticker = tickers[i];
            String name = names[i];
            
            Map<String, Object> map = fetchIndexQuote(ticker, name);
            if (map != null) {
                results.add(map);
            } else {
                results.add(generateMockIndexQuote(ticker, name));
            }
        }
        
        return results;
    }

    private Map<String, Object> fetchIndexQuote(String ticker, String name) {
        try {
            String url = "https://query1.finance.yahoo.com/v8/finance/chart/" + ticker + "?range=2d&interval=1d";
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36");
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            if (response.getStatusCode() != HttpStatus.OK) {
                return null;
            }
            
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode resultNode = root.path("chart").path("result").get(0);
            
            JsonNode meta = resultNode.path("meta");
            double price = meta.path("regularMarketPrice").asDouble();
            double prevClose = meta.path("chartPreviousClose").asDouble();
            
            if (price == 0.0 || prevClose == 0.0) {
                JsonNode closeNode = resultNode.path("indicators").path("quote").get(0).path("close");
                if (closeNode.isArray() && closeNode.size() >= 2) {
                    prevClose = closeNode.get(0).asDouble();
                    price = closeNode.get(1).asDouble();
                } else if (closeNode.isArray() && closeNode.size() == 1) {
                    price = closeNode.get(0).asDouble();
                    prevClose = price;
                }
            }
            
            double change = price - prevClose;
            double changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0.0;
            
            Map<String, Object> map = new HashMap<>();
            map.put("symbol", ticker);
            map.put("name", name);
            map.put("price", price);
            map.put("change", change);
            map.put("changePercent", changePercent);
            return map;
        } catch (Exception e) {
            System.err.println("Error fetching index quote for " + ticker + ": " + e.getMessage());
            return null;
        }
    }

    private Map<String, Object> generateMockIndexQuote(String ticker, String name) {
        Random random = new Random();
        double price = switch (ticker) {
            case "^GSPC" -> 5300.0;
            case "^IXIC" -> 16800.0;
            case "^DJI" -> 39000.0;
            case "^FTSE" -> 8200.0;
            case "^N225" -> 38500.0;
            default -> 1000.0;
        };
        
        double changePercent = (random.nextDouble() - 0.48) * 1.5;
        double change = price * (changePercent / 100);
        price += change;
        
        Map<String, Object> map = new HashMap<>();
        map.put("symbol", ticker);
        map.put("name", name);
        map.put("price", price);
        map.put("change", change);
        map.put("changePercent", changePercent);
        return map;
    }

    private List<PriceBar> fetchUpstoxData(String ticker, String interval) {
        try {
            String instrumentKey = resolveInstrumentKey(ticker);
            if (instrumentKey == null) {
                System.err.println("Could not resolve Upstox instrument key for ticker: " + ticker);
                return null;
            }

            String upstoxInterval = mapIntervalToUpstox(interval);
            
            // Format dates
            java.time.format.DateTimeFormatter dtf = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd");
            LocalDateTime now = LocalDateTime.now();
            String toDate = now.format(dtf);
            
            LocalDateTime fromDateLdt;
            if (interval.equals("1m")) {
                fromDateLdt = now.minusDays(1);
            } else if (interval.equals("5m") || interval.equals("10m")) {
                fromDateLdt = now.minusDays(5);
            } else if (interval.equals("1h")) {
                fromDateLdt = now.minusDays(30);
            } else if (interval.equals("1mo")) {
                fromDateLdt = now.minusYears(2);
            } else {
                fromDateLdt = now.minusMonths(6);
            }
            String fromDate = fromDateLdt.format(dtf);

            String url = String.format("https://api.upstox.com/v2/historical-candle/%s/%s/%s/%s",
                    instrumentKey, upstoxInterval, toDate, fromDate);

            System.out.println("Querying Upstox API: " + url);

            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + upstoxAccessToken);
            headers.set("Accept", "application/json");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null) {
                System.err.println("Upstox Historical API returned status: " + response.getStatusCode());
                return null;
            }

            JsonNode root = objectMapper.readTree(response.getBody());
            if (!"success".equalsIgnoreCase(root.path("status").asText())) {
                System.err.println("Upstox Historical API returned error status: " + root.path("status").asText());
                return null;
            }

            JsonNode candlesNode = root.path("data").path("candles");
            if (!candlesNode.isArray() || candlesNode.isEmpty()) {
                System.err.println("Upstox Historical API returned no candles.");
                return null;
            }

            List<PriceBar> bars = new ArrayList<>();
            // Upstox returns candles in descending order (newest first). Parse and reverse to ascending order.
            for (JsonNode candle : candlesNode) {
                if (candle.isArray() && candle.size() >= 6) {
                    String timeStr = candle.get(0).asText(); // e.g. "2026-06-22T00:00:00+05:30"
                    
                    // Parse timezone aware ISO offset datetime
                    java.time.OffsetDateTime odt = java.time.OffsetDateTime.parse(timeStr);
                    LocalDateTime ldt = odt.toLocalDateTime();
                    
                    double open = candle.get(1).asDouble();
                    double high = candle.get(2).asDouble();
                    double low = candle.get(3).asDouble();
                    double close = candle.get(4).asDouble();
                    long volume = candle.get(5).asLong();

                    PriceBar bar = new PriceBar(ticker, interval, ldt, open, high, low, close, volume);
                    bars.add(bar);
                }
            }

            // Reverse to make it ascending (chronological order)
            Collections.reverse(bars);

            // Handle 10m interval merging (since Upstox doesn't support 10m natively, we fetched 5m)
            if (interval.equals("10m")) {
                bars = mergeTo10mBars(bars, ticker);
            }

            return bars;
        } catch (Exception e) {
            System.err.println("Error fetching historical candle data from Upstox: " + e.getMessage());
            e.printStackTrace();
            return null;
        }
    }

    private String resolveInstrumentKey(String ticker) {
        String upper = ticker.toUpperCase().trim();
        
        // 1. Check hardcoded indices
        if (INDEX_MAPPINGS.containsKey(upper)) {
            return INDEX_MAPPINGS.get(upper);
        }
        
        // 2. Query Search API
        try {
            // Strip suffixes like .NS or .BO
            String searchSymbol = upper;
            if (upper.endsWith(".NS")) {
                searchSymbol = upper.substring(0, upper.length() - 3);
            } else if (upper.endsWith(".BO")) {
                searchSymbol = upper.substring(0, upper.length() - 3);
            }
            
            String url = "https://api.upstox.com/v2/instruments/search?query=" + searchSymbol;
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + upstoxAccessToken);
            headers.set("Accept", "application/json");
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode dataNode = root.path("data");
                
                if (dataNode.isArray() && !dataNode.isEmpty()) {
                    // Look for exact match first
                    for (JsonNode node : dataNode) {
                        String symbol = node.path("symbol").asText();
                        if (symbol.equalsIgnoreCase(searchSymbol)) {
                            return node.path("instrument_key").asText();
                        }
                    }
                    // Fallback to first search result
                    return dataNode.get(0).path("instrument_key").asText();
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to resolve Upstox instrument key for " + ticker + ": " + e.getMessage());
        }
        return null;
    }

    public Map<String, Object> resolveInstrumentDetails(String ticker) {
        Map<String, Object> details = new HashMap<>();
        String upper = ticker.toUpperCase().trim();
        
        int lotSize = 1;
        String name = upper;
        String tradingSymbol = upper;
        String type = "EQUITY";
        
        boolean isOption = upper.contains(" CE") || upper.contains(" PE");
        
        if (isOption) {
            type = "OPTION";
            String[] parts = upper.split(" ");
            String underlying = parts[0];
            if (underlying.contains("NIFTY") && !underlying.contains("BANK") && !underlying.contains("FIN")) {
                lotSize = 75; // Nifty lot size is 75 as requested by user
            } else if (underlying.contains("BANKNIFTY") || underlying.contains("BANK")) {
                lotSize = 15; // Bank Nifty lot size is 15
            } else if (underlying.contains("SENSEX") || underlying.contains("BSESN")) {
                lotSize = 20; // Sensex lot size is 20
            } else if (underlying.contains("FINNIFTY")) {
                lotSize = 40;
            } else {
                lotSize = getStockOptionLotSize(underlying);
            }
        }
        
        details.put("ticker", ticker);
        details.put("lotSize", lotSize);
        details.put("name", name);
        details.put("tradingSymbol", tradingSymbol);
        details.put("type", type);
        details.put("instrumentKey", null);
        details.put("source", "SIMULATED");

        if (isUpstoxConnected()) {
            try {
                String searchSymbol = upper;
                if (upper.endsWith(".NS")) {
                    searchSymbol = upper.substring(0, upper.length() - 3);
                } else if (upper.endsWith(".BO")) {
                    searchSymbol = upper.substring(0, upper.length() - 3);
                }
                
                String url = "https://api.upstox.com/v2/instruments/search?query=" + searchSymbol;
                
                HttpHeaders headers = new HttpHeaders();
                headers.set("Authorization", "Bearer " + upstoxAccessToken);
                headers.set("Accept", "application/json");
                HttpEntity<String> entity = new HttpEntity<>(headers);
                
                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
                if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                    JsonNode root = objectMapper.readTree(response.getBody());
                    JsonNode dataNode = root.path("data");
                    
                    if (dataNode.isArray() && !dataNode.isEmpty()) {
                        JsonNode matchedNode = null;
                        for (JsonNode node : dataNode) {
                            String symbol = node.path("trading_symbol").asText();
                            if (symbol.equalsIgnoreCase(searchSymbol) || symbol.equalsIgnoreCase(upper)) {
                                matchedNode = node;
                                break;
                            }
                        }
                        if (matchedNode == null) {
                            matchedNode = dataNode.get(0);
                        }
                        
                        details.put("instrumentKey", matchedNode.path("instrument_key").asText());
                        details.put("name", matchedNode.path("name").asText(name));
                        details.put("tradingSymbol", matchedNode.path("trading_symbol").asText(tradingSymbol));
                        details.put("type", matchedNode.path("instrument_type").asText(type));
                        details.put("source", "UPSTOX");

                        // Override Upstox's incorrect index F&O lot sizes with correct NSE/BSE lot sizes.
                        // For stocks, use Upstox's resolved lot size.
                        boolean isIndexOption = isOption && (
                            upper.contains("NIFTY") || upper.contains("BANKNIFTY") || 
                            upper.contains("BANK") || upper.contains("SENSEX") || 
                            upper.contains("BSESN") || upper.contains("FINNIFTY")
                        );
                        
                        if (isIndexOption) {
                            details.put("lotSize", lotSize); // Enforce Nifty=75, BankNifty=15, Sensex=20
                        } else {
                            details.put("lotSize", matchedNode.path("lot_size").asInt(lotSize));
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("Failed to resolve Upstox instrument details: " + e.getMessage());
            }
        }
        
        return details;
    }
    
    private int getStockOptionLotSize(String underlying) {
        return switch (underlying) {
            case "RELIANCE" -> 250;
            case "TCS" -> 175;
            case "INFY" -> 400;
            case "SBIN" -> 750;
            case "HDFCBANK" -> 550;
            case "ICICIBANK" -> 700;
            case "TATAMOTORS" -> 1425;
            case "ITC" -> 1600;
            case "LT" -> 300;
            case "BHARTIARTL" -> 950;
            default -> 100;
        };
    }

    private String mapIntervalToUpstox(String interval) {
        switch (interval.toLowerCase()) {
            case "1m": return "1minute";
            case "5m": return "5minute";
            case "10m": return "5minute"; // will merge in Java
            case "1h": return "30minute";
            case "1d": return "day";
            case "1mo": return "month";
            default: return "day";
        }
    }

    public Map<String, Object> placeOrder(String ticker, String transactionType, int quantity, double price, String orderType, String product) {
        Map<String, Object> result = new HashMap<>();
        String status = "SUCCESS";
        String message = "Simulated Order executed successfully.";
        String orderId = "ORD-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        double executedPrice = price;

        // Try using Upstox API if connected
        if (isUpstoxConnected()) {
            try {
                String instrumentKey = resolveInstrumentKey(ticker);
                if (instrumentKey != null) {
                    String url = "https://api.upstox.com/v2/order/place";
                    
                    HttpHeaders headers = new HttpHeaders();
                    headers.set("Authorization", "Bearer " + upstoxAccessToken);
                    headers.set("Content-Type", "application/json");
                    headers.set("Accept", "application/json");

                    Map<String, Object> payload = new HashMap<>();
                    payload.put("quantity", quantity);
                    payload.put("product", "INTRADAY".equalsIgnoreCase(product) ? "I" : "D");
                    payload.put("validity", "DAY");
                    payload.put("price", price);
                    payload.put("tag", "tradewithAI");
                    payload.put("instrument_token", instrumentKey);
                    payload.put("order_type", orderType.toUpperCase());
                    payload.put("transaction_type", transactionType.toUpperCase());
                    payload.put("disclosed_quantity", 0);
                    payload.put("trigger_price", 0.0);
                    payload.put("is_amo", false);

                    HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
                    ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
                    
                    if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                        JsonNode root = objectMapper.readTree(response.getBody());
                        if ("success".equalsIgnoreCase(root.path("status").asText())) {
                            orderId = root.path("data").path("order_id").asText(orderId);
                            message = "Upstox Order Placed Successfully.";
                        } else {
                            status = "FAILED";
                            message = root.path("errors").get(0).path("message").asText("Upstox rejected order.");
                        }
                    } else {
                        status = "FAILED";
                        message = "Upstox API returned: " + response.getStatusCode();
                    }
                } else {
                    message = "Simulated Order executed successfully (Could not resolve Upstox instrument key for " + ticker + ").";
                }
            } catch (Exception e) {
                System.err.println("Upstox Order Placement failed: " + e.getMessage());
                message = "Simulated Order executed (Upstox API failed: " + e.getMessage() + ").";
            }
        }

        // Prefill mock price if price is 0.0 (MARKET order)
        if (executedPrice <= 0.0) {
            // Get last close price as mock execution price
            List<PriceBar> bars = priceBarRepository.findByTickerAndBarIntervalOrderByTimestampAsc(ticker, "1d");
            if (!bars.isEmpty()) {
                executedPrice = bars.get(bars.size() - 1).getClosePrice();
            } else {
                executedPrice = 100.0; // default fallback
            }
        }

        result.put("status", status);
        result.put("message", message);
        result.put("orderId", orderId);
        result.put("ticker", ticker);
        result.put("transactionType", transactionType);
        result.put("quantity", quantity);
        result.put("price", executedPrice);
        result.put("orderType", orderType);
        result.put("product", product);
        result.put("totalCost", executedPrice * quantity);
        result.put("timestamp", LocalDateTime.now().toString());

        return result;
    }
}
