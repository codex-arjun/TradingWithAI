package com.tradewithai.model;

import com.fasterxml.jackson.databind.JsonNode;

public class McpResponse {
    private String jsonrpc = "2.0";
    private JsonNode result;
    private JsonNode error;
    private JsonNode id;

    public McpResponse() {}

    public McpResponse(JsonNode id, JsonNode result) {
        this.id = id;
        this.result = result;
    }

    public String getJsonrpc() {
        return jsonrpc;
    }

    public void setJsonrpc(String jsonrpc) {
        this.jsonrpc = jsonrpc;
    }

    public JsonNode getResult() {
        return result;
    }

    public void setResult(JsonNode result) {
        this.result = result;
    }

    public JsonNode getError() {
        return error;
    }

    public void setError(JsonNode error) {
        this.error = error;
    }

    public JsonNode getId() {
        return id;
    }

    public void setId(JsonNode id) {
        this.id = id;
    }
}
