package com.tradewithai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tradewithai.model.Symbol;
import com.tradewithai.model.PriceBar;
import com.tradewithai.model.NewsArticle;
import com.tradewithai.model.AiRecommendation;
import com.tradewithai.model.CustomAnalysisRequest;
import com.tradewithai.model.CustomAnalysisResponse;
import com.tradewithai.repository.SymbolRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

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

        // 3. get_market_data
        ObjectNode t3 = tools.addObject();
        t3.put("name", "get_market_data");
        t3.put("description", "Retrieve candlestick price bars and technical indicators (RSI, MACD, VWAP) for a ticker and interval");
        ObjectNode p3 = t3.putObject("inputSchema").put("type", "object").putObject("properties");
        p3.putObject("ticker").put("type", "string").put("description", "Ticker symbol");
        p3.putObject("interval").put("type", "string").put("description", "Candle size, e.g. 1m, 5m, 10m, 1h, 1d, 1mo");
        p3.putObject("refresh").put("type", "boolean").put("description", "Force database refresh from Yahoo Finance");
        t3.putArray("required").add("ticker");

        // 4. get_news
        ObjectNode t4 = tools.addObject();
        t4.put("name", "get_news");
        t4.put("description", "Fetch up-to-date regional/global market news and sentiment analysis (48h age limit)");
        ObjectNode p4 = t4.putObject("inputSchema").put("type", "object").putObject("properties");
        p4.putObject("ticker").put("type", "string").put("description", "Ticker symbol");
        p4.putObject("refresh").put("type", "boolean").put("description", "Force RSS search update");
        t4.putArray("required").add("ticker");

        // 5. get_recommendations
        ObjectNode t5 = tools.addObject();
        t5.put("name", "get_recommendations");
        t5.put("description", "Generate Llama AI-powered intraday and long-term trading strategies");
        ObjectNode p5 = t5.putObject("inputSchema").put("type", "object").putObject("properties");
        p5.putObject("ticker").put("type", "string").put("description", "Ticker symbol");
        p5.putObject("refresh").put("type", "boolean").put("description", "Force AI request refresh");
        t5.putArray("required").add("ticker");

        // 6. predict_custom
        ObjectNode t6 = tools.addObject();
        t6.put("name", "predict_custom");
        t6.put("description", "Perform a custom AI prediction/forecast for a stock or option contract");
        ObjectNode p6 = t6.putObject("inputSchema").put("type", "object").putObject("properties");
        p6.putObject("ticker").put("type", "string").put("description", "Ticker symbol");
        p6.putObject("query").put("type", "string").put("description", "Custom question, e.g. Will it rally next week?");
        p6.putObject("optionStrike").put("type", "number").put("description", "Option strike price");
        p6.putObject("optionType").put("type", "string").put("description", "CALL or PUT");
        p6.putObject("optionExpiry").put("type", "string").put("description", "Expiry date, e.g. YYYY-MM-DD");
        t6.putArray("required").add("ticker").add("query");

        // 7. get_global_indices
        ObjectNode t7 = tools.addObject();
        t7.put("name", "get_global_indices");
        t7.put("description", "Fetch current quotes for major international stock indices");
        t7.putObject("inputSchema").put("type", "object").putObject("properties");

        // 8. get_active_llm
        ObjectNode t8 = tools.addObject();
        t8.put("name", "get_active_llm");
        t8.put("description", "Get the active LLM provider or fallback engine name");
        t8.putObject("inputSchema").put("type", "object").putObject("properties");

        // 9. check_upstox_status
        ObjectNode t9 = tools.addObject();
        t9.put("name", "check_upstox_status");
        t9.put("description", "Check Upstox connection status and active market data feed provider");
        t9.putObject("inputSchema").put("type", "object").putObject("properties");

        // 10. place_order
        ObjectNode t10 = tools.addObject();
        t10.put("name", "place_order");
        t10.put("description", "Execute a stock or options trade order (simulated fallback or via live Upstox API)");
        ObjectNode p10 = t10.putObject("inputSchema").put("type", "object").putObject("properties");
        p10.putObject("ticker").put("type", "string").put("description", "Ticker symbol or option contract name (e.g. RELIANCE.NS, NIFTY 24300 CE)");
        p10.putObject("transactionType").put("type", "string").put("description", "BUY or SELL");
        p10.putObject("quantity").put("type", "integer").put("description", "Number of shares or lot multiplier");
        p10.putObject("price").put("type", "number").put("description", "Limit price, or 0 for Market order");
        p10.putObject("orderType").put("type", "string").put("description", "LIMIT or MARKET");
        p10.putObject("product").put("type", "string").put("description", "INTRADAY or DELIVERY");
        t10.putArray("required").add("ticker").add("transactionType").add("quantity").add("orderType").add("product");

        // 11. resolve_instrument
        ObjectNode t11 = tools.addObject();
        t11.put("name", "resolve_instrument");
        t11.put("description", "Resolve instrument metadata (e.g. actual lot size, segment, instrument type) from Upstox or fallback");
        ObjectNode p11 = t11.putObject("inputSchema").put("type", "object").putObject("properties");
        p11.putObject("ticker").put("type", "string").put("description", "Ticker symbol or contract name (e.g. RELIANCE.NS, NIFTY 24300 CE)");
        t11.putArray("required").add("ticker");

        return result;
    }

    public JsonNode callTool(String name, JsonNode arguments) throws Exception {
        ObjectNode result = objectMapper.createObjectNode();
        ArrayNode content = result.putArray("content");
        ObjectNode textBlock = content.addObject();
        textBlock.put("type", "text");

        String jsonResult = "";

        switch (name) {
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
            case "get_recommendations": {
                String ticker = arguments.path("ticker").asText().toUpperCase().trim();
                boolean refresh = arguments.path("refresh").asBoolean(false);

                List<PriceBar> priceBars = marketDataService.getMarketData(ticker, "1d", false);
                List<NewsArticle> news = newsService.getNews(ticker, false);

                List<AiRecommendation> recos = aiAgentService.getRecommendations(ticker, priceBars, news, refresh);
                jsonResult = objectMapper.writeValueAsString(recos);
                break;
            }
            case "predict_custom": {
                String ticker = arguments.path("ticker").asText().toUpperCase().trim();
                String query = arguments.path("query").asText();

                CustomAnalysisRequest req = new CustomAnalysisRequest();
                req.setTicker(ticker);
                req.setQuery(query);
                if (arguments.has("optionStrike") && !arguments.path("optionStrike").isNull()) {
                    req.setOptionStrike(arguments.path("optionStrike").asDouble());
                }
                if (arguments.has("optionType") && !arguments.path("optionType").isNull()) {
                    req.setOptionType(arguments.path("optionType").asText());
                }
                if (arguments.has("optionExpiry") && !arguments.path("optionExpiry").isNull()) {
                    req.setOptionExpiry(arguments.path("optionExpiry").asText());
                }

                List<PriceBar> priceBars = marketDataService.getMarketData(ticker, "1d", false);
                List<NewsArticle> news = newsService.getNews(ticker, false);

                CustomAnalysisResponse pred = aiAgentService.getCustomPrediction(req, priceBars, news);
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
            case "resolve_instrument": {
                String ticker = arguments.path("ticker").asText().toUpperCase().trim();
                Map<String, Object> details = marketDataService.resolveInstrumentDetails(ticker);
                jsonResult = objectMapper.writeValueAsString(details);
                break;
            }
            default:
                throw new IllegalArgumentException("Unknown tool name: " + name);
        }

        textBlock.put("text", jsonResult);
        return result;
    }
}
