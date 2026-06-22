package com.tradewithai.model;

import com.fasterxml.jackson.databind.JsonNode;

public class McpRequest {
    private String jsonrpc = "2.0";
    private String method;
    private JsonNode params;
    private JsonNode id;

    public McpRequest() {}

    public String getJsonrpc() {
        return jsonrpc;
    }

    public void setJsonrpc(String jsonrpc) {
        this.jsonrpc = jsonrpc;
    }

    public String getMethod() {
        return method;
    }

    public void setMethod(String method) {
        this.method = method;
    }

    public JsonNode getParams() {
        return params;
    }

    public void setParams(JsonNode params) {
        this.params = params;
    }

    public JsonNode getId() {
        return id;
    }

    public void setId(JsonNode id) {
        this.id = id;
    }
}
