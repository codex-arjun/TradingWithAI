package com.tradewithai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tradewithai.model.AiRecommendation;
import com.tradewithai.model.NewsArticle;
import com.tradewithai.model.PriceBar;
import com.tradewithai.model.CustomAnalysisRequest;
import com.tradewithai.model.CustomAnalysisResponse;
import com.tradewithai.repository.AiRecommendationRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class AiAgentService {

    private final AiRecommendationRepository recommendationRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${tradepilot.ai.provider}")
    private String aiProvider;

    @Value("${tradepilot.ai.ollama.url}")
    private String ollamaUrl;

    @Value("${tradepilot.ai.ollama.model}")
    private String ollamaModel;

    @Value("${tradepilot.ai.groq.key}")
    private String groqKey;

    @Value("${tradepilot.ai.groq.model}")
    private String groqModel;

    @Value("${tradepilot.ai.gemini.key:}")
    private String geminiKey;

    public AiAgentService(AiRecommendationRepository recommendationRepository) {
        this.recommendationRepository = recommendationRepository;
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    public String getActiveProviderDescription() {
        if ("gemini".equalsIgnoreCase(aiProvider)) {
            if (geminiKey == null || geminiKey.trim().isEmpty()) {
                return "Fallback Quant Engine (Gemini Key Missing)";
            }
            return "Gemini 1.5 Flash";
        } else if ("groq".equalsIgnoreCase(aiProvider)) {
            if (groqKey == null || groqKey.trim().isEmpty()) {
                return "Fallback Quant Engine (Groq Key Missing)";
            }
            return "Llama 3.1 8B (Groq)";
        } else if ("ollama".equalsIgnoreCase(aiProvider)) {
            return "Llama 3.2 (Ollama)";
        }
        return "Fallback Quant Engine";
    }

    private String formatVal(String ticker, double value) {
        if (ticker != null && ticker.startsWith("^")) {
            return String.format("%.2f pts", value);
        } else {
            return String.format("₹%.2f", value);
        }
    }

    public List<AiRecommendation> getRecommendations(String ticker, List<PriceBar> priceBars, List<NewsArticle> newsArticles, boolean forceRefresh) {
        List<AiRecommendation> existing = recommendationRepository.findByTickerOrderByGeneratedAtDesc(ticker);

        if (!existing.isEmpty() && !forceRefresh) {
            return existing;
        }

        List<AiRecommendation> recommendations = generateAiRecommendations(ticker, priceBars, newsArticles);
        
        recommendationRepository.deleteByTicker(ticker);
        recommendationRepository.saveAll(recommendations);

        return recommendations;
    }

    private List<AiRecommendation> generateAiRecommendations(String ticker, List<PriceBar> priceBars, List<NewsArticle> newsArticles) {
        if (priceBars == null || priceBars.isEmpty()) {
            return Collections.emptyList();
        }

        PriceBar latestBar = priceBars.get(priceBars.size() - 1);
        double currentPrice = latestBar.getClosePrice();
        double rsi = latestBar.getRsi() != null ? latestBar.getRsi() : 50.0;
        double macdHist = latestBar.getMacdHist() != null ? latestBar.getMacdHist() : 0.0;
        double vwap = latestBar.getVwap();

        // Prepare context summary
        StringBuilder newsSummary = new StringBuilder();
        int bullNews = 0;
        int bearNews = 0;
        for (NewsArticle article : newsArticles) {
            newsSummary.append("- ").append(article.getTitle()).append(" (Sentiment: ").append(article.getSentiment()).append(")\n");
            if ("BULLISH".equals(article.getSentiment())) bullNews++;
            if ("BEARISH".equals(article.getSentiment())) bearNews++;
        }

        String prompt = buildPrompt(ticker, currentPrice, rsi, macdHist, vwap, latestBar, newsSummary.toString());

        if ("ollama".equalsIgnoreCase(aiProvider)) {
            List<AiRecommendation> result = queryOllama(ticker, currentPrice, prompt);
            if (result != null) return result;
        } else if ("groq".equalsIgnoreCase(aiProvider) && groqKey != null && !groqKey.isBlank()) {
            List<AiRecommendation> result = queryGroq(ticker, currentPrice, prompt);
            if (result != null) return result;
        } else if ("gemini".equalsIgnoreCase(aiProvider) && geminiKey != null && !geminiKey.isBlank()) {
            List<AiRecommendation> result = queryGemini(ticker, currentPrice, prompt);
            if (result != null) return result;
        }

        // Fallback to Rule-Based Quantitative Analysis Engine
        System.out.println("Using rule-based quantitative engine fallback for AI recommendations...");
        return generateRuleBasedRecommendations(ticker, currentPrice, rsi, macdHist, vwap, bullNews, bearNews);
    }

    private String buildPrompt(String ticker, double currentPrice, double rsi, double macdHist, double vwap, PriceBar latest, String newsText) {
        return "You are tradewithAI, a professional quantitative stock analyst. Analyze the following real-time and historical technical data for " + ticker + ":\n" +
               "- Current Price: " + formatVal(ticker, currentPrice) + "\n" +
               "- 14-Period RSI: " + String.format("%.2f", rsi) + " (Overbought > 70, Oversold < 30)\n" +
               "- MACD Histogram: " + String.format("%.4f", macdHist) + " (Bullish cross if positive and rising, bearish if negative and falling)\n" +
               "- VWAP: " + formatVal(ticker, vwap) + " (Supportive if price is above VWAP, resistance if below)\n" +
               "- 24h High: " + formatVal(ticker, latest.getHighPrice()) + " | 24h Low: " + formatVal(ticker, latest.getLowPrice()) + "\n" +
               "- Volume: " + latest.getVolume() + "\n" +
               "- Recent news headlines:\n" + newsText + "\n\n" +
               "Generate two detailed trading strategies for " + ticker + ":\n" +
               "1. INTRADAY trading recommendation (holding period under 24 hours, stop loss around 1-2%, profit target around 2-4%)\n" +
               "2. LONG_TERM investment recommendation (holding period 3-12 months, stop loss around 8-15%, profit target around 20-50%)\n\n" +
               "For optionSuggest: suggest a specific Call (CE) or Put (PE) option contract with strike price based on the current price. For example, if current Nifty price is 24150, suggest buying the 'NIFTY 24350 CE' (if BUY) or 'NIFTY 24000 PE' (if SELL). If the action is HOLD, output 'N/A'. Keep the strike increments standard (e.g. 50/100 points for indices, 10/20/50 for stocks).\n\n" +
               "Note: Do not output prefix symbols like $ or ₹ inside the stopLoss and profitTarget number fields of the JSON, output them as raw float numbers. But you can use the correct currency symbols in the text reasoning.\n" +
               "You MUST respond ONLY with a single JSON object. Do not include markdown code fences (like ```json), explanations, or text outside the JSON. Follow this exact schema:\n" +
               "{\n" +
               "  \"intraday\": {\n" +
               "    \"action\": \"BUY\" or \"SELL\" or \"HOLD\",\n" +
               "    \"stopLoss\": 123.45,\n" +
               "    \"profitTarget\": 135.67,\n" +
               "    \"riskPercentage\": 1.5,\n" +
               "    \"holdDuration\": \"2 - 6 hours\",\n" +
               "    \"optionSuggest\": \"NIFTY 24300 CE\" or \"N/A\",\n" +
               "    \"reasoning\": \"Detailed technical/news explanation here...\"\n" +
               "  },\n" +
               "  \"longTerm\": {\n" +
               "    \"action\": \"BUY\" or \"SELL\" or \"HOLD\",\n" +
               "    \"stopLoss\": 110.00,\n" +
               "    \"profitTarget\": 180.00,\n" +
               "    \"riskPercentage\": 4.5,\n" +
               "    \"holdDuration\": \"6 - 12 months\",\n" +
               "    \"optionSuggest\": \"N/A\",\n" +
               "    \"reasoning\": \"Detailed fundamental/structural explanation here...\"\n" +
               "  }\n" +
               "}";
    }

    private List<AiRecommendation> queryOllama(String ticker, double currentPrice, String prompt) {
        try {
            String url = ollamaUrl + "/api/generate";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            ObjectNode payload = objectMapper.createObjectNode();
            payload.put("model", ollamaModel);
            payload.put("prompt", prompt);
            payload.put("stream", false);
            payload.put("format", "json");

            HttpEntity<String> entity = new HttpEntity<>(payload.toString(), headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode responseNode = objectMapper.readTree(response.getBody());
                String responseText = responseNode.path("response").asText();
                return parseModelResponse(ticker, currentPrice, responseText);
            }
        } catch (Exception e) {
            System.err.println("Ollama connection failed: " + e.getMessage() + ". Ensure Ollama is running at " + ollamaUrl);
        }
        return null;
    }

    private List<AiRecommendation> queryGroq(String ticker, double currentPrice, String prompt) {
        try {
            String url = "https://api.groq.com/openai/v1/chat/completions";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + groqKey);

            ObjectNode responseFormat = objectMapper.createObjectNode();
            responseFormat.put("type", "json_object");

            ObjectNode systemMessage = objectMapper.createObjectNode();
            systemMessage.put("role", "system");
            systemMessage.put("content", "You are tradewithAI. You respond only with valid JSON.");

            ObjectNode userMessage = objectMapper.createObjectNode();
            userMessage.put("role", "user");
            userMessage.put("content", prompt);

            HttpEntity<String> entity = new HttpEntity<>(
                String.format("{\"model\":\"%s\",\"messages\":[%s,%s],\"response_format\":%s}",
                    groqModel, systemMessage.toString(), userMessage.toString(), responseFormat.toString()),
                headers
            );

            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                String responseText = root.path("choices").get(0).path("message").path("content").asText();
                return parseModelResponse(ticker, currentPrice, responseText);
            }
        } catch (Exception e) {
            System.err.println("Groq API query failed: " + e.getMessage());
        }
        return null;
    }

    private List<AiRecommendation> queryGemini(String ticker, double currentPrice, String prompt) {
        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + geminiKey;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            ObjectNode payload = objectMapper.createObjectNode();
            ArrayNode contents = payload.putArray("contents");
            ObjectNode contentObj = contents.addObject();
            ArrayNode parts = contentObj.putArray("parts");
            ObjectNode partObj = parts.addObject();
            partObj.put("text", prompt);

            ObjectNode genConfig = payload.putObject("generationConfig");
            genConfig.put("responseMimeType", "application/json");

            HttpEntity<String> entity = new HttpEntity<>(payload.toString(), headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                String responseText = root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
                return parseModelResponse(ticker, currentPrice, responseText);
            }
        } catch (Exception e) {
            System.err.println("Gemini API query failed: " + e.getMessage());
        }
        return null;
    }

    private String calculateFallbackOptionSuggest(String ticker, double price, String action) {
        if ("HOLD".equalsIgnoreCase(action) || action == null || action.isBlank()) {
            return "N/A";
        }
        
        int step = 50;
        String upper = ticker.toUpperCase();
        if (upper.contains("NSEI") || upper.contains("NIFTY")) step = 50;
        else if (upper.contains("BANK") || upper.contains("BSESN") || upper.contains("SENSEX")) step = 100;
        else {
            if (price > 2000) step = 50;
            else if (price > 1000) step = 20;
            else if (price > 500) step = 10;
            else step = 5;
        }
        
        // Suggest slightly OTM strike
        double targetPrice = price;
        String optType = "CE";
        if ("BUY".equalsIgnoreCase(action)) {
            targetPrice = price + (step * 2); // 2 strikes out-of-the-money
            optType = "CE";
        } else if ("SELL".equalsIgnoreCase(action)) {
            targetPrice = price - (step * 2); // 2 strikes out-of-the-money
            optType = "PE";
        }
        
        long strike = Math.round(targetPrice / step) * step;
        String displaySymbol = upper.replace("^", "").replace(".NS", "");
        return displaySymbol + " " + strike + " " + optType;
    }

    private List<AiRecommendation> parseModelResponse(String ticker, double currentPrice, String jsonText) {
        try {
            String cleaned = jsonText.trim();
            if (cleaned.startsWith("```")) {
                int firstLineEnd = cleaned.indexOf("\n");
                int lastFence = cleaned.lastIndexOf("```");
                if (firstLineEnd != -1 && lastFence != -1) {
                    cleaned = cleaned.substring(firstLineEnd + 1, lastFence).trim();
                }
            }

            JsonNode root = objectMapper.readTree(cleaned);
            List<AiRecommendation> recommendations = new ArrayList<>();

            // Intraday
            JsonNode intraday = root.path("intraday");
            if (!intraday.isMissingNode()) {
                String act = intraday.path("action").asText("HOLD").toUpperCase();
                String opt = intraday.path("optionSuggest").asText("");
                if (opt.isBlank() || "N/A".equalsIgnoreCase(opt)) {
                    opt = calculateFallbackOptionSuggest(ticker, currentPrice, act);
                }

                recommendations.add(new AiRecommendation(
                    ticker,
                    "INTRADAY",
                    act,
                    currentPrice,
                    intraday.path("stopLoss").asDouble(currentPrice * 0.98),
                    intraday.path("profitTarget").asDouble(currentPrice * 1.03),
                    intraday.path("riskPercentage").asDouble(1.5),
                    intraday.path("holdDuration").asText("2 - 6 hours"),
                    opt,
                    intraday.path("reasoning").asText("Llama Intraday strategy based on technical indicators."),
                    LocalDateTime.now()
                ));
            }

            // Long Term
            JsonNode longTerm = root.path("longTerm");
            if (!longTerm.isMissingNode()) {
                String act = longTerm.path("action").asText("HOLD").toUpperCase();
                String opt = longTerm.path("optionSuggest").asText("");
                if (opt.isBlank() || "N/A".equalsIgnoreCase(opt)) {
                    opt = "N/A";
                }

                recommendations.add(new AiRecommendation(
                    ticker,
                    "LONG_TERM",
                    act,
                    currentPrice,
                    longTerm.path("stopLoss").asDouble(currentPrice * 0.88),
                    longTerm.path("profitTarget").asDouble(currentPrice * 1.30),
                    longTerm.path("riskPercentage").asDouble(4.0),
                    longTerm.path("holdDuration").asText("6 - 12 months"),
                    opt,
                    longTerm.path("reasoning").asText("Llama Long Term investment strategy based on underlying structural trend."),
                    LocalDateTime.now()
                ));
            }

            return recommendations;
        } catch (Exception e) {
            System.err.println("Failed to parse model JSON: " + e.getMessage() + "\nRaw response was:\n" + jsonText);
            return null;
        }
    }

    private List<AiRecommendation> generateRuleBasedRecommendations(
            String ticker, double currentPrice, double rsi, double macdHist, double vwap, int bullNews, int bearNews) {
        
        List<AiRecommendation> list = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        // Simple scoring based on indicators
        int score = 0; // positive is bullish, negative is bearish
        
        // RSI score
        if (rsi < 30) score += 2; // Oversold (Buy signal)
        else if (rsi < 45) score += 1;
        else if (rsi > 70) score -= 2; // Overbought (Sell signal)
        else if (rsi > 55) score -= 1;

        // MACD score
        if (macdHist > 0) score += 1; // Bullish momentum
        else if (macdHist < 0) score -= 1; // Bearish momentum

        // Price vs VWAP score
        if (currentPrice > vwap) score += 1; // Price support above VWAP
        else score -= 1; // Resistance below VWAP

        // News score
        if (bullNews > bearNews) score += 1;
        if (bearNews > bullNews) score -= 1;

        // Determine actions
        String intradayAction = "HOLD";
        String longTermAction = "HOLD";

        if (score >= 2) {
            intradayAction = "BUY";
            longTermAction = "BUY";
        } else if (score <= -2) {
            intradayAction = "SELL";
            longTermAction = "SELL";
        }

        // Intraday calculation
        double intraRisk = 1.5;
        double intraSL = currentPrice * (intradayAction.equals("BUY") ? (1 - 0.015) : (1 + 0.015));
        double intraTP = currentPrice * (intradayAction.equals("BUY") ? (1 + 0.03) : (1 - 0.03));
        if (intradayAction.equals("HOLD")) {
            intraSL = currentPrice * 0.98;
            intraTP = currentPrice * 1.02;
        }

        String intraReasoning = String.format(
            "tradewithAI technical rules analyzed the chart. RSI stands at %.2f (%s) and MACD histogram shows a %s trend at %.4f. " +
            "Price is currently trading %s the VWAP level (%s). Combined with news sentiment which contains %d positive and %d negative headlines, " +
            "a short-term %s stance is recommended with a target profit of 3%% and tight 1.5%% stop loss.",
            rsi, (rsi < 35 ? "oversold" : rsi > 65 ? "overbought" : "neutral"),
            (macdHist > 0 ? "bullish crossover" : "bearish momentum"), macdHist,
            (currentPrice > vwap ? "above" : "below"), formatVal(ticker, vwap),
            bullNews, bearNews, intradayAction
        );

        String intraOpt = calculateFallbackOptionSuggest(ticker, currentPrice, intradayAction);
        list.add(new AiRecommendation(ticker, "INTRADAY", intradayAction, currentPrice, intraSL, intraTP, intraRisk, "2 - 6 hours", intraOpt, intraReasoning, now));

        // Long Term calculation
        double longRisk = 4.5;
        double longSL = currentPrice * (longTermAction.equals("BUY") ? (1 - 0.10) : (1 + 0.10));
        double longTP = currentPrice * (longTermAction.equals("BUY") ? (1 + 0.25) : (1 - 0.20));
        if (longTermAction.equals("HOLD")) {
            longSL = currentPrice * 0.90;
            longTP = currentPrice * 1.10;
        }

        String longReasoning = String.format(
            "Long-term structural analysis shows %s momentum. Technical markers suggest a long-term %s position. " +
            "Relative Strength (RSI = %.2f) shows %s long-term accumulation capacity, while news headlines remain %s overall. " +
            "Strongly advise holding the position for 6-12 months targeting a 25%% return and limiting risk to 4.5%% with a stop loss of %s.",
            (score >= 1 ? "supportive upward" : score <= -1 ? "descending correction" : "neutral range"),
            longTermAction, rsi, (rsi < 45 ? "high" : rsi > 60 ? "fully-valued" : "fair"),
            (bullNews >= bearNews ? "supportive" : "cautious"), formatVal(ticker, longSL)
        );

        list.add(new AiRecommendation(ticker, "LONG_TERM", longTermAction, currentPrice, longSL, longTP, longRisk, "6 - 12 months", "N/A", longReasoning, now));

        return list;
    }

    public CustomAnalysisResponse getCustomPrediction(CustomAnalysisRequest request, List<PriceBar> priceBars, List<NewsArticle> news) {
        String ticker = request.getTicker().toUpperCase().trim();
        String query = request.getQuery() != null ? request.getQuery() : "Will this share go up or down?";
        
        double currentPrice = 0.0;
        double rsi = 50.0;
        double macdHist = 0.0;
        double vwap = 0.0;
        
        if (priceBars != null && !priceBars.isEmpty()) {
            PriceBar latest = priceBars.get(priceBars.size() - 1);
            currentPrice = latest.getClosePrice();
            rsi = latest.getRsi() != null ? latest.getRsi() : 50.0;
            macdHist = latest.getMacdHist() != null ? latest.getMacdHist() : 0.0;
            vwap = latest.getVwap();
        } else {
            currentPrice = ticker.equals("^NSEI") ? 23500.0 : ticker.equals("^BSESN") ? 77000.0 : 100.0;
            vwap = currentPrice;
        }

        StringBuilder newsSummary = new StringBuilder();
        int bullNews = 0;
        int bearNews = 0;
        if (news != null) {
            for (NewsArticle article : news) {
                newsSummary.append("- ").append(article.getTitle()).append(" (Sentiment: ").append(article.getSentiment()).append(")\n");
                if ("BULLISH".equals(article.getSentiment())) bullNews++;
                if ("BEARISH".equals(article.getSentiment())) bearNews++;
            }
        }

        String prompt = "You are tradewithAI, a financial quant. A user requests custom analysis:\n" +
                "- Ticker: " + ticker + "\n" +
                "- Current Price: " + formatVal(ticker, currentPrice) + "\n" +
                "- Query: " + query + "\n" +
                "- Option Details: Strike: " + (request.getOptionStrike() != null ? formatVal(ticker, request.getOptionStrike()) : "None") + 
                ", Type: " + (request.getOptionType() != null ? request.getOptionType() : "None") + 
                ", Expiry: " + (request.getOptionExpiry() != null ? request.getOptionExpiry() : "None") + "\n" +
                "- RSI: " + String.format("%.2f", rsi) + ", MACD Hist: " + String.format("%.4f", macdHist) + ", VWAP: " + formatVal(ticker, vwap) + "\n" +
                "- News Sentiment: " + bullNews + " Bullish, " + bearNews + " Bearish\n\n" +
                "Evaluate this setup. Predict the direction (UP, DOWN, or STAGNANT), success probability (0-100), target price, stop loss, and write a detailed explanation.\n" +
                "Note: Do not output prefix symbols like $ or ₹ inside the targetPrice and stopLoss number fields of the JSON, output them as raw float numbers. But you can use the correct currency symbols in the text explanation.\n" +
                "Respond ONLY with this JSON structure:\n" +
                "{\n" +
                "  \"direction\": \"UP/DOWN/STAGNANT\",\n" +
                "  \"probability\": 85.0,\n" +
                "  \"targetPrice\": 125.00,\n" +
                "  \"stopLoss\": 110.00,\n" +
                "  \"explanation\": \"Detailed prediction logic and Option analysis...\"\n" +
                "}";

        if ("ollama".equalsIgnoreCase(aiProvider)) {
            CustomAnalysisResponse res = queryOllamaCustom(ticker, prompt, query);
            if (res != null) return res;
        } else if ("groq".equalsIgnoreCase(aiProvider) && groqKey != null && !groqKey.isBlank()) {
            CustomAnalysisResponse res = queryGroqCustom(ticker, prompt, query);
            if (res != null) return res;
        } else if ("gemini".equalsIgnoreCase(aiProvider) && geminiKey != null && !geminiKey.isBlank()) {
            CustomAnalysisResponse res = queryGeminiCustom(ticker, prompt, query);
            if (res != null) return res;
        }

        return generateRuleBasedCustomResponse(ticker, query, currentPrice, rsi, macdHist, vwap, request);
    }

    private CustomAnalysisResponse queryOllamaCustom(String ticker, String prompt, String query) {
        try {
            String url = ollamaUrl + "/api/generate";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            ObjectNode payload = objectMapper.createObjectNode();
            payload.put("model", ollamaModel);
            payload.put("prompt", prompt);
            payload.put("stream", false);
            payload.put("format", "json");

            HttpEntity<String> entity = new HttpEntity<>(payload.toString(), headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode responseNode = objectMapper.readTree(response.getBody());
                String responseText = responseNode.path("response").asText();
                return parseCustomResponse(ticker, responseText, query);
            }
        } catch (Exception e) {
            System.err.println("Ollama custom prediction query failed: " + e.getMessage());
        }
        return null;
    }

    private CustomAnalysisResponse queryGroqCustom(String ticker, String prompt, String query) {
        try {
            String url = "https://api.groq.com/openai/v1/chat/completions";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + groqKey);

            ObjectNode responseFormat = objectMapper.createObjectNode();
            responseFormat.put("type", "json_object");

            ObjectNode systemMessage = objectMapper.createObjectNode();
            systemMessage.put("role", "system");
            systemMessage.put("content", "You are tradewithAI. You respond only with valid JSON.");

            ObjectNode userMessage = objectMapper.createObjectNode();
            userMessage.put("role", "user");
            userMessage.put("content", prompt);

            HttpEntity<String> entity = new HttpEntity<>(
                String.format("{\"model\":\"%s\",\"messages\":[%s,%s],\"response_format\":%s}",
                    groqModel, systemMessage.toString(), userMessage.toString(), responseFormat.toString()),
                headers
            );

            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                String responseText = root.path("choices").get(0).path("message").path("content").asText();
                return parseCustomResponse(ticker, responseText, query);
            }
        } catch (Exception e) {
            System.err.println("Groq custom prediction query failed: " + e.getMessage());
        }
        return null;
    }

    private CustomAnalysisResponse queryGeminiCustom(String ticker, String prompt, String query) {
        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + geminiKey;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            ObjectNode payload = objectMapper.createObjectNode();
            ArrayNode contents = payload.putArray("contents");
            ObjectNode contentObj = contents.addObject();
            ArrayNode parts = contentObj.putArray("parts");
            ObjectNode partObj = parts.addObject();
            partObj.put("text", prompt);

            ObjectNode genConfig = payload.putObject("generationConfig");
            genConfig.put("responseMimeType", "application/json");

            HttpEntity<String> entity = new HttpEntity<>(payload.toString(), headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                String responseText = root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
                return parseCustomResponse(ticker, responseText, query);
            }
        } catch (Exception e) {
            System.err.println("Gemini custom API query failed: " + e.getMessage());
        }
        return null;
    }

    private CustomAnalysisResponse parseCustomResponse(String ticker, String jsonText, String query) {
        try {
            String cleaned = jsonText.trim();
            if (cleaned.startsWith("```")) {
                int firstLineEnd = cleaned.indexOf("\n");
                int lastFence = cleaned.lastIndexOf("```");
                if (firstLineEnd != -1 && lastFence != -1) {
                    cleaned = cleaned.substring(firstLineEnd + 1, lastFence).trim();
                }
            }
            JsonNode root = objectMapper.readTree(cleaned);
            return new CustomAnalysisResponse(
                ticker,
                root.path("direction").asText("STAGNANT").toUpperCase(),
                root.path("probability").asDouble(50.0),
                root.path("targetPrice").asDouble(0.0),
                root.path("stopLoss").asDouble(0.0),
                root.path("explanation").asText("Llama custom analysis prediction."),
                query
            );
        } catch (Exception e) {
            System.err.println("Failed to parse custom prediction response JSON: " + e.getMessage());
            return null;
        }
    }

    private CustomAnalysisResponse generateRuleBasedCustomResponse(
            String ticker, String query, double currentPrice, double rsi, double macdHist, double vwap, CustomAnalysisRequest req) {
        
        String direction = "STAGNANT";
        double probability = 50.0;
        
        int score = 0;
        if (rsi < 42) score += 1;
        if (rsi > 62) score -= 1;
        if (macdHist > 0) score += 1;
        if (macdHist < 0) score -= 1;
        if (currentPrice > vwap) score += 1;
        
        if (score >= 1) {
            direction = "UP";
            probability = 62.5 + (score * 5.0);
        } else if (score <= -1) {
            direction = "DOWN";
            probability = 62.5 + (Math.abs(score) * 5.0);
        }
        
        double target = currentPrice * (direction.equals("UP") ? 1.05 : direction.equals("DOWN") ? 0.95 : 1.0);
        double sl = currentPrice * (direction.equals("UP") ? 0.97 : direction.equals("DOWN") ? 1.03 : 1.0);

        String optionDetailsStr = "";
        if (req.getOptionType() != null && !req.getOptionType().equalsIgnoreCase("NONE")) {
            String action = "HOLD";
            if (direction.equals("UP")) {
                action = req.getOptionType().equalsIgnoreCase("CALL") ? "BUY CALL (CE)" : "SELL PUT (PE) / AVOID";
            } else if (direction.equals("DOWN")) {
                action = req.getOptionType().equalsIgnoreCase("PUT") ? "BUY PUT (PE)" : "SELL CALL (CE) / AVOID";
            }
            optionDetailsStr = String.format("For the %s %s Option at Strike %s expiring on %s, the recommended action is %s. ", 
                ticker, req.getOptionType(), formatVal(ticker, req.getOptionStrike()), req.getOptionExpiry(), action);
        }

        String explanation = String.format(
            "%stradewithAI quantitative engine predicts a %s movement for %s. " +
            "RSI is currently at %.2f and MACD histogram stands at %.4f, showing %s momentum. " +
            "Based on the price trading %s the VWAP (%s), there is a %.1f%% likelihood of hitting the target of %s. " +
            "Recommend placing a stop-loss at %s to protect capital against unexpected volatility.",
            optionDetailsStr, direction, ticker, rsi, macdHist,
            (direction.equals("UP") ? "positive structural" : direction.equals("DOWN") ? "negative correctional" : "consolidated range-bound"),
            (currentPrice >= vwap ? "above" : "below"), formatVal(ticker, vwap), probability, formatVal(ticker, target), formatVal(ticker, sl)
        );

        return new CustomAnalysisResponse(ticker, direction, probability, target, sl, explanation, query);
    }
}
