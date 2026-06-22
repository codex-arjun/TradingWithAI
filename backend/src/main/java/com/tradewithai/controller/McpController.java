package com.tradewithai.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.tradewithai.model.McpRequest;
import com.tradewithai.model.McpResponse;
import com.tradewithai.service.McpToolRegistry;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.concurrent.ConcurrentHashMap;

@RestController
@CrossOrigin(origins = "*")
public class McpController {

    private final McpToolRegistry mcpToolRegistry;
    private final ObjectMapper objectMapper;
    private final ConcurrentHashMap<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    public McpController(McpToolRegistry mcpToolRegistry, ObjectMapper objectMapper) {
        this.mcpToolRegistry = mcpToolRegistry;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/sse")
    public SseEmitter handleSse(@RequestParam(required = false, defaultValue = "default") String clientId) {
        SseEmitter emitter = new SseEmitter(3600000L); // 1 hour timeout
        emitters.put(clientId, emitter);

        emitter.onCompletion(() -> emitters.remove(clientId));
        emitter.onTimeout(() -> emitters.remove(clientId));
        emitter.onError((e) -> emitters.remove(clientId));

        try {
            // Send connection endpoint info event
            emitter.send(SseEmitter.event()
                .name("endpoint")
                .data("/api/mcp/message?clientId=" + clientId));
        } catch (Exception e) {
            emitter.completeWithError(e);
        }
        return emitter;
    }

    @PostMapping("/api/mcp/message")
    public ResponseEntity<McpResponse> handleMessage(
            @RequestBody McpRequest request,
            @RequestParam(required = false, defaultValue = "default") String clientId) {
        
        McpResponse response = new McpResponse();
        response.setId(request.getId());

        try {
            String method = request.getMethod();
            if ("tools/list".equals(method)) {
                JsonNode toolsList = mcpToolRegistry.listTools();
                response.setResult(toolsList);
            } else if ("tools/call".equals(method)) {
                JsonNode params = request.getParams();
                String toolName = params.path("name").asText();
                JsonNode args = params.path("arguments");
                
                JsonNode callResult = mcpToolRegistry.callTool(toolName, args);
                response.setResult(callResult);
            } else if ("initialize".equals(method)) {
                // Return standard mock initialization result
                ObjectNode initResult = objectMapper.createObjectNode();
                initResult.put("protocolVersion", "2024-11-05");
                ObjectNode capabilities = initResult.putObject("capabilities");
                capabilities.putObject("tools");
                ObjectNode serverInfo = initResult.putObject("serverInfo");
                serverInfo.put("name", "tradewithAI-server");
                serverInfo.put("version", "1.0.0");
                
                response.setResult(initResult);
            } else {
                // Method not found
                ObjectNode errorNode = objectMapper.createObjectNode();
                errorNode.put("code", -32601);
                errorNode.put("message", "Method not found: " + method);
                response.setError(errorNode);
            }
        } catch (Exception e) {
            // Internal error
            ObjectNode errorNode = objectMapper.createObjectNode();
            errorNode.put("code", -32603);
            errorNode.put("message", "Internal error: " + e.getMessage());
            response.setError(errorNode);
            e.printStackTrace();
        }

        // Also push the response over SSE if emitter is registered
        SseEmitter emitter = emitters.get(clientId);
        if (emitter != null) {
            try {
                emitter.send(SseEmitter.event()
                    .name("message")
                    .data(objectMapper.writeValueAsString(response)));
            } catch (Exception sseEx) {
                System.err.println("Failed to send message over SSE: " + sseEx.getMessage());
            }
        }

        return ResponseEntity.ok(response);
    }
}
