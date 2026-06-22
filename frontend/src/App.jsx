import React, { useState, useEffect, useMemo, useRef } from 'react';
import { RefreshCw, Play, TrendingUp, Cpu, Activity, AlertCircle, Terminal, ChevronDown, ChevronUp, Trash2, X, CheckCircle2, Wallet, Percent, Info, TrendingDown, Plus, Minus } from 'lucide-react';
import Watchlist from './components/Watchlist';
import TradingChart from './components/TradingChart';
import RecommendationCard from './components/RecommendationCard';
import NewsFeed from './components/NewsFeed';
import CustomAnalyzer from './components/CustomAnalyzer';
import OptionChain from './components/OptionChain';

const API_BASE = 'http://localhost:5050';

export default function App() {
  const [clientId] = useState(() => 'mcp-client-' + Math.random().toString(36).substring(2, 11));
  const [symbols, setSymbols] = useState([]);
  const [activeSymbol, setActiveSymbol] = useState(null);
  const [marketData, setMarketData] = useState([]);
  const [dailyMarketData, setDailyMarketData] = useState([]);
  const [news, setNews] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [globalIndices, setGlobalIndices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeLlm, setActiveLlm] = useState('Loading...');
  const [upstoxConnected, setUpstoxConnected] = useState(false);
  const [marketFeed, setMarketFeed] = useState('Yahoo Finance');
  
  // SSE & Console Logs States
  const [mcpStatus, setMcpStatus] = useState('disconnected');
  const [logs, setLogs] = useState([]);
  const [consoleExpanded, setConsoleExpanded] = useState(false);
  const consoleBottomRef = useRef(null);

  // Tabs & Options Chain Prefills
  const [showGlobalIndices, setShowGlobalIndices] = useState(true);
  const [activeTab, setActiveTab] = useState('CHART');
  const [prefilledOption, setPrefilledOption] = useState(null);
  const [candleInterval, setCandleInterval] = useState('1d');

  // Order Placement Modal States
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderTicker, setOrderTicker] = useState('');
  const [orderLtp, setOrderLtp] = useState(0.0);
  const [orderTransactionType, setOrderTransactionType] = useState('BUY');
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderPrice, setOrderPrice] = useState(0.0);
  const [orderType, setOrderType] = useState('MARKET');
  const [orderProduct, setOrderProduct] = useState('INTRADAY');
  const [orderStatusReceipt, setOrderStatusReceipt] = useState(null);
  const [orderExecuting, setOrderExecuting] = useState(false);

  // Simulated User Balance with Persistence
  const [userBalance, setUserBalance] = useState(() => {
    const saved = localStorage.getItem('trade_user_balance');
    return saved ? parseFloat(saved) : 500000.00;
  });

  useEffect(() => {
    localStorage.setItem('trade_user_balance', userBalance.toString());
  }, [userBalance]);

  const [orderModalTab, setOrderModalTab] = useState('TRADE'); // 'TRADE' | 'ANALYSIS'
  const [orderLotSize, setOrderLotSize] = useState(1);

  // Incremental ID generator for JSON-RPC
  const rpcIdCounter = useRef(1);

  // Helper to append log messages to terminal console
  const addLog = (direction, method, detail, rawData = null) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        timestamp,
        direction, // 'SENT' | 'RECEIVED' | 'SYSTEM'
        method,
        detail,
        rawData: rawData ? JSON.stringify(rawData, null, 2) : null,
      },
    ]);
  };

  // Auto-scroll logs to bottom if console is expanded
  useEffect(() => {
    if (consoleExpanded && consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, consoleExpanded]);

  // Central JSON-RPC Caller
  const callMcpTool = async (name, args = {}) => {
    const rpcId = rpcIdCounter.current++;
    const requestPayload = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name,
        arguments: args,
      },
      id: rpcId,
    };

    addLog('SENT', 'tools/call', `Invoke "${name}" with args: ${JSON.stringify(args)}`, requestPayload);

    try {
      const response = await fetch(`${API_BASE}/api/mcp/message?clientId=${clientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const jsonRpcResponse = await response.json();
      
      if (jsonRpcResponse.error) {
        addLog('RECEIVED', 'error', `Tool "${name}" failed: ${jsonRpcResponse.error.message}`, jsonRpcResponse);
        throw new Error(jsonRpcResponse.error.message || 'MCP tool invocation error');
      }

      addLog('RECEIVED', 'result', `Tool "${name}" returned success`, jsonRpcResponse);

      // Parse payload content returned by standard MCP server format
      if (jsonRpcResponse.result && jsonRpcResponse.result.content) {
        const textContent = jsonRpcResponse.result.content.find(c => c.type === 'text');
        if (textContent && textContent.text) {
          return JSON.parse(textContent.text);
        }
      }

      return jsonRpcResponse.result;
    } catch (err) {
      console.error(`MCP execution error for tool ${name}:`, err);
      addLog('SYSTEM', 'error', `Failed to invoke tool "${name}": ${err.message}`);
      throw err;
    }
  };

  // 1. SSE Stream setup
  useEffect(() => {
    setMcpStatus('connecting');
    addLog('SYSTEM', 'sse-connect', `Establishing SSE channel at ${API_BASE}/sse?clientId=${clientId}`);

    const eventSource = new EventSource(`${API_BASE}/sse?clientId=${clientId}`);

    eventSource.onopen = () => {
      setMcpStatus('connected');
      addLog('SYSTEM', 'sse-open', 'SSE transport connection established.');
      // Send initialize command
      sendInitialize();
    };

    eventSource.addEventListener('endpoint', (event) => {
      addLog('RECEIVED', 'sse-endpoint', `Server allocated post endpoint: ${event.data}`);
    });

    eventSource.addEventListener('message', (event) => {
      try {
        const parsed = JSON.parse(event.data);
        addLog('RECEIVED', 'sse-push', `SSE push message event`, parsed);
      } catch (err) {
        addLog('RECEIVED', 'sse-raw', `SSE raw message: ${event.data}`);
      }
    });

    eventSource.onerror = (err) => {
      console.error("SSE stream connection error:", err);
      setMcpStatus('disconnected');
      addLog('SYSTEM', 'sse-error', 'SSE connection disconnected or timed out.');
    };

    return () => {
      eventSource.close();
      addLog('SYSTEM', 'sse-close', 'SSE connection closed.');
    };
  }, [clientId]);

  // Upstox OAuth Message Listener
  useEffect(() => {
    const handleOAuthMessage = (event) => {
      if (event.data && event.data.type === 'UPSTOX_AUTH_SUCCESS') {
        addLog('SYSTEM', 'upstox-auth', 'Upstox login success postMessage received!');
        fetchUpstoxStatus();
        if (activeSymbol) {
          fetchSymbolData(activeSymbol.ticker, candleInterval, true);
        }
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [activeSymbol, candleInterval]);

  // Standard MCP Initialization protocol
  const sendInitialize = async () => {
    const rpcId = rpcIdCounter.current++;
    const initPayload = {
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        clientInfo: {
          name: 'tradewithAI-client',
          version: '1.0.0',
        },
      },
      id: rpcId,
    };

    addLog('SENT', 'initialize', 'Send protocol version & capabilities declaration', initPayload);

    try {
      const res = await fetch(`${API_BASE}/api/mcp/message?clientId=${clientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initPayload),
      });
      if (res.ok) {
        const data = await res.json();
        addLog('RECEIVED', 'initialize', 'Protocol initialised successfully', data);
        
        // Discover tools next
        sendListTools();
      }
    } catch (err) {
      addLog('SYSTEM', 'initialize-error', `MCP Init failed: ${err.message}`);
    }
  };

  const sendListTools = async () => {
    const rpcId = rpcIdCounter.current++;
    const listPayload = {
      jsonrpc: '2.0',
      method: 'tools/list',
      params: {},
      id: rpcId,
    };

    addLog('SENT', 'tools/list', 'Request server tools list schema', listPayload);

    try {
      const res = await fetch(`${API_BASE}/api/mcp/message?clientId=${clientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listPayload),
      });
      if (res.ok) {
        const data = await res.json();
        addLog('RECEIVED', 'tools/list', `Registered tools loaded: ${data.result?.tools?.length || 0} tools`, data);
        
        // Load watchlist after tools listing succeeds
        fetchWatchlist();
        fetchGlobalIndices();
        fetchActiveLlm();
        fetchUpstoxStatus();
      }
    } catch (err) {
      addLog('SYSTEM', 'tools-list-error', `Tools listing failed: ${err.message}`);
    }
  };

  const fetchActiveLlm = async () => {
    try {
      const data = await callMcpTool('get_active_llm');
      if (data && data.provider) {
        setActiveLlm(data.provider);
      }
    } catch (err) {
      console.error("Failed to load active LLM via tool:", err);
      setActiveLlm('Unknown (Error)');
    }
  };

  const fetchUpstoxStatus = async () => {
    try {
      const data = await callMcpTool('check_upstox_status');
      if (data) {
        setUpstoxConnected(data.connected);
        setMarketFeed(data.feed);
      }
    } catch (err) {
      console.error("Failed to load Upstox status via tool:", err);
    }
  };

  const fetchGlobalIndices = async () => {
    try {
      const data = await callMcpTool('get_global_indices');
      if (Array.isArray(data)) {
        setGlobalIndices(data);
      }
    } catch (err) {
      console.error("Failed to load global indices via tool:", err);
    }
  };

  const fetchWatchlist = async () => {
    try {
      setError('');
      const data = await callMcpTool('list_symbols');
      const symbolsArray = Array.isArray(data) ? data : [];
      setSymbols(symbolsArray);
      if (symbolsArray.length > 0 && !activeSymbol) {
        setActiveSymbol(symbolsArray[0]);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('Could not connect to Spring Boot MCP backend. Please ensure the server is running on port 5050.');
      setLoading(false);
    }
  };

  // Fetch symbol details when active symbol or candle interval changes
  useEffect(() => {
    if (activeSymbol) {
      setPrefilledOption(null);
      fetchSymbolData(activeSymbol.ticker, candleInterval, false);
    }
  }, [activeSymbol, candleInterval]);

  // Reset tab to CHART when symbol changes
  useEffect(() => {
    setActiveTab('CHART');
  }, [activeSymbol]);

  const fetchSymbolData = async (ticker, interval, forceRefresh) => {
    setLoading(true);
    setAiLoading(true);
    setError('');
    try {
      // 1. Fetch market data for chart
      const marketJson = await callMcpTool('get_market_data', { ticker, interval, refresh: forceRefresh });
      setMarketData(marketJson);

      // 2. Fetch daily market data if selected interval is not '1d' (required for options calculations & pivots)
      let dailyJson = marketJson;
      if (interval !== '1d') {
        try {
          dailyJson = await callMcpTool('get_market_data', { ticker, interval: '1d', refresh: false });
        } catch (dailyErr) {
          console.error("Failed to fetch daily backup data:", dailyErr);
        }
      }
      setDailyMarketData(dailyJson);

      // 3. Fetch news feed
      const newsJson = await callMcpTool('get_news', { ticker, refresh: forceRefresh });
      setNews(newsJson);

      // 4. Fetch Llama Recommendations
      const recoJson = await callMcpTool('get_recommendations', { ticker, refresh: forceRefresh });
      setRecommendations(recoJson);

      setLoading(false);
      setAiLoading(false);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error fetching symbol details via MCP tools');
      setLoading(false);
      setAiLoading(false);
    }
  };

  const handleAddSymbol = async (newSym) => {
    try {
      const saved = await callMcpTool('add_symbol', newSym);
      setSymbols(prev => [...prev, saved]);
      setActiveSymbol(saved);
    } catch (err) {
      throw new Error(err.message || 'Failed to add symbol');
    }
  };

  const handleRefreshAll = () => {
    fetchActiveLlm();
    fetchUpstoxStatus();
    if (activeSymbol) {
      fetchSymbolData(activeSymbol.ticker, candleInterval, true);
    }
  };

  const handleUpstoxConnect = () => {
    const width = 600, height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    window.open(
      `${API_BASE}/api/upstox/login`,
      'Upstox Login',
      `width=${width},height=${height},top=${top},left=${left}`
    );
  };

  const handleCustomAnalysis = async (payload) => {
    // Pass execution call to predict_custom tool
    return await callMcpTool('predict_custom', payload);
  };

  const handleOpenOrderModal = async (tickerName, transType, prefilledPrice) => {
    setOrderTicker(tickerName);
    setOrderTransactionType(transType);
    setOrderLtp(prefilledPrice || 100.0);
    setOrderPrice(prefilledPrice || 100.0);
    setOrderType('MARKET');
    setOrderProduct('INTRADAY');
    
    // Initial guess placeholder
    let initialLotSize = 1;
    const upper = tickerName.toUpperCase();
    const isOption = upper.includes(' CE') || upper.includes(' PE');
    
    if (isOption) {
      if (upper.includes('NIFTY') && !upper.includes('BANK') && !upper.includes('FIN')) {
        initialLotSize = 75; // Nifty 50 lot size is 75
      } else if (upper.includes('BANKNIFTY')) {
        initialLotSize = 15;
      } else if (upper.includes('SENSEX')) {
        initialLotSize = 20;
      } else if (upper.includes('FINNIFTY')) {
        initialLotSize = 40;
      } else {
        initialLotSize = 25;
      }
    }
    
    setOrderLotSize(initialLotSize);
    setOrderQuantity(initialLotSize); // Default to exactly 1 lot
    
    setOrderStatusReceipt(null);
    setOrderExecuting(false);
    setOrderModalOpen(true);

    try {
      const details = await callMcpTool('resolve_instrument', { ticker: tickerName });
      if (details && details.lotSize) {
        setOrderLotSize(details.lotSize);
        setOrderQuantity(details.lotSize); // Sync quantity to resolved lot size
      }
    } catch (err) {
      console.error("Failed to dynamically fetch lot size from Upstox/Backend:", err);
    }
  };

  const handleExecuteOrder = async () => {
    setOrderExecuting(true);
    try {
      const orderPayload = {
        ticker: orderTicker,
        transactionType: orderTransactionType,
        quantity: parseInt(orderQuantity),
        price: orderType === 'MARKET' ? 0.0 : parseFloat(orderPrice),
        orderType: orderType,
        product: orderProduct
      };
      
      const receipt = await callMcpTool('place_order', orderPayload);
      setOrderStatusReceipt(receipt);

      if (receipt && receipt.status === 'SUCCESS') {
        const cost = receipt.totalCost || (receipt.price * receipt.quantity);
        setUserBalance(prev => {
          if (orderTransactionType === 'BUY') {
            return prev - cost;
          } else {
            return prev + cost;
          }
        });
      }
    } catch (err) {
      console.error(err);
      setOrderStatusReceipt({
        status: 'FAILED',
        message: err.message || 'Failed to place order.'
      });
    } finally {
      setOrderExecuting(false);
    }
  };

  const handleCloseOrderModal = () => {
    setOrderModalOpen(false);
    setOrderStatusReceipt(null);
    setOrderModalTab('TRADE');
  };

  const renderOrderModal = () => {
    if (!orderModalOpen) return null;

    const upperTicker = orderTicker.toUpperCase();
    const isOption = upperTicker.includes(' CE') || upperTicker.includes(' PE');
    
    let lotSize = orderLotSize;
    let optionType = null;
    let strikePrice = null;
    let underlyingSymbol = orderTicker;

    if (isOption) {
      const parts = orderTicker.split(' ');
      if (parts.length >= 3) {
        underlyingSymbol = parts[0].toUpperCase();
        strikePrice = parseFloat(parts[1]);
        optionType = parts[2].toUpperCase() === 'CE' ? 'CALL' : 'PUT';
      }
    }

    const lots = isOption ? Math.max(1, Math.floor(orderQuantity / lotSize)) : 1;
    const currentPrice = orderType === 'MARKET' ? orderLtp : orderPrice;
    
    // Leverage check for Intraday stocks
    const isLeveraged = !isOption && orderProduct === 'INTRADAY' && !orderTicker.startsWith('^');
    let requiredFunds = orderQuantity * currentPrice;
    if (isLeveraged) {
      requiredFunds = requiredFunds / 5.0; // 5x leverage for intraday equity
    }

    const hasInsufficientFunds = userBalance < requiredFunds;

    const handleLotChange = (newLots) => {
      const val = Math.max(1, newLots);
      setOrderQuantity(val * lotSize);
    };

    const handleQtyChange = (newQty) => {
      setOrderQuantity(Math.max(1, newQty));
    };

    // Greeks calculations (if option)
    let delta = 0;
    let theta = 0;
    let gamma = 0;
    let vega = 0;
    let breakeven = 0;

    const spot = latestPrice || orderLtp;

    if (isOption && strikePrice) {
      const dVal = (spot - strikePrice) / (strikePrice * 0.05);
      if (optionType === 'CALL') {
        delta = Math.min(0.95, Math.max(0.05, 0.5 + 0.5 * Math.tanh(dVal)));
        theta = -(currentPrice * 0.08 + 2.5);
        breakeven = strikePrice + currentPrice;
      } else {
        delta = Math.max(-0.95, Math.min(-0.05, -0.5 + 0.5 * Math.tanh(dVal)));
        theta = -(currentPrice * 0.07 + 2.0);
        breakeven = strikePrice - currentPrice;
      }
      gamma = Math.exp(-dVal * dVal) / (strikePrice * 0.06);
      vega = currentPrice * 0.18;
    } else {
      breakeven = currentPrice;
    }

    // Payoff table projection calculations
    const pricePoints = [
      { label: '-2.0% Move', price: spot * 0.98 },
      { label: '-1.0% Move', price: spot * 0.99 },
      { label: 'Spot Price', price: spot },
      { label: '+1.0% Move', price: spot * 1.01 },
      { label: '+2.0% Move', price: spot * 1.02 }
    ];

    const projectedPayoffs = pricePoints.map(pt => {
      let exitOptionPrice = 0;
      let pnlPerShare = 0;
      
      if (isOption && strikePrice) {
        // Intrinsic value at expiration
        if (optionType === 'CALL') {
          exitOptionPrice = Math.max(0, pt.price - strikePrice);
        } else {
          exitOptionPrice = Math.max(0, strikePrice - pt.price);
        }
        
        // P&L
        if (orderTransactionType === 'BUY') {
          pnlPerShare = exitOptionPrice - currentPrice;
        } else {
          pnlPerShare = currentPrice - exitOptionPrice;
        }
      } else {
        // Equities
        if (orderTransactionType === 'BUY') {
          pnlPerShare = pt.price - currentPrice;
        } else {
          pnlPerShare = currentPrice - pt.price;
        }
        
        if (isLeveraged) {
          pnlPerShare = pnlPerShare * 5.0; // 5x leverage
        }
      }
      
      const totalPnl = pnlPerShare * orderQuantity;
      const pnlPercent = (pnlPerShare / currentPrice) * 100;
      
      return {
        label: pt.label,
        price: pt.price,
        pnl: totalPnl,
        percent: pnlPercent
      };
    });

    const isBuy = orderTransactionType === 'BUY';

    return (
      <div className="modal-overlay" onClick={handleCloseOrderModal}>
        <div className="order-modal" onClick={e => e.stopPropagation()}>
          
          {/* Header */}
          <div className="order-modal-header">
            <div className="order-modal-title">
              <h3>{orderTicker}</h3>
              <span>LTP: ₹{orderLtp.toFixed(2)}</span>
            </div>
            <button className="order-modal-close" onClick={handleCloseOrderModal}>
              <X size={18} />
            </button>
          </div>

          {/* If receipt is generated, display the transaction summary */}
          {orderStatusReceipt ? (
            <div className="order-modal-body" style={{ padding: '24px' }}>
              {orderStatusReceipt.status === 'SUCCESS' ? (
                <div className="receipt-container">
                  <div className="receipt-success-ring">
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '16px', margin: '0 0 4px 0' }}>
                    Order Executed Successfully
                  </h4>
                  <p style={{ color: 'var(--text-dim)', fontSize: '12px', margin: '0 0 16px 0' }}>
                    {orderStatusReceipt.message}
                  </p>
                  
                  <div className="receipt-details-list">
                    <div className="receipt-details-item">
                      <span>Order ID</span>
                      <strong>{orderStatusReceipt.orderId}</strong>
                    </div>
                    <div className="receipt-details-item">
                      <span>Symbol</span>
                      <strong>{orderStatusReceipt.ticker}</strong>
                    </div>
                    <div className="receipt-details-item">
                      <span>Action</span>
                      <strong style={{ color: orderStatusReceipt.transactionType === 'BUY' ? 'var(--color-up)' : 'var(--color-down)' }}>
                        {orderStatusReceipt.transactionType}
                      </strong>
                    </div>
                    <div className="receipt-details-item">
                      <span>Quantity</span>
                      <strong>{orderStatusReceipt.quantity} ({isOption ? `${lots} Lot(s)` : 'Shares'})</strong>
                    </div>
                    <div className="receipt-details-item">
                      <span>Execution Price</span>
                      <strong>₹{orderStatusReceipt.price.toFixed(2)}</strong>
                    </div>
                    <div className="receipt-details-item">
                      <span>Total Value</span>
                      <strong style={{ color: 'var(--color-accent)' }}>
                        ₹{orderStatusReceipt.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </strong>
                    </div>
                    <div className="receipt-details-item">
                      <span>Product</span>
                      <strong>{orderStatusReceipt.product}</strong>
                    </div>
                  </div>

                  <button className="btn btn-primary" style={{ width: '100%', padding: '10px' }} onClick={handleCloseOrderModal}>
                    Back to Dashboard
                  </button>
                </div>
              ) : (
                <div className="receipt-container">
                  <div className="receipt-success-ring" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: 'var(--color-down)' }}>
                    <AlertCircle size={24} />
                  </div>
                  <h4 style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '16px', margin: '0 0 4px 0' }}>
                    Order Execution Failed
                  </h4>
                  <p style={{ color: 'var(--color-down)', fontSize: '12px', fontWeight: 600, margin: '0 0 16px 0' }}>
                    {orderStatusReceipt.message}
                  </p>
                  
                  <button className="btn btn-primary" style={{ width: '100%', padding: '10px' }} onClick={handleExecuteOrder} disabled={orderExecuting}>
                    {orderExecuting ? 'Retrying Trade...' : 'Retry Order Execution'}
                  </button>
                  <button className="btn" style={{ width: '100%', padding: '10px', marginTop: '10px' }} onClick={handleCloseOrderModal}>
                    Cancel Trade
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="order-modal-tabs">
                <button 
                  className={`order-modal-tab ${orderModalTab === 'TRADE' ? 'active' : ''}`}
                  onClick={() => setOrderModalTab('TRADE')}
                >
                  Trade Placement
                </button>
                <button 
                  className={`order-modal-tab ${orderModalTab === 'ANALYSIS' ? 'active' : ''}`}
                  onClick={() => setOrderModalTab('ANALYSIS')}
                >
                  Payoff & Analysis
                </button>
              </div>

              {/* Modal Body */}
              <div className="order-modal-body">
                {orderModalTab === 'TRADE' ? (
                  <>
                    {/* Buy/Sell selector */}
                    <div className="action-selector">
                      <button 
                        className={`action-btn buy ${isBuy ? 'active' : ''}`}
                        onClick={() => setOrderTransactionType('BUY')}
                      >
                        BUY
                      </button>
                      <button 
                        className={`action-btn sell ${!isBuy ? 'active' : ''}`}
                        onClick={() => setOrderTransactionType('SELL')}
                      >
                        SELL
                      </button>
                    </div>

                    {/* Product Selector */}
                    <div className="modal-form-row">
                      <div>
                        <label className="form-label">Product Type</label>
                        <div className="pill-group">
                          <button 
                            className={`pill-item ${orderProduct === 'INTRADAY' ? 'active' : ''}`}
                            onClick={() => setOrderProduct('INTRADAY')}
                          >
                            Intraday (MIS)
                          </button>
                          <button 
                            className={`pill-item ${orderProduct === 'DELIVERY' ? 'active' : ''}`}
                            onClick={() => setOrderProduct('DELIVERY')}
                          >
                            {isOption ? 'Carryforward' : 'Delivery (CNC)'}
                          </button>
                        </div>
                      </div>
                      
                      {/* Price Type Selector */}
                      <div>
                        <label className="form-label">Price Type</label>
                        <div className="pill-group">
                          <button 
                            className={`pill-item ${orderType === 'MARKET' ? 'active' : ''}`}
                            onClick={() => setOrderType('MARKET')}
                          >
                            Market
                          </button>
                          <button 
                            className={`pill-item ${orderType === 'LIMIT' ? 'active' : ''}`}
                            onClick={() => setOrderType('LIMIT')}
                          >
                            Limit
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Quantity & Price row */}
                    <div className="modal-form-row">
                      {/* Lot size adjusts */}
                      <div>
                        <label className="form-label">{isOption ? `Lots (Size: ${lotSize})` : 'Quantity (Shares)'}</label>
                        <div className="quantity-adjuster">
                          <button 
                            className="qty-adjust-btn"
                            onClick={() => {
                              if (isOption) {
                                handleLotChange(lots - 1);
                              } else {
                                handleQtyChange(orderQuantity - 1);
                              }
                            }}
                          >
                            <Minus size={14} />
                          </button>
                          <input 
                            type="number"
                            className="qty-input"
                            value={isOption ? lots : orderQuantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              if (isOption) {
                                handleLotChange(val);
                              } else {
                                handleQtyChange(val);
                              }
                            }}
                          />
                          <button 
                            className="qty-adjust-btn"
                            onClick={() => {
                              if (isOption) {
                                handleLotChange(lots + 1);
                              } else {
                                handleQtyChange(orderQuantity + 1);
                              }
                            }}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        {isOption && (
                          <span className="lot-hint">Total Qty: {orderQuantity} shares</span>
                        )}
                      </div>

                      {/* Limit Price */}
                      <div>
                        <label className="form-label">Price</label>
                        <div className="price-input-wrapper">
                          <span className="price-input-prefix">₹</span>
                          <input 
                            type="number"
                            step="0.05"
                            className="price-input"
                            value={orderType === 'MARKET' ? orderLtp.toFixed(2) : orderPrice}
                            disabled={orderType === 'MARKET'}
                            onChange={(e) => setOrderPrice(parseFloat(e.target.value) || 0.0)}
                          />
                        </div>
                        {orderType === 'MARKET' && (
                          <span className="lot-hint">LTP order execution</span>
                        )}
                      </div>
                    </div>

                    {/* Margin Info and balance */}
                    <div className="margin-summary-box">
                      <div className="margin-summary-row">
                        <span>Margin Required</span>
                        <strong style={{ color: isBuy ? 'var(--color-up)' : 'var(--color-down)' }}>
                          ₹{requiredFunds.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </div>
                      
                      {isLeveraged && (
                        <div style={{ fontSize: '10.5px', color: 'var(--color-up)', display: 'flex', gap: '3px', marginTop: '-4px' }}>
                          ⚡ 5x Intraday stock leverage applied. (CNC value: ₹{(orderQuantity * currentPrice).toFixed(2)})
                        </div>
                      )}

                      <div className="margin-summary-row" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '4px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Wallet size={12} color="var(--text-dim)" /> Available Balance
                        </span>
                        <div>
                          <strong style={{ marginRight: '6px' }}>
                            ₹{userBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </strong>
                          <button 
                            onClick={() => setUserBalance(500000.00)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--color-accent)',
                              fontSize: '9.5px',
                              fontWeight: 700,
                              textDecoration: 'underline',
                              cursor: 'pointer',
                              padding: 0
                            }}
                            title="Reset Simulated Balance back to ₹5,00,000"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Warning if insufficient funds */}
                    {hasInsufficientFunds && (
                      <div className="margin-warning-banner">
                        <AlertCircle size={14} style={{ flexShrink: 0 }} />
                        <span>
                          Insufficient Funds. You need an additional <strong>₹{Math.abs(userBalance - requiredFunds).toFixed(2)}</strong> to place this trade.
                        </span>
                      </div>
                    )}

                    {/* Place Order Action */}
                    <button 
                      className="btn"
                      disabled={orderExecuting || hasInsufficientFunds}
                      onClick={handleExecuteOrder}
                      style={{ 
                        width: '100%', 
                        padding: '12px', 
                        fontSize: '13.5px',
                        fontWeight: 800,
                        backgroundColor: isBuy ? 'var(--color-up)' : 'var(--color-down)',
                        color: '#ffffff',
                        borderColor: 'transparent',
                        borderRadius: 'var(--radius-sm)',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        marginTop: '4px'
                      }}
                    >
                      {orderExecuting 
                        ? 'Executing Trade...' 
                        : `${isBuy ? 'Place Buy Order' : 'Place Sell Order'}`}
                    </button>
                  </>
                ) : (
                  <>
                    {/* Analysis Tab View */}
                    {isOption ? (
                      <>
                        {/* Option Details */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div className="analysis-info-row">
                            <span>Contract Type</span>
                            <strong>{optionType} ({upperTicker.includes('CE') ? 'Call Option' : 'Put Option'})</strong>
                          </div>
                          <div className="analysis-info-row">
                            <span>Strike Price</span>
                            <strong>₹{strikePrice.toLocaleString()}</strong>
                          </div>
                          <div className="analysis-info-row">
                            <span>Underlying Spot</span>
                            <strong>₹{spot.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                          </div>
                          <div className="analysis-info-row">
                            <span>Breakeven at Expiry</span>
                            <strong style={{ color: 'var(--color-hold)' }}>₹{breakeven.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                          </div>
                        </div>

                        {/* Option Greeks Grid */}
                        <div>
                          <span className="form-label" style={{ marginBottom: '8px' }}>Option Greeks Projections</span>
                          <div className="analysis-greeks-grid">
                            <div className="greek-card" title="Delta: Sensitivity to underlying price changes">
                              <div className="greek-name">Delta</div>
                              <div className="greek-value" style={{ color: delta >= 0 ? 'var(--color-up)' : 'var(--color-down)' }}>
                                {delta.toFixed(2)}
                              </div>
                            </div>
                            <div className="greek-card" title="Theta: Daily time decay of option premium">
                              <div className="greek-name">Theta</div>
                              <div className="greek-value" style={{ color: 'var(--color-down)' }}>
                                {theta.toFixed(2)}
                              </div>
                            </div>
                            <div className="greek-card" title="Gamma: Rate of change of Delta">
                              <div className="greek-name">Gamma</div>
                              <div className="greek-value" style={{ color: 'var(--text-primary)' }}>
                                {gamma.toFixed(5)}
                              </div>
                            </div>
                            <div className="greek-card" title="Vega: Sensitivity to changes in implied volatility">
                              <div className="greek-name">Vega</div>
                              <div className="greek-value" style={{ color: 'var(--color-cyan)' }}>
                                {vega.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Stock Details */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div className="analysis-info-row">
                            <span>Asset Type</span>
                            <strong>EQUITY (SHARES)</strong>
                          </div>
                          <div className="analysis-info-row">
                            <span>Latest Close Price</span>
                            <strong>₹{spot.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                          </div>
                          <div className="analysis-info-row">
                            <span>1-Day Price Trend</span>
                            <strong style={{ color: priceChange >= 0 ? 'var(--color-up)' : 'var(--color-down)' }}>
                              {priceChange >= 0 ? '▲ BULLISH' : '▼ BEARISH'}
                            </strong>
                          </div>
                          <div className="analysis-info-row">
                            <span>Breakeven Entry</span>
                            <strong style={{ color: 'var(--color-hold)' }}>₹{currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '8px', fontSize: '11.5px', color: 'var(--text-muted)', background: 'var(--bg-dark)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                          <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} color="var(--color-cyan)" />
                          <span>
                            Equities have linear payoff payouts. The simulated intraday leverage (5x) gives you 5 times larger profit/loss exposure for the same capital amount.
                          </span>
                        </div>
                      </>
                    )}

                    {/* Expiry Payoff Table */}
                    <div>
                      <span className="form-label" style={{ marginBottom: '8px' }}>Projected Payoff Matrix</span>
                      <div className="payoff-table-header">
                        <div>Underlying Exit</div>
                        <div>Estimated LTP</div>
                        <div>Estimated P&L</div>
                      </div>
                      
                      {projectedPayoffs.map((pt, i) => {
                        const isProfit = pt.pnl >= 0;
                        const isSpot = i === 2; // spot is the middle item
                        
                        // Estimate option premium exit price
                        let estPriceLabel = `₹${(currentPrice + (pt.pnl / orderQuantity)).toFixed(2)}`;
                        if (!isOption) {
                          estPriceLabel = `₹${pt.price.toFixed(2)}`;
                        }

                        return (
                          <div 
                            key={pt.label} 
                            className="payoff-table-row"
                            style={{ 
                              backgroundColor: isSpot ? 'rgba(6, 182, 212, 0.05)' : 'transparent',
                              fontWeight: isSpot ? 700 : 400,
                              borderLeft: isSpot ? '3px solid var(--color-cyan)' : 'none',
                              paddingLeft: isSpot ? '6px' : '0'
                            }}
                          >
                            <div style={{ color: isSpot ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                              {pt.label} {isSpot && ' (Current)'}
                            </div>
                            <div style={{ fontFamily: 'var(--font-mono)' }}>
                              {estPriceLabel}
                            </div>
                            <div 
                              className="pnl-val" 
                              style={{ color: isProfit ? 'var(--color-up)' : 'var(--color-down)' }}
                            >
                              {isProfit ? '+' : ''}₹{pt.pnl.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ({isProfit ? '+' : ''}{pt.percent.toFixed(1)}%)
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    );
  };

  const clearLogs = () => {
    setLogs([]);
  };

  // Get current price of active ticker from daily dataset to ensure consistent daily change calculation
  const latestPrice = dailyMarketData.length > 0 
    ? dailyMarketData[dailyMarketData.length - 1].closePrice 
    : (marketData.length > 0 ? marketData[marketData.length - 1].closePrice : null);
  const previousPrice = dailyMarketData.length > 1 
    ? dailyMarketData[dailyMarketData.length - 2].closePrice 
    : (marketData.length > 1 ? marketData[marketData.length - 2].closePrice : null);
  const priceChange = latestPrice && previousPrice ? latestPrice - previousPrice : 0;
  const priceChangePercent = latestPrice && previousPrice ? (priceChange / previousPrice) * 100 : 0;

  return (
    <div className="app-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <header className="header">
        <div className="header-logo">
          <Cpu className="header-logo-icon" size={24} style={{ color: 'var(--color-cyan)' }} />
          <h1 className="header-logo-text">tradewithAI</h1>
          <span className="header-logo-tag">MCP PROTOCOL</span>
          
          {/* Connection Status Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginLeft: '12px',
            fontSize: '11px',
            background: 'var(--bg-darker)',
            padding: '3px 8px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            color: 'var(--text-muted)'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: mcpStatus === 'connected' ? 'var(--color-up)' : mcpStatus === 'connecting' ? 'var(--color-hold)' : 'var(--color-down)',
              boxShadow: mcpStatus === 'connected' ? '0 0 8px var(--color-up)' : 'none',
              display: 'inline-block'
            }}></span>
            Status: <span style={{ textTransform: 'uppercase', color: mcpStatus === 'connected' ? 'var(--text-primary)' : 'var(--text-muted)' }}>{mcpStatus}</span>
          </div>

          {/* Active LLM Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginLeft: '8px',
            fontSize: '11px',
            background: 'var(--bg-darker)',
            padding: '3px 8px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            color: 'var(--text-muted)'
          }}>
            <span style={{ fontSize: '10px' }}>🤖</span>
            Model: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{activeLlm}</span>
          </div>

          {/* Upstox Connect / Connected Button */}
          <button 
            onClick={handleUpstoxConnect}
            disabled={upstoxConnected}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginLeft: '8px',
              fontSize: '11px',
              background: upstoxConnected ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-darker)',
              padding: '4px 10px',
              borderRadius: '12px',
              border: '1px solid ' + (upstoxConnected ? 'var(--color-up)' : 'var(--border-color)'),
              color: upstoxConnected ? 'var(--color-up)' : 'var(--text-muted)',
              cursor: upstoxConnected ? 'default' : 'pointer',
              fontWeight: 600,
              transition: 'all 0.2s ease-in-out'
            }}
          >
            <span>📈</span>
            {upstoxConnected ? 'Upstox Connected' : 'Connect Upstox'}
          </button>
        </div>

        <div className="header-controls">
          {activeSymbol && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginRight: '10px' }}>
              <span style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {activeSymbol.ticker}
              </span>
              {latestPrice != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {activeSymbol.ticker.startsWith('^') 
                      ? `${latestPrice != null ? latestPrice.toLocaleString(undefined, { minimumFractionDigits: 2 }) : 'N/A'} pts` 
                      : `₹${latestPrice != null ? latestPrice.toLocaleString(undefined, { minimumFractionDigits: 2 }) : 'N/A'}`}
                  </span>
                  <span 
                    style={{ 
                      fontSize: '12px', 
                      fontWeight: 600, 
                      color: priceChange >= 0 ? 'var(--color-up)' : 'var(--color-down)',
                      display: 'flex',
                      alignItems: 'center',
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
                  </span>
                </div>
              )}
              {/* Quick Trade Buttons */}
              {latestPrice != null && (
                <div style={{ display: 'flex', gap: '6px', marginLeft: '6px' }}>
                  <button 
                    onClick={() => handleOpenOrderModal(activeSymbol.ticker, 'BUY', latestPrice)}
                    className="btn"
                    style={{ 
                      padding: '4px 12px', 
                      fontSize: '11px', 
                      backgroundColor: 'var(--color-up)',
                      borderColor: 'var(--color-up)',
                      color: '#ffffff',
                      fontWeight: '800',
                      boxShadow: '0 2px 4px rgba(0, 208, 156, 0.15)'
                    }}
                  >
                    BUY
                  </button>
                  <button 
                    onClick={() => handleOpenOrderModal(activeSymbol.ticker, 'SELL', latestPrice)}
                    className="btn"
                    style={{ 
                      padding: '4px 12px', 
                      fontSize: '11px', 
                      backgroundColor: 'var(--color-down)',
                      borderColor: 'var(--color-down)',
                      color: '#ffffff',
                      fontWeight: '800',
                      boxShadow: '0 2px 4px rgba(255, 82, 82, 0.15)'
                    }}
                  >
                    SELL
                  </button>
                </div>
              )}
            </div>
          )}
          
          <button 
            className={`btn ${showGlobalIndices ? 'btn-success' : ''}`}
            onClick={() => setShowGlobalIndices(!showGlobalIndices)}
            style={{ 
              backgroundColor: showGlobalIndices ? 'rgba(6, 182, 212, 0.15)' : 'var(--border-color)',
              borderColor: showGlobalIndices ? 'var(--color-cyan)' : 'var(--border-color)'
            }}
          >
            🌐 Global Trends
          </button>

          <button 
            className="btn btn-primary" 
            onClick={handleRefreshAll}
            disabled={loading || aiLoading}
          >
            <RefreshCw size={14} className={loading || aiLoading ? 'spin' : ''} />
            Scan Market
          </button>
        </div>
      </header>

      {/* Global Market Ticker Bar */}
      {showGlobalIndices && globalIndices.length > 0 && (
        <div style={{
          background: '#090d18',
          borderBottom: '1px solid var(--border-color)',
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          fontSize: '11.5px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          zIndex: 50
        }}>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', textTransform: 'uppercase', borderRight: '1px solid var(--border-color)', paddingRight: '16px' }}>
            <span style={{ width: '6px', height: '6px', background: 'var(--color-cyan)', borderRadius: '50%', display: 'inline-block' }}></span>
            Global Markets Trend
          </span>
          {globalIndices.map((idx) => {
            const isUp = idx.change >= 0;
            return (
              <div key={idx.symbol} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginRight: '16px' }}>
                <span>{idx.name}</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  {idx.price != null ? idx.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}
                </span>
                <span style={{ color: isUp ? 'var(--color-up)' : 'var(--color-down)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                  {isUp ? '▲' : '▼'}{idx.changePercent != null ? Math.abs(idx.changePercent).toFixed(2) : '0.00'}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Grid + Sidebar Layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        
        {error && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            background: 'rgba(244, 63, 94, 0.15)',
            borderBottom: '1px solid rgba(244, 63, 94, 0.4)',
            color: 'var(--color-down)',
            padding: '10px 24px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            zIndex: 99
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
            <button 
              className="btn" 
              style={{ marginLeft: 'auto', padding: '2px 8px', fontSize: '11px', background: 'rgba(255,255,255,0.08)' }} 
              onClick={sendListTools}
            >
              Retry Connection
            </button>
          </div>
        )}

        <div className="dashboard-grid" style={{ height: '100%', width: '100%', display: 'grid', gridTemplateColumns: '280px 1fr 340px' }}>
          {/* Left Watchlist Panel */}
          <Watchlist 
            symbols={symbols} 
            activeSymbol={activeSymbol} 
            onSelectSymbol={setActiveSymbol} 
            onAddSymbol={handleAddSymbol}
            loading={loading}
          />

          {/* Center Chart Panel */}
          <div className="main-content" style={{ padding: '20px', overflowY: 'auto' }}>
            {loading ? (
              <div className="loading-overlay" style={{ display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%', gap: '15px' }}>
                <Activity size={40} className="spin" style={{ color: 'var(--color-cyan)' }} />
                <p style={{ color: 'var(--text-muted)' }}>Fetching index metrics and option data via MCP client connection...</p>
              </div>
            ) : marketData.length > 0 ? (
              <>
                {/* View Selector Navigation */}
                <div style={{ display: 'flex', gap: '10px', background: 'rgba(7, 11, 20, 0.5)', padding: '6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <button 
                    className={`btn ${activeTab === 'CHART' ? 'btn-primary' : ''}`}
                    onClick={() => setActiveTab('CHART')}
                    style={{ flex: 1, fontWeight: 700 }}
                  >
                    📈 Technical Charts
                  </button>
                  <button 
                    className={`btn ${activeTab === 'OPTION_CHAIN' ? 'btn-primary' : ''}`}
                    onClick={() => setActiveTab('OPTION_CHAIN')}
                    style={{ flex: 1, fontWeight: 700 }}
                  >
                    ⛓️ Option Chain (CE / PE)
                  </button>
                </div>

                {/* Main Interactive Screen */}
                {activeTab === 'CHART' ? (
                  <TradingChart 
                    data={marketData} 
                    ticker={activeSymbol?.ticker} 
                    interval={candleInterval}
                    onIntervalChange={setCandleInterval}
                  />
                ) : (
                  <OptionChain 
                    ticker={activeSymbol?.ticker} 
                    spotPrice={latestPrice} 
                    marketData={dailyMarketData}
                    onSelectOption={(opt) => {
                      setPrefilledOption(opt);
                      const el = document.getElementById('custom-analyzer-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }} 
                    onPlaceOrder={handleOpenOrderModal}
                  />
                )}
                
                {/* AI Recommendations */}
                {aiLoading ? (
                  <div className="card" style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', justifyContent: 'center' }}>
                    <Cpu size={32} className="spin" style={{ color: 'var(--color-cyan)' }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Consulting Llama AI model for trading strategies...</p>
                  </div>
                ) : (
                   <RecommendationCard 
                    recommendations={recommendations} 
                    ticker={activeSymbol?.ticker} 
                    onPlaceOrder={handleOpenOrderModal}
                  />
                )}
              </>
            ) : (
              <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
                Select a ticker from the watchlist to display market analytics.
              </div>
            )}
          </div>

          {/* Right Information sidebar */}
          <div className="right-panel" style={{ padding: '20px', overflowY: 'auto' }}>
            <NewsFeed news={news} />
            
            {/* Core Metrics Overview */}
            {marketData.length > 0 && (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 className="card-title" style={{ margin: 0 }}>
                  <TrendingUp size={16} color="var(--color-up)" /> CORE METRICS OVERVIEW
                </h3>
                
                {(() => {
                  const latest = marketData[marketData.length - 1];
                  const rsiVal = latest.rsi || 50;
                  let rsiStatus = 'Neutral';
                  let rsiColor = 'var(--color-hold)';
                  if (rsiVal > 70) { rsiStatus = 'Overbought'; rsiColor = 'var(--color-down)'; }
                  else if (rsiVal < 30) { rsiStatus = 'Oversold'; rsiColor = 'var(--color-up)'; }

                  const macdVal = latest.macdHist || 0;
                  const macdStatus = macdVal >= 0 ? 'Bullish (Above)' : 'Bearish (Below)';
                  const macdColor = macdVal >= 0 ? 'var(--color-up)' : 'var(--color-down)';

                  const vwapStatus = latest.closePrice > latest.vwap ? 'Price > VWAP' : 'Price < VWAP';
                  const vwapColor = latest.closePrice > latest.vwap ? 'var(--color-up)' : 'var(--color-down)';

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12.5px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>14-Period RSI:</span>
                        <strong style={{ color: rsiColor }}>{rsiVal.toFixed(2)} ({rsiStatus})</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>MACD Hist:</span>
                        <strong style={{ color: macdColor }}>{macdVal.toFixed(4)} ({macdStatus})</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Price vs VWAP:</span>
                        <strong style={{ color: vwapColor }}>{vwapStatus}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Daily Volume:</span>
                        <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          {latest.volume != null ? latest.volume.toLocaleString() : '0'}
                        </strong>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
            
            <div id="custom-analyzer-section">
              <CustomAnalyzer activeTicker={activeSymbol?.ticker} prefilledOption={prefilledOption} onAnalyze={handleCustomAnalysis} />
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible MCP Console Logger Pane */}
      <div style={{
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        height: consoleExpanded ? '280px' : '38px',
        transition: 'height 0.22s ease-in-out',
        zIndex: 200,
        fontFamily: 'var(--font-mono)'
      }}>
        {/* Toggle Bar */}
        <div 
          onClick={() => setConsoleExpanded(!consoleExpanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 20px',
            cursor: 'pointer',
            background: 'var(--bg-dark)',
            borderBottom: consoleExpanded ? '1px solid var(--border-color)' : 'none',
            userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>
            <Terminal size={14} style={{ color: 'var(--color-cyan)' }} />
            <span>MCP JSON-RPC TRAFFIC MONITOR</span>
            <span style={{
              fontSize: '9px',
              background: 'rgba(255,255,255,0.06)',
              padding: '1px 6px',
              borderRadius: '8px',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-sans)'
            }}>{logs.length} logged events</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                clearLogs();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10px'
              }}
              title="Clear Console Logs"
            >
              <Trash2 size={12} /> Clear
            </button>
            {consoleExpanded ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronUp size={14} color="var(--text-muted)" />}
          </div>
        </div>

        {/* Terminals Logs Output */}
        {consoleExpanded && (
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 20px',
            fontSize: '11px',
            color: 'var(--text-muted)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            backgroundColor: '#05070e'
          }}>
            {logs.length === 0 ? (
              <div style={{ color: 'var(--text-dim)', padding: '10px 0', fontSize: '11.5px' }}>
                &gt;_ No JSON-RPC messages recorded yet. Trigger database actions or scan to communicate with backend server.
              </div>
            ) : (
              logs.map((log) => {
                let badgeColor = 'var(--text-dim)';
                let badgeBg = 'rgba(255,255,255,0.05)';
                if (log.direction === 'SENT') {
                  badgeColor = 'var(--color-accent)';
                  badgeBg = 'rgba(99, 102, 241, 0.12)';
                } else if (log.direction === 'RECEIVED') {
                  badgeColor = 'var(--color-up)';
                  badgeBg = 'rgba(16, 185, 129, 0.12)';
                } else if (log.direction === 'SYSTEM') {
                  badgeColor = 'var(--color-hold)';
                  badgeBg = 'rgba(234, 179, 8, 0.12)';
                }

                return (
                  <div key={log.id} style={{ 
                    borderBottom: '1px solid rgba(255, 255, 255, 0.02)', 
                    paddingBottom: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--text-dim)', fontSize: '10px' }}>[{log.timestamp}]</span>
                      <span style={{ 
                        color: badgeColor, 
                        background: badgeBg, 
                        padding: '1px 5px', 
                        borderRadius: '3px', 
                        fontSize: '9px',
                        fontWeight: 800
                      }}>{log.direction}</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{log.method}</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>- {log.detail}</span>
                    </div>
                    {log.rawData && (
                      <pre style={{
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        padding: '8px',
                        borderRadius: '4px',
                        marginTop: '4px',
                        color: '#67e8f9',
                        overflowX: 'auto',
                        fontSize: '10px',
                        maxHeight: '150px'
                      }}>{log.rawData}</pre>
                    )}
                  </div>
                );
              })
            )}
            <div ref={consoleBottomRef} />
          </div>
        )}
      </div>
      {orderModalOpen && renderOrderModal()}
    </div>
  );
}
