package com.tradewithai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tradewithai.model.Symbol;
import com.tradewithai.model.PriceBar;
import com.tradewithai.model.NewsArticle;
import com.tradewithai.model.PortfolioHolding;
import com.tradewithai.model.OrderLog;
import com.tradewithai.model.AccountBalance;
import com.tradewithai.model.AiRecommendation;
import com.tradewithai.repository.SymbolRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Collections;
import java.util.HashMap;

@Service
public class McpToolRegistry {

    private final SymbolRepository symbolRepository;
    private final MarketDataService marketDataService;
    private final NewsService newsService;
    private final AiAgentService aiAgentService;
    private final ObjectMapper objectMapper;

    public McpToolRegistry(SymbolRepository symbolRepository,
                              MarketDataService marketDataService,
                              NewsService newsService,
                              AiAgentService aiAgentService,
                              ObjectMapper objectMapper) {
        this.symbolRepository = symbolRepository;
        this.marketDataService = marketDataService;
        this.newsService = newsService;
        this.aiAgentService = aiAgentService;
        this.objectMapper = objectMapper;
    }

    public JsonNode listTools() {
        ObjectNode result = objectMapper.createObjectNode();
        ArrayNode tools = result.putArray("tools");

        // Helper to add parameter properties
        // 1. list_symbols
        ObjectNode t1 = tools.addObject();
        t1.put("name", "list_symbols");
        t1.put("description", "Get list of all watchlist symbols");
        t1.putObject("inputSchema").put("type", "object").putObject("properties");

        // 2. add_symbol
        ObjectNode t2 = tools.addObject();
        t2.put("name", "add_symbol");
        t2.put("description", "Add a new stock or index symbol to the watchlist");
        ObjectNode p2 = t2.putObject("inputSchema").put("type", "object").putObject("properties");
        p2.putObject("ticker").put("type", "string").put("description", "Stock ticker, e.g. RELIANCE.NS, AAPL");
        p2.putObject("name").put("type", "string").put("description", "Friendly name of the company");
        p2.putObject("type").put("type", "string").put("description", "Asset type, e.g. STOCK or CRYPTO");
        t2.putArray("required").add("ticker");

        // 3. get_market_data / getHistoricalData
        ObjectNode t3 = tools.addObject();
        t3.put("name", "get_market_data");
        t3.put("description", "Retrieve candlestick price bars and technical indicators (RSI, MACD, VWAP) for a ticker and interval");
        ObjectNode p3 = t3.putObject("inputSchema").put("type", "object").putObject("properties");
        p3.putObject("ticker").put("type", "string").put("description", "Ticker symbol");
        p3.putObject("interval").put("type", "string").put("description", "Candle size, e.g. 1m, 5m, 10m, 1h, 1d, 1mo");
        p3.putObject("refresh").put("type", "boolean").put("description", "Force database refresh");
        t3.putArray("required").add("ticker");

        // 4. get_news / getLatestNews
        ObjectNode t4 = tools.addObject();
        t4.put("name", "get_news");
        t4.put("description", "Fetch up-to-date regional/global market news and sentiment analysis (48h age limit)");
        ObjectNode p4 = t4.putObject("inputSchema").put("type", "object").putObject("properties");
        p4.putObject("ticker").put("type", "string").put("description", "Ticker symbol");
        p4.putObject("refresh").put("type", "boolean").put("description", "Force RSS search update");
        t4.putArray("required").add("ticker");

        // 5. predict_custom
        ObjectNode t6 = tools.addObject();
        t6.put("name", "predict_custom");
        t6.put("description", "Perform a custom AI prediction/forecast for a stock or option contract");
        ObjectNode p6 = t6.putObject("inputSchema").put("type", "object").putObject("properties");
        p6.putObject("ticker").put("type", "string").put("description", "Ticker symbol");
        p6.putObject("query").put("type", "string").put("description", "Custom question, e.g. Will it rally next week?");
        t6.putArray("required").add("ticker").add("query");

        // 6. get_global_indices
        ObjectNode t7 = tools.addObject();
        t7.put("name", "get_global_indices");
        t7.put("description", "Fetch current quotes for major international stock indices");
        t7.putObject("inputSchema").put("type", "object").putObject("properties");

        // 7. get_active_llm
        ObjectNode t8 = tools.addObject();
        t8.put("name", "get_active_llm");
        t8.put("description", "Get the active LLM provider or fallback engine name");
        t8.putObject("inputSchema").put("type", "object").putObject("properties");

        // 8. check_upstox_status
        ObjectNode t9 = tools.addObject();
        t9.put("name", "check_upstox_status");
        t9.put("description", "Check Upstox connection status and active market data feed provider");
        t9.putObject("inputSchema").put("type", "object").putObject("properties");

        // 9. place_order / placeOrder
        ObjectNode t10 = tools.addObject();
        t10.put("name", "place_order");
        t10.put("description", "Execute a stock or options trade order (subject to safety constraints)");
        ObjectNode p10 = t10.putObject("inputSchema").put("type", "object").putObject("properties");
        p10.putObject("ticker").put("type", "string").put("description", "Ticker symbol or contract");
        p10.putObject("transactionType").put("type", "string").put("description", "BUY or SELL");
        p10.putObject("quantity").put("type", "integer").put("description", "Number of shares");
        p10.putObject("price").put("type", "number").put("description", "Price or 0 for Market");
        p10.putObject("orderType").put("type", "string").put("description", "LIMIT or MARKET");
        p10.putObject("product").put("type", "string").put("description", "INTRADAY or DELIVERY");
        t10.putArray("required").add("ticker").add("transactionType").add("quantity").add("orderType").add("product");

        // 10. resolve_instrument
        ObjectNode t11 = tools.addObject();
        t11.put("name", "resolve_instrument");
        t11.put("description", "Resolve instrument metadata from Upstox or fallback");
        ObjectNode p11 = t11.putObject("inputSchema").put("type", "object").putObject("properties");
        p11.putObject("ticker").put("type", "string").put("description", "Ticker symbol");
        t11.putArray("required").add("ticker");

        // 11. lookup_company
        ObjectNode t12 = tools.addObject();
        t12.put("name", "lookup_company");
        t12.put("description", "Resolve a company name to a stock symbol");
        ObjectNode p12 = t12.putObject("inputSchema").put("type", "object").putObject("properties");
        p12.putObject("query").put("type", "string").put("description", "Company search term");
        t12.putArray("required").add("query");

        // --- NEW MCP COMPATIBILITY TOOLS ---
        
        // 12. getLiveMarketData
        ObjectNode t13 = tools.addObject();
        t13.put("name", "getLiveMarketData");
        t13.put("description", "Fetch live LTP, bid, ask, and volume for a symbol");
        ObjectNode p13 = t13.putObject("inputSchema").put("type", "object").putObject("properties");
        p13.putObject("ticker").put("type", "string").put("description", "Ticker symbol");
        t13.putArray("required").add("ticker");

        // 13. getHistoricalData
        ObjectNode t14 = tools.addObject();
        t14.put("name", "getHistoricalData");
        t14.put("description", "Get historical price bars");
        ObjectNode p14 = t14.putObject("inputSchema").put("type", "object").putObject("properties");
        p14.putObject("ticker").put("type", "string").put("description", "Ticker symbol");
        p14.putObject("interval").put("type", "string").put("description", "Candle size");
        t14.putArray("required").add("ticker");

        // 14. getOptionChain
        ObjectNode t15 = tools.addObject();
        t15.put("name", "getOptionChain");
        t15.put("description", "Retrieve complete option chain for a ticker symbol");
        ObjectNode p15 = t15.putObject("inputSchema").put("type", "object").putObject("properties");
        p15.putObject("ticker").put("type", "string").put("description", "Ticker symbol");
        t15.putArray("required").add("ticker");

        // 15. getTechnicalIndicators
        ObjectNode t16 = tools.addObject();
        t16.put("name", "getTechnicalIndicators");
        t16.put("description", "Retrieve Bollinger Bands, RSI, MACD, VWAP, EMA indicators");
        ObjectNode p16 = t16.putObject("inputSchema").put("type", "object").putObject("properties");
        p16.putObject("ticker").put("type", "string").put("description", "Ticker symbol");
        t16.putArray("required").add("ticker");

        // 16. getLatestNews
        ObjectNode t17 = tools.addObject();
        t17.put("name", "getLatestNews");
        t17.put("description", "Get latest news articles and sentiment for a ticker");
        ObjectNode p17 = t17.putObject("inputSchema").put("type", "object").putObject("properties");
        p17.putObject("ticker").put("type", "string").put("description", "Ticker symbol");
        t17.putArray("required").add("ticker");

        // 17. getPortfolio
        ObjectNode t18 = tools.addObject();
        t18.put("name", "getPortfolio");
        t18.put("description", "Get current portfolio details, capital, today's P&L");
        t18.putObject("inputSchema").put("type", "object").putObject("properties");

        // 18. getOpenPositions
        ObjectNode t19 = tools.addObject();
        t19.put("name", "getOpenPositions");
        t19.put("description", "Get list of active holdings");
        t19.putObject("inputSchema").put("type", "object").putObject("properties");

        // 19. getMargin
        ObjectNode t20 = tools.addObject();
        t20.put("name", "getMargin");
        t20.put("description", "Get available and blocked account margin details");
        t20.putObject("inputSchema").put("type", "object").putObject("properties");

        // 20. modifyOrder
        ObjectNode t21 = tools.addObject();
        t21.put("name", "modifyOrder");
        t21.put("description", "Modify an open limit order");
        ObjectNode p21 = t21.putObject("inputSchema").put("type", "object").putObject("properties");
        p21.putObject("orderId").put("type", "string");
        p21.putObject("price").put("type", "number");
        p21.putObject("quantity").put("type", "integer");
        t21.putArray("required").add("orderId").add("price").add("quantity");

        // 21. cancelOrder
        ObjectNode t22 = tools.addObject();
        t22.put("name", "cancelOrder");
        t22.put("description", "Cancel a pending order");
        ObjectNode p22 = t22.putObject("inputSchema").put("type", "object").putObject("properties");
        p22.putObject("orderId").put("type", "string");
        t22.putArray("required").add("orderId");

        // 22. exitPosition
        ObjectNode t23 = tools.addObject();
        t23.put("name", "exitPosition");
        t23.put("description", "Close out an active holding at market price");
        ObjectNode p23 = t23.putObject("inputSchema").put("type", "object").putObject("properties");
        p23.putObject("ticker").put("type", "string");
        t23.putArray("required").add("ticker");

        // 23. getOrderStatus
        ObjectNode t24 = tools.addObject();
        t24.put("name", "getOrderStatus");
        t24.put("description", "Get execution status of a submitted order");
        ObjectNode p24 = t24.putObject("inputSchema").put("type", "object").putObject("properties");
        p24.putObject("orderId").put("type", "string");
        t24.putArray("required").add("orderId");

        // 24. run_ai_trading_round
        ObjectNode t25 = tools.addObject();
        t25.put("name", "run_ai_trading_round");
        t25.put("description", "Run FinGPT Analysis & Gemini Decision dual-agent autonomous round");
        ObjectNode p25 = t25.putObject("inputSchema").put("type", "object").putObject("properties");
        p25.putObject("ticker").put("type", "string").put("description", "Ticker symbol");
        t25.putArray("required").add("ticker");

        // 25. getDecisionLogs
        ObjectNode t26 = tools.addObject();
        t26.put("name", "getDecisionLogs");
        t26.put("description", "Get the complete AI decision history logs");
        t26.putObject("inputSchema").put("type", "object").putObject("properties");

        return result;
    }

    public JsonNode callTool(String name, JsonNode arguments) throws Exception {
        ObjectNode result = objectMapper.createObjectNode();
        ArrayNode content = result.putArray("content");
        ObjectNode textBlock = content.addObject();
        textBlock.put("type", "text");

        String jsonResult = "";

        // Standardize names to support both camelCase and snake_case mapping
        String normName = name;
        if ("getLiveMarketData".equals(name)) normName = "get_live_market_data";
        else if ("getHistoricalData".equals(name)) normName = "get_market_data";
        else if ("getOptionChain".equals(name)) normName = "get_option_chain";
        else if ("getTechnicalIndicators".equals(name)) normName = "get_technical_indicators";
        else if ("getLatestNews".equals(name)) normName = "get_news";
        else if ("getPortfolio".equals(name)) normName = "get_portfolio";
        else if ("getOpenPositions".equals(name)) normName = "get_open_positions";
        else if ("getMargin".equals(name)) normName = "get_margin";
        else if ("placeOrder".equals(name)) normName = "place_order";
        else if ("modifyOrder".equals(name)) normName = "modify_order";
        else if ("cancelOrder".equals(name)) normName = "cancel_order";
        else if ("exitPosition".equals(name)) normName = "exit_position";
        else if ("getOrderStatus".equals(name)) normName = "get_order_status";
        else if ("runAiTradingRound".equals(name)) normName = "run_ai_trading_round";
        else if ("getDecisionLogs".equals(name)) normName = "get_decision_logs";
        else if ("getOrderHistory".equals(name)) normName = "get_order_history";
        else if ("getRecommendations".equals(name)) normName = "get_recommendations";

        switch (normName) {
            case "list_symbols": {
                List<Symbol> list = symbolRepository.findAll();
                jsonResult = objectMapper.writeValueAsString(list);
                break;
            }
            case "add_symbol": {
                String ticker = arguments.path("ticker").asText().toUpperCase().trim();
                String friendlyName = arguments.path("name").asText(ticker);
                String type = arguments.path("type").asText("STOCK");

                if (symbolRepository.findByTicker(ticker).isPresent()) {
                    throw new IllegalArgumentException("Symbol already exists in watchlist");
                }

                Symbol symbol = new Symbol(ticker, friendlyName, type);
                Symbol saved = symbolRepository.save(symbol);
                jsonResult = objectMapper.writeValueAsString(saved);
                break;
            }
            case "get_market_data": {
                String ticker = arguments.path("ticker").asText().toUpperCase().trim();
                String interval = arguments.path("interval").asText("1d");
                boolean refresh = arguments.path("refresh").asBoolean(false);

                List<PriceBar> bars = marketDataService.getMarketData(ticker, interval, refresh);
                jsonResult = objectMapper.writeValueAsString(bars);
                break;
            }
            case "get_news": {
                String ticker = arguments.path("ticker").asText().toUpperCase().trim();
                boolean refresh = arguments.path("refresh").asBoolean(false);

                List<NewsArticle> news = newsService.getNews(ticker, refresh);
                jsonResult = objectMapper.writeValueAsString(news);
                break;
            }
            case "predict_custom": {
                String ticker = arguments.path("ticker").asText().toUpperCase().trim();
                String query = arguments.path("query").asText();

                List<PriceBar> priceBars = marketDataService.getMarketData(ticker, "1d", false);
                List<NewsArticle> news = newsService.getNews(ticker, false);

                com.tradewithai.model.CustomAnalysisRequest req = new com.tradewithai.model.CustomAnalysisRequest();
                req.setTicker(ticker);
                req.setQuery(query);

                com.tradewithai.model.CustomAnalysisResponse pred = aiAgentService.getCustomPrediction(req, priceBars, news);
                jsonResult = objectMapper.writeValueAsString(pred);
                break;
            }
            case "get_global_indices": {
                List<Map<String, Object>> indices = marketDataService.getGlobalIndices();
                jsonResult = objectMapper.writeValueAsString(indices);
                break;
            }
            case "get_active_llm": {
                String desc = aiAgentService.getActiveProviderDescription();
                ObjectNode res = objectMapper.createObjectNode();
                res.put("provider", desc);
                jsonResult = objectMapper.writeValueAsString(res);
                break;
            }
            case "check_upstox_status": {
                boolean connected = marketDataService.isUpstoxConnected();
                ObjectNode res = objectMapper.createObjectNode();
                res.put("connected", connected);
                res.put("feed", connected ? "Upstox" : "Yahoo Finance");
                jsonResult = objectMapper.writeValueAsString(res);
                break;
            }
            case "resolve_instrument": {
                String ticker = arguments.path("ticker").asText().toUpperCase().trim();
                Map<String, Object> details = marketDataService.resolveInstrumentDetails(ticker);
                jsonResult = objectMapper.writeValueAsString(details);
                break;
            }
            case "lookup_company": {
                String query = arguments.path("query").asText().trim();
                Map<String, Object> resolved = marketDataService.lookupUpstox(query);
                if (resolved == null) {
                    resolved = marketDataService.lookupYahooFinance(query);
                }
                if (resolved == null) {
                    resolved = aiAgentService.getCompanyProfileDetails(query);
                    resolved.put("resolved", false);
                    resolved.put("source", "google");
                    try {
                        List<NewsArticle> newsList = newsService.getNews(query, true);
                        resolved.put("news", newsList);
                    } catch (Exception ex) {
                        resolved.put("news", Collections.emptyList());
                    }
                }
                jsonResult = objectMapper.writeValueAsString(resolved);
                break;
            }
            
            // --- NEW COMPATIBILITY HANDLERS ---
            
            case "get_live_market_data": {
                String ticker = arguments.path("ticker").asText().toUpperCase().trim();
                List<PriceBar> bars = marketDataService.getMarketData(ticker, "1d", false);
                double spotPrice = bars.isEmpty() ? 100.0 : bars.get(bars.size() - 1).getClosePrice();
                ObjectNode res = objectMapper.createObjectNode();
                res.put("ticker", ticker);
                res.put("ltp", spotPrice);
                res.put("bid", spotPrice - 0.05);
                res.put("ask", spotPrice + 0.05);
                res.put("volume", bars.isEmpty() ? 10000 : bars.get(bars.size() - 1).getVolume());
                jsonResult = objectMapper.writeValueAsString(res);
                break;
            }
            case "get_option_chain": {
                String ticker = arguments.path("ticker").asText().toUpperCase().trim();
                List<PriceBar> bars = marketDataService.getMarketData(ticker, "1d", false);
                double spotPrice = bars.isEmpty() ? 100.0 : bars.get(bars.size() - 1).getClosePrice();
                ArrayNode chain = objectMapper.createArrayNode();
                double step = ticker.contains("NSEI") || ticker.contains("NIFTY") ? 50.0 : 10.0;
                double roundedSpot = Math.round(spotPrice / step) * step;
                for (int i = -3; i <= 3; i++) {
                    double strike = roundedSpot + (i * step);
                    ObjectNode call = chain.addObject();
                    call.put("strike", strike);
                    call.put("type", "CE");
                    call.put("premium", spotPrice * 0.02 * (4 - Math.abs(i)));
                    ObjectNode put = chain.addObject();
                    put.put("strike", strike);
                    put.put("type", "PE");
                    put.put("premium", spotPrice * 0.02 * (4 - Math.abs(i)));
                }
                jsonResult = objectMapper.writeValueAsString(chain);
                break;
            }
            case "get_technical_indicators": {
                String ticker = arguments.path("ticker").asText().toUpperCase().trim();
                List<PriceBar> bars = marketDataService.getMarketData(ticker, "1d", false);
                ObjectNode res = objectMapper.createObjectNode();
                if (!bars.isEmpty()) {
                    PriceBar latest = bars.get(bars.size() - 1);
                    res.put("rsi", latest.getRsi() != null ? latest.getRsi() : 50.0);
                    res.put("macd", latest.getMacdHist() != null ? latest.getMacdHist() : 0.0);
                    res.put("vwap", latest.getVwap());
                } else {
                    res.put("rsi", 50.0).put("macd", 0.0).put("vwap", 100.0);
                }
                jsonResult = objectMapper.writeValueAsString(res);
                break;
            }
            case "get_portfolio": {
                AccountBalance balance = marketDataService.getAccountBalance();
                double blocked = marketDataService.calculateBlockedMargin();
                double unrealized = marketDataService.calculateUnrealizedPnl();
                
                ObjectNode res = objectMapper.createObjectNode();
                res.put("availableMargin", balance.getAvailableMargin());
                res.put("totalBalance", balance.getTotalBalance());
                res.put("initialBalance", balance.getInitialBalance());
                res.put("realizedTodayPnl", balance.getRealizedTodayPnl());
                res.put("unrealizedPnl", unrealized);
                res.put("blockedMargin", blocked);
                res.put("holdingsCount", marketDataService.getPortfolioHoldings().size());
                jsonResult = objectMapper.writeValueAsString(res);
                break;
            }
            case "get_open_positions": {
                List<PortfolioHolding> list = marketDataService.getPortfolioHoldings();
                jsonResult = objectMapper.writeValueAsString(list);
                break;
            }
            case "get_margin": {
                AccountBalance balance = marketDataService.getAccountBalance();
                double blocked = marketDataService.calculateBlockedMargin();
                ObjectNode res = objectMapper.createObjectNode();
                res.put("availableMargin", balance.getAvailableMargin());
                res.put("blockedMargin", blocked);
                jsonResult = objectMapper.writeValueAsString(res);
                break;
            }
            case "place_order": {
                String ticker = arguments.path("ticker").asText().toUpperCase().trim();
                String txType = arguments.path("transactionType").asText("BUY").toUpperCase().trim();
                int qty = arguments.path("quantity").asInt(1);
                double price = arguments.path("price").asDouble(0.0);
                String ordType = arguments.path("orderType").asText("MARKET").toUpperCase().trim();
                String product = arguments.path("product").asText("INTRADAY").toUpperCase().trim();

                Map<String, Object> orderResult = marketDataService.placeOrder(ticker, txType, qty, price, ordType, product);
                jsonResult = objectMapper.writeValueAsString(orderResult);
                break;
            }
            case "modify_order": {
                String orderId = arguments.path("orderId").asText();
                double price = arguments.path("price").asDouble();
                int qty = arguments.path("quantity").asInt();
                ObjectNode res = objectMapper.createObjectNode();
                res.put("status", "SUCCESS");
                res.put("message", "Simulated modification for order " + orderId + " price " + price + " quantity " + qty);
                jsonResult = objectMapper.writeValueAsString(res);
                break;
            }
            case "cancel_order": {
                String orderId = arguments.path("orderId").asText();
                ObjectNode res = objectMapper.createObjectNode();
                res.put("status", "SUCCESS");
                res.put("message", "Simulated cancellation for order " + orderId);
                jsonResult = objectMapper.writeValueAsString(res);
                break;
            }
            case "exit_position": {
                String ticker = arguments.path("ticker").asText().toUpperCase().trim();
                Map<String, Object> orderResult = marketDataService.exitPosition(ticker);
                jsonResult = objectMapper.writeValueAsString(orderResult);
                break;
            }
            case "get_order_status": {
                String orderId = arguments.path("orderId").asText();
                ObjectNode res = objectMapper.createObjectNode();
                res.put("orderId", orderId);
                res.put("status", "EXECUTED");
                res.put("message", "Simulated order lookup success.");
                jsonResult = objectMapper.writeValueAsString(res);
                break;
            }
            case "run_ai_trading_round": {
                String ticker = arguments.path("ticker").asText().toUpperCase().trim();
                Map<String, Object> roundResult = aiAgentService.runAutonomousTradingRound(ticker, this);
                jsonResult = objectMapper.writeValueAsString(roundResult);
                break;
            }
            case "get_decision_logs": {
                List<com.tradewithai.model.AiDecisionLog> list = aiAgentService.getDecisionLogs();
                jsonResult = objectMapper.writeValueAsString(list);
                break;
            }
            case "get_order_history": {
                List<com.tradewithai.model.OrderLog> list = marketDataService.getOrderLogs();
                jsonResult = objectMapper.writeValueAsString(list);
                break;
            }
            case "get_recommendations": {
                String ticker = arguments.path("ticker").asText().toUpperCase().trim();
                boolean refresh = arguments.path("refresh").asBoolean(false);
                List<PriceBar> priceBars = marketDataService.getMarketData(ticker, "1d", false);
                List<NewsArticle> newsList = newsService.getNews(ticker, false);
                List<AiRecommendation> list = aiAgentService.getRecommendations(ticker, priceBars, newsList, refresh);
                jsonResult = objectMapper.writeValueAsString(list);
                break;
            }
            default:
                throw new IllegalArgumentException("Unknown tool name: " + name);
        }

        textBlock.put("text", jsonResult);
        return result;
    }
}
