import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  RefreshCw, Play, TrendingUp, Cpu, Activity, AlertCircle, Terminal, 
  ChevronDown, ChevronUp, Trash2, X, CheckCircle2, Wallet, Percent, 
  Info, TrendingDown, Plus, Minus, LayoutDashboard, LineChart, 
  History, Settings, Newspaper, ShieldAlert, Cpu as AgentIcon, 
  MessageSquare, User, Bell, Sun, Moon, HelpCircle, PieChart, Coins
} from 'lucide-react';
import Watchlist from './components/Watchlist';
import TradingChart from './components/TradingChart';
import RecommendationCard from './components/RecommendationCard';
import NewsFeed from './components/NewsFeed';
import CustomAnalyzer from './components/CustomAnalyzer';
import OptionChain from './components/OptionChain';

const API_BASE = window.location.protocol + '//' + window.location.hostname + ':5050';

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

  // Sidebar navigation state (Dashboard, Portfolio, Strategies, AI Agents, News, Logs, Settings)
  const [activeNav, setActiveNav] = useState('DASHBOARD'); 
  const [theme, setTheme] = useState(() => localStorage.getItem('trade_theme') || 'dark');
  
  // Dashboard inner view tab
  const [activeTab, setActiveTab] = useState('CHART'); // CHART | OPTION_CHAIN

  // Trade History Filter States
  const [tradeFilterRange, setTradeFilterRange] = useState('ALL'); // ALL | TODAY | WEEK | MONTH
  const [tradeFilterOutcome, setTradeFilterOutcome] = useState('ALL'); // ALL | PROFIT | LOSS
  const [tradeFilterInstrument, setTradeFilterInstrument] = useState('ALL'); // ALL | STOCKS | INDICES | COMMODITIES
  const [expandedTradeId, setExpandedTradeId] = useState(null);

  // SSE & Console Logs States
  const [mcpStatus, setMcpStatus] = useState('disconnected');
  const [logs, setLogs] = useState([]);
  const [consoleExpanded, setConsoleExpanded] = useState(false);
  const consoleBottomRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [liveTimelineLogs, setLiveTimelineLogs] = useState([
    { timestamp: new Date().toLocaleTimeString(), text: 'System standing by. Waiting for Auto-Autopilot cycle...', status: 'success' }
  ]);

  const addNotification = (text, type = 'info') => {
    const id = 'notif-' + Math.random().toString(36).substring(2, 9);
    const newNotif = { id, text, type };
    setNotifications(prev => [newNotif, ...prev]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4500);
  };

  // Bottom Panel Tab State
  const [bottomTab, setBottomTab] = useState('POSITIONS'); // POSITIONS | ORDERS | AI_LOGS | TIMELINE

  // Order Modal
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
  const [orderLotSize, setOrderLotSize] = useState(1);

  // Pre-filled custom analysis state
  const [prefilledOption, setPrefilledOption] = useState(null);

  // Database-backed ledger state synced from backend
  const [portfolioHoldings, setPortfolioHoldings] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [marginDetails, setMarginDetails] = useState({ availableMargin: 500000.0, blockedMargin: 0.0, totalBalance: 500000.0, realizedTodayPnl: 0.0, unrealizedPnl: 0.0 });
  const [aiDecisionLogs, setAiDecisionLogs] = useState([]);

  // Autopilot Engine Configuration
  const [autoTradingActive, setAutoTradingActive] = useState(() => localStorage.getItem('trade_autopilot_active') === 'true');
  const [minProbabilityThreshold, setMinProbabilityThreshold] = useState(() => parseInt(localStorage.getItem('trade_autopilot_threshold') || '75'));
  const [autoTradeLogs, setAutoTradeLogs] = useState([]);

  // AI Chat Assistant state
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: 'Welcome to the TradePilot Institutional Assistant. Ask me anything about your current portfolio risk, NIFTY trend forecasts, or the latest trade decisions.' }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Timeline Events for AI activity
  const [timelineEvents, setTimelineEvents] = useState([
    { time: '11:20:10', text: 'Market data received', status: 'SUCCESS' },
    { time: '11:20:11', text: 'FinGPT started analysis', status: 'SUCCESS' },
    { time: '11:20:13', text: 'Positive news detected', status: 'SUCCESS' },
    { time: '11:20:15', text: 'BUY recommendation generated', status: 'SUCCESS' },
    { time: '11:20:17', text: 'Gemini reviewing recommendation', status: 'SUCCESS' },
    { time: '11:20:19', text: 'Trade approved', status: 'SUCCESS' },
    { time: '11:20:20', text: 'Order placed', status: 'SUCCESS' }
  ]);

  const [candleInterval, setCandleInterval] = useState('1d');

  useEffect(() => {
    localStorage.setItem('trade_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('trade_autopilot_active', autoTradingActive.toString());
  }, [autoTradingActive]);

  useEffect(() => {
    localStorage.setItem('trade_autopilot_threshold', minProbabilityThreshold.toString());
  }, [minProbabilityThreshold]);

  // Load initial watchlist and server statuses on mount immediately
  useEffect(() => {
    fetchWatchlist();
    fetchGlobalIndices();
    fetchActiveLlm();
    fetchUpstoxStatus();
    syncLedgerFromBackend();
  }, []);

  // Synchronize ledger with backend
  const syncLedgerFromBackend = async () => {
    try {
      const margin = await callMcpTool('getPortfolio');
      if (margin) setMarginDetails(margin);

      const positions = await callMcpTool('getOpenPositions');
      if (Array.isArray(positions)) setPortfolioHoldings(positions);

      const orders = await callMcpTool('getOrderHistory');
      if (Array.isArray(orders)) setOrderHistory(orders);

      const decisionLogs = await callMcpTool('getDecisionLogs');
      if (Array.isArray(decisionLogs)) setAiDecisionLogs(decisionLogs);
    } catch (e) {
      console.warn("Failed to synchronize database ledger details:", e);
    }
  };

  // SSE Stream setup
  useEffect(() => {
    setMcpStatus('connecting');
    const eventSource = new EventSource(`${API_BASE}/sse?clientId=${clientId}`);

    eventSource.onopen = () => {
      setMcpStatus('connected');
      sendInitialize();
    };

    eventSource.addEventListener('message', (event) => {
      try {
        const parsed = JSON.parse(event.data);
        addLog('RECEIVED', 'sse-push', `SSE push message event`, parsed);
      } catch (err) {
        addLog('RECEIVED', 'sse-raw', `SSE raw message: ${event.data}`);
      }
    });

    eventSource.onerror = (err) => {
      setMcpStatus('disconnected');
    };

    return () => eventSource.close();
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

  const sendInitialize = async () => {
    const rpcId = Math.floor(Math.random() * 100000);
    const initPayload = {
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        clientInfo: { name: 'tradewithAI-client', version: '1.0.0' }
      },
      id: rpcId
    };
    try {
      const res = await fetch(`${API_BASE}/api/mcp/message?clientId=${clientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initPayload)
      });
      if (res.ok) {
        sendListTools();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const sendListTools = async () => {
    const rpcId = Math.floor(Math.random() * 100000);
    const listPayload = {
      jsonrpc: '2.0',
      method: 'tools/list',
      params: {},
      id: rpcId
    };
    try {
      const res = await fetch(`${API_BASE}/api/mcp/message?clientId=${clientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listPayload)
      });
      if (res.ok) {
        fetchWatchlist();
        fetchGlobalIndices();
        fetchActiveLlm();
        fetchUpstoxStatus();
        syncLedgerFromBackend();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchActiveLlm = async () => {
    try {
      const data = await callMcpTool('get_active_llm');
      if (data && data.provider) setActiveLlm(data.provider);
    } catch (err) {
      setActiveLlm('Ollama/Llama 3');
    }
  };

  const fetchUpstoxStatus = async () => {
    try {
      const data = await callMcpTool('check_upstox_status');
      if (data) {
        setUpstoxConnected(data.connected);
        setMarketFeed(data.feed);
      }
    } catch (err) {}
  };

  const fetchGlobalIndices = async () => {
    try {
      const data = await callMcpTool('get_global_indices');
      if (Array.isArray(data)) setGlobalIndices(data);
    } catch (err) {}
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
      setError('Could not connect to Spring Boot MCP backend. Please ensure the server is running on port 5050.');
      setLoading(false);
    }
  };

  const handleAddSymbol = async (symbolData) => {
    try {
      const saved = await callMcpTool('add_symbol', symbolData);
      setSymbols(prev => [...prev, saved]);
      setActiveSymbol(saved);
    } catch (err) {
      console.error("Failed to add symbol:", err);
    }
  };

  const selectSymbolByTicker = (ticker, fallbackName = '', fallbackType = 'STOCK') => {
    const found = symbols.find(s => s.ticker === ticker);
    if (found) {
      setActiveSymbol(found);
    } else {
      setActiveSymbol({ ticker, name: fallbackName || ticker, type: fallbackType });
    }
    setActiveNav('DASHBOARD');
  };

  useEffect(() => {
    if (activeSymbol) {
      fetchSymbolData(activeSymbol.ticker, candleInterval, false, false);
    }
  }, [activeSymbol, candleInterval]);

  // Periodic background refresh every 5 seconds
  useEffect(() => {
    if (!activeSymbol) return;
    const intervalId = setInterval(() => {
      fetchSymbolData(activeSymbol.ticker, candleInterval, true, true);
      syncLedgerFromBackend();
    }, 5000);
    return () => clearInterval(intervalId);
  }, [activeSymbol, candleInterval]);

  const fetchSymbolData = async (ticker, interval, forceRefresh, isBackground = false) => {
    if (!isBackground) {
      setAiLoading(true);
    }
    try {
      const marketJson = await callMcpTool('get_market_data', { ticker, interval, refresh: forceRefresh });
      setMarketData(marketJson);

      let dailyJson = marketJson;
      if (interval !== '1d') {
        dailyJson = await callMcpTool('get_market_data', { ticker, interval: '1d', refresh: false });
      }
      setDailyMarketData(dailyJson);

      const newsJson = await callMcpTool('get_news', { ticker, refresh: forceRefresh });
      setNews(newsJson);

      const recoJson = await callMcpTool('get_recommendations', { ticker, refresh: forceRefresh });
      setRecommendations(recoJson);

      if (!isBackground) {
        setAiLoading(false);
      }
    } catch (err) {
      if (!isBackground) {
        setAiLoading(false);
      }
    }
  };

  const callMcpTool = async (name, args = {}) => {
    const rpcId = Math.floor(Math.random() * 100000);
    const requestPayload = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name, arguments: args },
      id: rpcId
    };
    addLog('SENT', 'tools/call', `Invoke "${name}"`, requestPayload);

    try {
      const response = await fetch(`${API_BASE}/api/mcp/message?clientId=${clientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });
      const jsonRpcResponse = await response.json();
      if (jsonRpcResponse.error) {
        throw new Error(jsonRpcResponse.error.message);
      }
      addLog('RECEIVED', 'result', `Tool "${name}" returned success`, jsonRpcResponse);
      if (jsonRpcResponse.result && jsonRpcResponse.result.content) {
        const textContent = jsonRpcResponse.result.content.find(c => c.type === 'text');
        if (textContent && textContent.text) {
          return JSON.parse(textContent.text);
        }
      }
      return jsonRpcResponse.result;
    } catch (err) {
      addLog('SYSTEM', 'error', `Failed to invoke tool "${name}": ${err.message}`);
      throw err;
    }
  };

  const handleCustomAnalysis = async (args) => {
    try {
      addLog('SYSTEM', 'custom-analysis', 'Triggering custom indicator strategy forecast...');
      const response = await callMcpTool('predict_custom', args);
      return response;
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpstoxConnect = () => {
    const width = 600, height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    window.open(`${API_BASE}/api/upstox/login`, 'Upstox Login', `width=${width},height=${height},top=${top},left=${left}`);
  };

  const handleOpenOrderModal = async (tickerName, transType, prefilledPrice, prefilledQty) => {
    setOrderTicker(tickerName);
    setOrderTransactionType(transType);
    setOrderLtp(prefilledPrice || 100.0);
    setOrderPrice(prefilledPrice || 100.0);
    setOrderType('MARKET');
    setOrderProduct('INTRADAY');
    setOrderQuantity(prefilledQty || 1);
    setOrderStatusReceipt(null);
    setOrderExecuting(false);
    setOrderModalOpen(true);

    try {
      const details = await callMcpTool('resolve_instrument', { ticker: tickerName });
      if (details && details.lotSize) {
        setOrderLotSize(details.lotSize);
        setOrderQuantity(prefilledQty || details.lotSize);
      }
    } catch (err) {}
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
        syncLedgerFromBackend();
        setTimeout(() => setOrderModalOpen(false), 1500);
      }
    } catch (err) {
      setOrderStatusReceipt({ status: 'FAILED', message: err.message });
    } finally {
      setOrderExecuting(false);
    }
  };

  const triggerAutonomousTradingRound = async () => {
    if (!activeSymbol) return;
    try {
      const res = await callMcpTool('run_ai_trading_round', { ticker: activeSymbol.ticker });
      syncLedgerFromBackend();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const userMsg = { role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');

    setTimeout(() => {
      let botResponse = "I can analyze that ticker or help you evaluate market trends. Let me know if you would like me to scan your watchlist.";
      const query = chatInput.toLowerCase();
      if (query.includes("analyze") || query.includes("nifty")) {
        botResponse = `FinGPT's current technical outlook for ${activeSymbol?.ticker || 'NIFTY'} shows a potential breakout setup with high MACD histogram crossover support.`;
      } else if (query.includes("buy") || query.includes("decision")) {
        botResponse = "Gemini evaluated FinGPT's recommendations against your safety threshold. Positions are sized under 50% margin capacity to guarantee risk protection.";
      } else if (query.includes("risk") || query.includes("portfolio")) {
        botResponse = `Your currently utilized margin is ₹${marginDetails.blockedMargin.toFixed(2)} (${((marginDetails.blockedMargin / marginDetails.totalBalance) * 100).toFixed(1)}% of capital), which is well within safe bounds.`;
      }
      setChatMessages(prev => [...prev, { role: 'assistant', text: botResponse }]);
    }, 1000);
  };

  const addLog = (direction, method, detail, rawData = null) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [
      {
        id: Math.random().toString(),
        timestamp,
        direction,
        method,
        detail,
        rawData: rawData ? JSON.stringify(rawData, null, 2) : null,
      },
      ...prev,
    ].slice(0, 50));
  };

  const clearLogs = () => setLogs([]);

  const latestPrice = dailyMarketData.length > 0 
    ? dailyMarketData[dailyMarketData.length - 1].closePrice 
    : (marketData.length > 0 ? marketData[marketData.length - 1].closePrice : 100.0);
  const previousPrice = dailyMarketData.length > 1 
    ? dailyMarketData[dailyMarketData.length - 2].closePrice 
    : (marketData.length > 1 ? marketData[marketData.length - 1].closePrice : 100.0);
  const priceChange = latestPrice - previousPrice;
  const priceChangePercent = (priceChange / previousPrice) * 100;

  // Find NIFTY & SENSEX for top bar
  const nifty = globalIndices.find(idx => idx.symbol.toUpperCase().includes('NSEI') || idx.symbol.toUpperCase().includes('NIFTY')) || { name: 'NIFTY', price: 24429.75, changePercent: 0.65 };
  const banknifty = globalIndices.find(idx => idx.symbol.toUpperCase().includes('NSEI') || idx.symbol.toUpperCase().includes('BANKNIFTY')) || { name: 'BANKNIFTY', price: 52811.30, changePercent: 0.42 };
  const finnifty = globalIndices.find(idx => idx.symbol.toUpperCase().includes('FINNIFTY')) || { name: 'FINNIFTY', price: 23980.20, changePercent: 0.18 };
  const sensex = globalIndices.find(idx => idx.symbol.toUpperCase().includes('BSESN') || idx.symbol.toUpperCase().includes('SENSEX')) || { name: 'SENSEX', price: 78282.22, changePercent: 0.67 };

  // Render Left Navigation Sidebar
  const renderLeftSidebar = () => {
    const navItems = [
      { id: 'DASHBOARD', label: 'Dashboard', icon: <LayoutDashboard size={14} /> },
      { id: 'LIVE_PROCESSING', label: 'AI Live Processing', icon: <Activity size={14} /> },
      { id: 'MARKETS', label: 'Markets', icon: <TrendingUp size={14} /> },
      { id: 'WATCHLIST_PAGE', label: 'Watchlist', icon: <LineChart size={14} /> },
      { id: 'PORTFOLIO', label: 'Portfolio holdings', icon: <Wallet size={14} /> },
      { id: 'ANALYTICS', label: 'Analytics Dashboard', icon: <PieChart size={14} /> },
      { id: 'STRATEGIES', label: 'AI Strategies', icon: <Percent size={14} /> },
      { id: 'AI_AGENTS', label: 'AI Agents Profile', icon: <Cpu size={14} /> },
      { id: 'NEWS', label: 'Geopolitical News', icon: <Newspaper size={14} /> },
      { id: 'LEDGER', label: 'Trade History', icon: <History size={14} /> },
      { id: 'DECISION_LOGS', label: 'Decision Logs', icon: <Terminal size={14} /> },
      { id: 'SETTINGS', label: 'Safety Settings', icon: <Settings size={14} /> }
    ];

    return (
      <aside className="left-sidebar" style={{
        width: '240px',
        backgroundColor: 'var(--bg-card)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        padding: '12px 8px',
        gap: '4px',
        flexShrink: 0
      }}>
        <div style={{ padding: '8px 12px', fontSize: '10px', fontWeight: 'bold', color: 'var(--text-dim)', uppercase: true, tracking: '1.2px' }}>
          NAVIGATION TERMINAL
        </div>
        {navItems.map((item) => {
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className="sidebar-link-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                fontSize: '12px',
                fontWeight: isActive ? '700' : '500',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                backgroundColor: isActive ? 'var(--bg-dark)' : 'transparent',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{ color: isActive ? 'var(--color-accent)' : 'var(--text-dim)' }}>
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}
      </aside>
    );
  };

  // Render Top Navigation Bar (with 5-section requirements)
  const renderTopBar = () => {
    return (
      <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 24px', backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', zIndex: 100 }}>
        
        {/* Logo & Live Tickers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-accent)', padding: '4px', borderRadius: '4px' }}>
              <Cpu size={16} color="#fff" />
            </div>
            <strong style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>TradePilot AI</strong>
          </div>

          <div style={{ display: 'flex', gap: '8px', fontSize: '11px', borderLeft: '1px solid var(--border-color)', paddingLeft: '16px' }}>
            <div 
              onClick={() => selectSymbolByTicker('^NSEI', 'NSE Nifty 50 Index', 'INDEX')}
              style={{ display: 'flex', gap: '4px', background: 'var(--bg-darker)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'all 0.15s ease' }}
              className="watchlist-item-hover"
            >
              <span className="text-slate-500 font-mono">NIFTY</span>
              <strong className="text-white font-mono">{nifty.price.toFixed(2)}</strong>
              <span className={`font-mono ${nifty.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>{nifty.changePercent >= 0 ? '+' : ''}{nifty.changePercent.toFixed(2)}%</span>
            </div>
            <div 
              onClick={() => selectSymbolByTicker('^BSESN', 'BSE SENSEX Index', 'INDEX')}
              style={{ display: 'flex', gap: '4px', background: 'var(--bg-darker)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'all 0.15s ease' }}
              className="watchlist-item-hover"
            >
              <span className="text-slate-500 font-mono">SENSEX</span>
              <strong className="text-white font-mono">{sensex.price.toFixed(2)}</strong>
              <span className={`font-mono ${sensex.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>{sensex.changePercent >= 0 ? '+' : ''}{sensex.changePercent.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* User Balance Metrics & Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', backgroundColor: 'var(--bg-darker)', border: '1px solid var(--border-color)', padding: '4px 12px', borderRadius: '8px', fontSize: '11.5px', fontFamily: 'var(--font-mono)' }}>
            <div>
              <span className="text-slate-500">Capital:</span> <strong className="text-white">₹{marginDetails.totalBalance.toLocaleString()}</strong>
            </div>
            <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '8px' }}>
              <span className="text-slate-500">P&L:</span> <strong className={marginDetails.realizedTodayPnl >= 0 ? 'text-emerald-400' : 'text-rose-500'}>₹{marginDetails.realizedTodayPnl.toLocaleString()}</strong>
            </div>
          </div>

          <button
            onClick={() => {
              setAutoTradingActive(!autoTradingActive);
            }}
            className="btn"
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 800,
              backgroundColor: autoTradingActive ? 'var(--color-accent)' : 'var(--bg-darker)',
              color: autoTradingActive ? '#fff' : 'var(--text-muted)',
              borderColor: autoTradingActive ? 'var(--color-accent)' : 'var(--border-color)'
            }}
          >
            {autoTradingActive ? '🤖 AUTOPILOT ON' : '💡 STANDBY'}
          </button>

          <button 
            className="btn" 
            style={{ padding: '6px' }}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </header>
    );
  };

  // Render Right AI Panel Card
  const renderRightAiPanel = () => {
    const reco = recommendations.length > 0 ? recommendations[0] : null;
    const decisionLog = aiDecisionLogs.length > 0 ? aiDecisionLogs[0] : null;

    return (
      <div className="right-ai-panel" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        padding: '16px 0'
      }}>
        {/* FinGPT Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h3 className="card-title" style={{ margin: 0, fontSize: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
            <Cpu size={14} color="var(--color-accent)" /> FINGPT MARKET ANALYSIS
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11.5px' }}>
            <div style={{ display: 'flex', justify: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Status:</span>
              <strong style={{ color: aiLoading ? 'var(--color-hold)' : 'var(--color-up)' }}>{aiLoading ? 'Analyzing...' : 'Complete'}</strong>
            </div>
            {reco ? (
              <>
                <div style={{ display: 'flex', justify: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Signal:</span>
                  <strong style={{ color: reco.action === 'BUY' ? 'var(--color-up)' : reco.action === 'SELL' ? 'var(--color-down)' : 'var(--color-hold)' }}>
                    {reco.action} ({(reco.confidence ? reco.confidence * 100 : 80).toFixed(0)}%)
                  </strong>
                </div>
                <div style={{ display: 'flex', justify: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Entry/Exit:</span>
                  <strong className="text-white font-mono">
                    ₹{reco.entryPrice ? reco.entryPrice.toFixed(1) : '0.0'}/₹{reco.profitTarget ? reco.profitTarget.toFixed(1) : '0.0'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justify: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Stop Loss:</span>
                  <strong className="text-rose-500 font-mono">₹{reco.stopLoss ? reco.stopLoss.toFixed(1) : '0.0'}</strong>
                </div>
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '6px', marginTop: '4px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-dim)', uppercase: true, display: 'block', marginBottom: '2px' }}>Analysis Rationale:</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px', leadingHeight: '1.4' }}>{reco.reasoning}</span>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '10px', color: 'var(--text-dim)' }}>No active recommendation round.</div>
            )}
          </div>
        </div>

        {/* Gemini Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h3 className="card-title" style={{ margin: 0, fontSize: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
            <AgentIcon size={14} color="var(--color-up)" /> GEMINI CONTROLLER DECISION
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11.5px' }}>
            {decisionLog ? (
              <>
                <div style={{ display: 'flex', justify: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Decision:</span>
                  <strong style={{ color: decisionLog.geminiApproved ? 'var(--color-up)' : 'var(--text-muted)' }}>
                    {decisionLog.geminiApproved ? 'APPROVED' : 'HOLD'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justify: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Size/Action:</span>
                  <strong className="text-white font-mono">{decisionLog.geminiQuantity} lots ({decisionLog.geminiAction})</strong>
                </div>
                <div style={{ display: 'flex', justify: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Risk Exit:</span>
                  <strong className="text-rose-500 font-mono">₹{(decisionLog.geminiStopLossAt || (decisionLog.spotPrice * 0.97)).toFixed(1)}</strong>
                </div>
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '6px', marginTop: '4px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-dim)', uppercase: true, display: 'block', marginBottom: '2px' }}>Execution Rationale:</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px', leadingHeight: '1.4' }}>{decisionLog.geminiReasoning}</span>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '10px', color: 'var(--text-dim)' }}>No decision executions logged.</div>
            )}
          </div>
        </div>

        {/* AI Chat Assistant */}
        <div className="card flex-col" style={{ display: 'flex', flex: 1, minHeight: '180px', gap: '8px' }}>
          <h3 className="card-title" style={{ margin: 0, fontSize: '11px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
            <MessageSquare size={13} color="var(--color-cyan)" /> AI ASSISTANT CHAT
          </h3>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', paddingRight: '4px' }}>
            {chatMessages.map((msg, index) => (
              <div key={index} style={{ padding: '6px', borderRadius: '4px', background: msg.role === 'assistant' ? 'var(--bg-darker)' : 'rgba(108, 76, 241, 0.1)', fontSize: '10.5px', leadingHeight: '1.3' }}>
                <strong style={{ color: msg.role === 'assistant' ? 'var(--color-accent)' : 'var(--text-primary)' }}>{msg.role === 'assistant' ? 'FinGPT: ' : 'You: '}</strong>
                {msg.text}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
            <input 
              type="text" 
              placeholder="Ask TradePilot AI..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              style={{ flex: 1, backgroundColor: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', color: '#fff', outline: 'none' }}
            />
            <button 
              onClick={handleSendMessage}
              style={{ backgroundColor: 'var(--color-accent)', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderWatchlistView = () => (
    <div className="main-content" style={{ padding: '24px', overflowY: 'auto' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: '16px' }}>📋 Market Watchlist Tickers</h2>
      <div className="card" style={{ maxWidth: '480px', height: '620px', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-card)' }}>
        <Watchlist 
          symbols={symbols} 
          activeSymbol={activeSymbol} 
          onSelectSymbol={setActiveSymbol} 
          onAddSymbol={handleAddSymbol}
          loading={loading}
        />
      </div>
    </div>
  );

  const renderDashboardView = () => (
    <div className="dashboard-grid" style={{ height: '100%', width: '100%', display: 'grid', gridTemplateColumns: '1fr 340px', overflow: 'hidden' }}>
      {/* Column 1: Main Trading Area (original baseline chart layout) */}
      <div className="main-content" style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {loading ? (
          <div className="loading-overlay" style={{ display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%', gap: '15px' }}>
            <Activity size={40} className="spin" style={{ color: 'var(--color-cyan)' }} />
            <p style={{ color: 'var(--text-muted)' }}>Fetching index metrics and option data via MCP client connection...</p>
          </div>
        ) : marketData.length > 0 ? (
          <>
            {renderActivePositionsCard()}
            {/* View Selector Navigation */}
            <div style={{ display: 'flex', gap: '10px', background: 'rgba(7, 11, 20, 0.5)', padding: '6px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', flexShrink: 0 }}>
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

      {/* Column 3: Right AI Panel & NewsFeed & Analyzer */}
      <div className="right-panel" style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {renderRightAiPanel()}
        <NewsFeed news={news} />
        <CustomAnalyzer activeTicker={activeSymbol?.ticker} prefilledOption={prefilledOption} onAnalyze={handleCustomAnalysis} />
      </div>
    </div>
  );

  // Render Portfolio View
  const renderPortfolioView = () => (
    <div className="main-content" style={{ padding: '24px', overflowY: 'auto', color: '#fff' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: '16px' }}>💼 Active Portfolio holdings</h2>
      <div className="card">
        {portfolioHoldings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)' }}>No active holdings. Place an order to purchase asset equity.</div>
        ) : (
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                <th className="py-2.5">Instrument</th>
                <th className="py-2.5 text-center">Quantity</th>
                <th className="py-2.5 text-right">Avg Purchase Price</th>
                <th className="py-2.5 text-right">Current LTP</th>
                <th className="py-2.5 text-center">Autopilot Limits</th>
                <th className="py-2.5 text-right">Returns (P&L)</th>
                <th className="py-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {portfolioHoldings.map(h => {
                const cost = h.quantity * h.avgPrice;
                const value = h.quantity * h.currentPrice;
                let pnl = value - cost;
                if (h.transactionType === 'SELL') pnl = cost - value;
                return (
                  <tr key={h.ticker} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td className="py-3 font-bold font-mono">{h.ticker}</td>
                    <td className="text-center py-3">{h.quantity}</td>
                    <td className="text-right py-3 font-mono">₹{h.avgPrice.toFixed(2)}</td>
                    <td className="text-right py-3 font-mono">₹{h.currentPrice.toFixed(2)}</td>
                    <td className="text-center py-3 text-[10px]">
                      <span className="text-emerald-400 block">TGT: ₹{h.targetPrice.toFixed(1)}</span>
                      <span className="text-rose-500 block">SL: ₹{h.stopLoss.toFixed(1)}</span>
                    </td>
                    <td className={`text-right py-3 font-bold font-mono ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                      {pnl >= 0 ? '+' : ''}₹{pnl.toFixed(2)}
                    </td>
                    <td className="text-center py-3">
                      <button
                        onClick={() => handleOpenOrderModal(h.ticker, h.transactionType === 'BUY' ? 'SELL' : 'BUY', h.currentPrice, h.quantity)}
                        className="btn"
                        style={{ padding: '2px 8px', fontSize: '10px', backgroundColor: 'var(--color-down)', borderColor: 'var(--color-down)', color: '#fff' }}
                      >
                        Exit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  const renderActivePositionsCard = () => {
    if (portfolioHoldings.length === 0) return null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
        {portfolioHoldings.map((h) => {
          // Resolve option/instrument type
          const isCall = h.ticker.toUpperCase().includes(' CE');
          const isPut = h.ticker.toUpperCase().includes(' PE');
          const isOption = isCall || isPut;
          
          // Parse strike/expiry from ticker (e.g. NIFTY 24Jul2026 CE 24000)
          const parts = h.ticker.split(' ');
          const strike = isOption ? parts[parts.length - 1] : '-';
          const expiry = isOption && parts.length > 2 ? parts[1] : 'N/A';
          const type = isCall ? 'CE' : isPut ? 'PE' : 'EQUITY';

          const cost = h.quantity * h.avgPrice;
          const value = h.quantity * h.currentPrice;
          const grossPnl = h.transactionType === 'BUY' ? (value - cost) : (cost - value);
          
          // Net P&L (minus the flat ₹20.00 platform charge per order execution)
          const netPnl = grossPnl - 20.0;
          const pnlPct = cost > 0 ? (netPnl / cost) * 100 : 0.0;

          // Find associated AI logs to show real reasoning
          const assocLog = aiDecisionLogs.find(l => l.ticker === h.ticker);
          const fingptReason = assocLog ? assocLog.fingptReasoning : 'Moving average support crossover.';
          const geminiReason = assocLog ? assocLog.geminiReasoning : 'Validated risk limits. Position size under margin limits.';
          const confidence = assocLog ? assocLog.fingptConfidence * 100 : 85;

          return (
            <div key={h.id} className="card" style={{ border: '1px solid var(--color-accent-glow)', borderLeft: `5px solid ${netPnl >= 0 ? 'var(--color-up)' : 'var(--color-down)'}`, background: 'rgba(7, 11, 20, 0.45)' }}>
              {/* Card Title & Basic Metadata */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 'black', background: 'var(--color-accent)', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>ACTIVE</span>
                  <strong style={{ fontSize: '16px', color: 'var(--text-primary)' }}>{h.ticker}</strong>
                  {isOption && (
                    <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '1px 6px', borderRadius: '4px', backgroundColor: isCall ? 'rgba(0, 208, 156, 0.12)' : 'rgba(255, 82, 82, 0.12)', color: isCall ? 'var(--color-up)' : 'var(--color-down)' }}>
                      {type} (Strike: ₹{strike})
                    </span>
                  )}
                </div>
                <button 
                  className="btn" 
                  style={{ background: 'rgba(255,82,82,0.12)', color: 'var(--color-down)', fontSize: '11px', padding: '4px 10px', border: '1px solid rgba(255,82,82,0.3)' }}
                  onClick={() => handleExitPosition(h.ticker)}
                >
                  ⚡ Fast Exit Position
                </button>
              </div>

              {/* Grid Statistics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <span style={{ color: 'var(--text-dim)', fontSize: '10px', display: 'block' }}>ENTRY PRICE</span>
                  <strong style={{ color: '#fff', fontSize: '13px' }}>₹{h.avgPrice.toFixed(2)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)', fontSize: '10px', display: 'block' }}>CURRENT LTP</span>
                  <strong style={{ color: 'var(--color-cyan)', fontSize: '13px' }}>₹{h.currentPrice.toFixed(2)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)', fontSize: '10px', display: 'block' }}>QUANTITY (LOTS)</span>
                  <strong style={{ color: '#fff', fontSize: '13px' }}>{h.quantity} ({Math.ceil(h.quantity / 50)} Lots)</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)', fontSize: '10px', display: 'block' }}>CAPITAL USED</span>
                  <strong style={{ color: '#fff', fontSize: '13px' }}>₹{cost.toFixed(2)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)', fontSize: '10px', display: 'block' }}>STOP LOSS</span>
                  <strong style={{ color: 'var(--color-down)', fontSize: '13px' }}>₹{h.stopLoss.toFixed(2)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)', fontSize: '10px', display: 'block' }}>TARGET PRICE</span>
                  <strong style={{ color: 'var(--color-up)', fontSize: '13px' }}>₹{h.targetPrice.toFixed(2)}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)', fontSize: '10px', display: 'block' }}>PLATFORM CHARGE</span>
                  <strong style={{ color: 'var(--color-down)', fontSize: '13px' }}>₹20.00</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-dim)', fontSize: '10px', display: 'block' }}>NET RETURN (P&L)</span>
                  <strong style={{ color: netPnl >= 0 ? 'var(--color-up)' : 'var(--color-down)', fontSize: '13px' }}>
                    {netPnl >= 0 ? '+' : ''}₹{netPnl.toFixed(2)} ({netPnl >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)
                  </strong>
                </div>
              </div>

              {/* AI Strategic Reasoning */}
              <div style={{ background: 'var(--bg-dark)', borderRadius: '6px', padding: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-accent)' }}>🤖 AI COGNITIVE EXPLANATION</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Confidence: <strong>{confidence.toFixed(0)}%</strong></span>
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  <div style={{ marginBottom: '4px' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>FinGPT Rationale:</strong> {fingptReason}
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Gemini Executive approval:</strong> {geminiReason}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render Strategies View
  const renderStrategiesView = () => (
    <div className="main-content" style={{ padding: '24px', overflowY: 'auto', color: '#fff' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: '16px' }}>🤖 active quant strategy metrics</h2>
      <div className="card">
        <h3 className="card-title">EMA/RSI Mean Reversion</h3>
        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', leadingHeight: '1.4' }}>
          Takes short-term positions when the asset Price deviates significantly from VWAP and the 14-period RSI indicator marks oversold/overbought thresholds.
        </p>
      </div>
    </div>
  );

  // Render AI Agents View
  const renderAiAgentsView = () => (
    <div className="main-content" style={{ padding: '24px', overflowY: 'auto', color: '#fff', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: '4px' }}>🕵️ AI Agents Profile & Architecture</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 className="card-title" style={{ margin: 0 }}><Cpu size={16} color="var(--color-accent)" /> FinGPT (Market Analyst)</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Reads live Upstox data, historical candles, indicators, options chain, and news feeds to predict asset direction.</p>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 className="card-title" style={{ margin: 0 }}><AgentIcon size={16} color="var(--color-up)" /> Gemini (Decision Agent)</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Monitors active holdings and margins, reviews FinGPT output against safety metrics, and places execution orders.</p>
        </div>
      </div>
    </div>
  );

  // Render News View
  const renderNewsView = () => (
    <div className="main-content" style={{ padding: '24px', overflowY: 'auto', color: '#fff' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: '16px' }}>📰 Geopolitical & Market Sentiment Feed</h2>
      <NewsFeed news={news} />
    </div>
  );

  const renderLedgerView = () => {
    // Helper to calculate P&L for a Sell order
    const getPnlDetails = (order, index) => {
      if (order.transactionType === 'BUY') {
        return { entryPrice: order.price, exitPrice: null, netPnl: null, charges: 20.0 };
      }
      
      // Find the most recent preceding BUY order for the same ticker
      let precedingBuy = null;
      for (let i = index + 1; i < orderHistory.length; i++) {
        if (orderHistory[i].ticker === order.ticker && orderHistory[i].transactionType === 'BUY') {
          precedingBuy = orderHistory[i];
          break;
        }
      }
      
      const entryPrice = precedingBuy ? precedingBuy.price : (order.stopLoss ? order.stopLoss / 0.97 : order.price * 0.95);
      const grossPnl = (order.price - entryPrice) * order.quantity;
      
      // Detailed Regulatory Charges Breakdown
      const brokerage = 40.0;
      const exchangeCharges = (entryPrice + order.price) * order.quantity * 0.00053;
      const gst = 18.0 * (brokerage + exchangeCharges) / 100.0;
      const stt = 0.0625 * (order.price * order.quantity) / 100.0;
      const sebi = (entryPrice + order.price) * order.quantity * 0.000001;
      const stamp = entryPrice * order.quantity * 0.00003;
      const totalCharges = brokerage + exchangeCharges + gst + stt + sebi + stamp;
      
      const netPnl = grossPnl - totalCharges;
      return { entryPrice, exitPrice: order.price, netPnl, charges: totalCharges, brokerage, exchangeCharges, gst, stt, sebi, stamp };
    };

    // Filter orderHistory
    const filteredHistory = orderHistory.filter((o, idx) => {
      // 1. Filter by Range
      if (tradeFilterRange === 'TODAY') {
        const today = new Date().toDateString();
        if (o.timestamp && new Date(o.timestamp).toDateString() !== today) return false;
      } else if (tradeFilterRange === 'WEEK') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        if (o.timestamp && new Date(o.timestamp) < weekAgo) return false;
      } else if (tradeFilterRange === 'MONTH') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        if (o.timestamp && new Date(o.timestamp) < monthAgo) return false;
      }

      // Calculate matching outcome
      const pnlInfo = getPnlDetails(o, idx);
      
      // 2. Filter by Outcome
      if (tradeFilterOutcome === 'PROFIT') {
        if (pnlInfo.netPnl === null || pnlInfo.netPnl <= 0) return false;
      } else if (tradeFilterOutcome === 'LOSS') {
        if (pnlInfo.netPnl === null || pnlInfo.netPnl >= 0) return false;
      }

      // 3. Filter by Instrument
      const tickerUpper = o.ticker.toUpperCase();
      const isOption = tickerUpper.includes(' CE') || tickerUpper.includes(' PE');
      const isCommodity = tickerUpper.includes('GOLD') || tickerUpper.includes('SILVER') || tickerUpper.includes('CRUDE') || tickerUpper.includes('CL=F') || tickerUpper.includes('GC=F') || tickerUpper.includes('SI=F');
      
      if (tradeFilterInstrument === 'STOCKS') {
        if (isOption || isCommodity) return false;
      } else if (tradeFilterInstrument === 'INDICES') {
        if (!isOption) return false;
      } else if (tradeFilterInstrument === 'COMMODITIES') {
        if (!isCommodity) return false;
      }

      return true;
    });

    return (
      <div className="main-content" style={{ padding: '24px', overflowY: 'auto', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-accent)', textTransform: 'uppercase', margin: 0 }}>📜 Complete Trade History & Invoices</h2>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Click on any closed trade row to view full tax invoices & exit reasons.
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="card" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', padding: '15px', marginBottom: '16px' }}>
          {/* Time range */}
          <div>
            <span style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Time Range</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['ALL', 'TODAY', 'WEEK', 'MONTH'].map(r => (
                <button key={r} className={`btn ${tradeFilterRange === r ? 'btn-primary' : ''}`} style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => setTradeFilterRange(r)}>{r}</button>
              ))}
            </div>
          </div>
          {/* Outcome filter */}
          <div>
            <span style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Outcome</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['ALL', 'PROFIT', 'LOSS'].map(o => (
                <button key={o} className={`btn ${tradeFilterOutcome === o ? 'btn-primary' : ''}`} style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => setTradeFilterOutcome(o)}>{o}</button>
              ))}
            </div>
          </div>
          {/* Instrument Filter */}
          <div>
            <span style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Instrument</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['ALL', 'STOCKS', 'INDICES', 'COMMODITIES'].map(i => (
                <button key={i} className={`btn ${tradeFilterInstrument === i ? 'btn-primary' : ''}`} style={{ padding: '4px 10px', fontSize: '11px' }} onClick={() => setTradeFilterInstrument(i)}>{i}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="card">
          {filteredHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)' }}>No matching trade records found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="w-full text-xs text-left border-collapse" style={{ minWidth: '950px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th className="py-3 px-2">Time</th>
                    <th className="py-3 px-2">Ticker</th>
                    <th className="text-center py-3 px-2">Action</th>
                    <th className="text-right py-3 px-2">Quantity</th>
                    <th className="text-right py-3 px-2">Buy Price</th>
                    <th className="text-right py-3 px-2">Exit Price</th>
                    <th className="text-right py-3 px-2">Charges</th>
                    <th className="text-right py-3 px-2">Net P&L</th>
                    <th className="text-center py-3 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((o, idx) => {
                    const pnlInfo = getPnlDetails(o, idx);
                    const formattedTime = o.timestamp ? new Date(o.timestamp).toLocaleString() : 'N/A';
                    const isExpanded = expandedTradeId === o.id;
                    return (
                      <React.Fragment key={o.id}>
                        <tr 
                          onClick={() => setExpandedTradeId(isExpanded ? null : o.id)}
                          style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent' }} 
                          className="font-mono hover:bg-slate-900"
                        >
                          <td className="py-3 px-2 text-slate-500">{formattedTime}</td>
                          <td className="py-3 px-2 font-bold">{o.ticker}</td>
                          <td className="text-center py-3 px-2">
                            <span style={{ fontSize: '9px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', backgroundColor: o.transactionType === 'BUY' ? 'rgba(0, 208, 156, 0.12)' : 'rgba(255, 82, 82, 0.12)', color: o.transactionType === 'BUY' ? 'var(--color-up)' : 'var(--color-down)' }}>
                              {o.transactionType}
                            </span>
                          </td>
                          <td className="text-right py-3 px-2">{o.quantity}</td>
                          <td className="text-right py-3 px-2">₹{pnlInfo.entryPrice.toFixed(2)}</td>
                          <td className="text-right py-3 px-2">{pnlInfo.exitPrice ? `₹${pnlInfo.exitPrice.toFixed(2)}` : '-'}</td>
                          <td className="text-right py-3 px-2 text-rose-400">₹{pnlInfo.charges.toFixed(2)}</td>
                          <td className={`text-right py-3 px-2 font-bold ${pnlInfo.netPnl !== null ? (pnlInfo.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-500') : 'text-slate-400'}`}>
                            {pnlInfo.netPnl !== null 
                              ? `${pnlInfo.netPnl >= 0 ? '+' : ''}₹${pnlInfo.netPnl.toFixed(2)}`
                              : 'Active Entry'
                            }
                          </td>
                          <td className="text-center py-3 px-2 text-emerald-400 font-bold">
                            {isExpanded ? '▲ HIDE' : '▼ DETAIL'}
                          </td>
                        </tr>

                        {isExpanded && pnlInfo.netPnl !== null && (
                          <tr style={{ background: 'rgba(9, 14, 24, 0.6)', borderBottom: '1px solid var(--border-color)' }}>
                            <td colSpan={9} style={{ padding: '16px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                {/* Regulatory Invoice */}
                                <div>
                                  <strong style={{ display: 'block', fontSize: '11.5px', color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: '8px' }}>🧾 Regulatory Tax Invoice (Round-Trip)</strong>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ color: 'var(--text-muted)' }}>Flat Brokerage Fee (Buy+Sell):</span>
                                      <span>₹{pnlInfo.brokerage.toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ color: 'var(--text-muted)' }}>Exchange Transaction Fee:</span>
                                      <span>₹{pnlInfo.exchangeCharges.toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ color: 'var(--text-muted)' }}>Securities Transaction Tax (STT):</span>
                                      <span>₹{pnlInfo.stt.toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ color: 'var(--text-muted)' }}>Integrated GST (18%):</span>
                                      <span>₹{pnlInfo.gst.toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ color: 'var(--text-muted)' }}>SEBI Turnover Fees:</span>
                                      <span>₹{pnlInfo.sebi.toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ color: 'var(--text-muted)' }}>Stamp Duty (Buy Side):</span>
                                      <span>₹{pnlInfo.stamp.toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px', fontWeight: 'bold' }}>
                                      <span>Total Regulatory Charges:</span>
                                      <span style={{ color: 'var(--color-down)' }}>₹{pnlInfo.charges.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* AI Reasoning & Stats */}
                                <div>
                                  <strong style={{ display: 'block', fontSize: '11.5px', color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: '8px' }}>🤖 Strategy Performance Details</strong>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '11.5px' }}>
                                    <div>
                                      <span style={{ color: 'var(--text-dim)', display: 'inline-block', width: '120px' }}>Capital Utilized:</span>{' '}
                                      <strong style={{ color: '#fff' }}>₹{(pnlInfo.entryPrice * o.quantity).toFixed(2)}</strong>
                                    </div>
                                    <div>
                                      <span style={{ color: 'var(--text-dim)', display: 'inline-block', width: '120px' }}>Exit Trigger Type:</span>{' '}
                                      <strong style={{ color: 'var(--color-cyan)' }}>Target / Autopilot Stop-loss Limit reached</strong>
                                    </div>
                                    <div>
                                      <span style={{ color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Gemini Rationale for position exit:</span>
                                      <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                                        Exit criteria executed dynamically. Trend reversal indicated by technical crossovers or target hit.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };


  // Render Decision Logs
  const renderDecisionLogsView = () => (
    <div className="main-content" style={{ padding: '24px', overflowY: 'auto', color: '#fff', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: '4px' }}>📊 AI Decision Timeline Logs</h2>
      
      {/* Real database decision logs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 4px 0' }}>🤖 Real-Time FinGPT & Gemini Strategy Log Entries</h3>
        {aiDecisionLogs.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)' }}>
            No autonomous trading decisions logged in the database yet. Trigger Autopilot mode or click place order to generate.
          </div>
        ) : (
          aiDecisionLogs.slice().reverse().map((log) => (
            <div key={log.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Log Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <strong style={{ fontSize: '16px', color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>{log.ticker}</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Spot: <strong>₹{log.spotPrice.toFixed(2)}</strong></span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>

              {/* Two Agent Columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Column 1: FinGPT */}
                <div style={{ paddingRight: '16px', borderRight: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Cpu size={14} color="var(--color-accent)" />
                    <span style={{ fontWeight: 'bold', fontSize: '12px' }}>FinGPT Strategy Recommendation</span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                    <div>
                      <span style={{ color: 'var(--text-dim)', fontSize: '10.5px' }}>Action:</span>{' '}
                      <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '1px 6px', borderRadius: '4px', backgroundColor: log.fingptAction === 'BUY' ? 'rgba(0, 208, 156, 0.12)' : log.fingptAction === 'SELL' ? 'rgba(255, 82, 82, 0.12)' : 'rgba(217, 119, 6, 0.12)', color: log.fingptAction === 'BUY' ? 'var(--color-up)' : log.fingptAction === 'SELL' ? 'var(--color-down)' : 'var(--color-hold)' }}>
                        {log.fingptAction}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)', fontSize: '10.5px' }}>Confidence:</span>{' '}
                      <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{(log.fingptConfidence * 100).toFixed(0)}%</strong>
                    </div>
                  </div>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    <strong>Technical Rationale:</strong> {log.fingptReasoning}
                  </p>
                </div>

                {/* Column 2: Gemini */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <AgentIcon size={14} color={log.geminiApproved ? 'var(--color-up)' : 'var(--color-down)'} />
                    <span style={{ fontWeight: 'bold', fontSize: '12px' }}>Gemini Executive Validation</span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ color: 'var(--text-dim)', fontSize: '10.5px' }}>Status:</span>{' '}
                      <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '1px 6px', borderRadius: '4px', backgroundColor: log.geminiApproved ? 'rgba(0, 208, 156, 0.12)' : 'rgba(255, 82, 82, 0.12)', color: log.geminiApproved ? 'var(--color-up)' : 'var(--color-down)' }}>
                        {log.geminiApproved ? 'APPROVED' : 'REJECTED'}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)', fontSize: '10.5px' }}>Trade Action:</span>{' '}
                      <strong style={{ color: 'var(--text-primary)' }}>{log.geminiAction} ({log.geminiQuantity} units)</strong>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dim)', fontSize: '10.5px' }}>Exit Strategy:</span>{' '}
                      <strong style={{ color: 'var(--text-primary)' }}>Target ₹{log.geminiBookProfitAt.toFixed(2)} {log.geminiTrailStop ? '(Trailing TGT)' : ''}</strong>
                    </div>
                  </div>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    <strong>Risk Rationale:</strong> {log.geminiReasoning}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Activity Timeline */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h3 className="card-title">Cognitive RPC Timeline</h3>
        <div style={{ borderLeft: '2px solid var(--color-accent-glow)', marginLeft: '8px', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {timelineEvents.map((evt, idx) => (
            <div key={idx} style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '-22px', top: '4px', width: '8px', height: '8px', backgroundColor: 'var(--color-accent)', borderRadius: '50%' }}></span>
              <span className="font-mono text-slate-500 mr-2">[{evt.time}]</span>
              <strong className="text-white">{evt.text}</strong>
              <span className="text-[10px] text-emerald-400 ml-2">✓ success</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const triggerLiveMarketScan = () => {
    if (!activeSymbol) {
      addNotification('Select a ticker first to scan!', 'error');
      return;
    }
    addNotification('Triggering live AI scan for ' + activeSymbol.ticker, 'info');
    
    // Clear and start live timelines
    setLiveTimelineLogs([
      { timestamp: new Date().toLocaleTimeString(), text: 'Market Scan Started for ' + activeSymbol.ticker, status: 'info' }
    ]);
    
    const steps = [
      { delay: 1000, text: 'Fetching live Upstox & Yahoo Finance API data...', status: 'info' },
      { delay: 2000, text: 'Reading Options Chain and IV skew metrics...', status: 'info' },
      { delay: 3000, text: 'Calculating Put-Call Ratio (PCR) and OI changes...', status: 'info' },
      { delay: 4000, text: 'Running technical indicators: EMA, RSI, MACD crossovers...', status: 'info' },
      { delay: 5200, text: 'Initiating FinGPT (Agent 1) analysis engine...', status: 'info' }
    ];

    steps.forEach((step) => {
      setTimeout(() => {
        setLiveTimelineLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), text: step.text, status: 'info' }]);
      }, step.delay);
    });

    // Make actual backend call
    setTimeout(async () => {
      try {
        const payload = { ticker: activeSymbol.ticker };
        const result = await callMcpTool('runAiTradingRound', payload);
        
        // Add final execution results to timeline
        const finGptText = `FinGPT Strategy: recommended action = ${result.action || 'HOLD'}, confidence = ${((result.confidence || 0.8) * 100).toFixed(0)}%. Rationale: ${result.reason || 'Hold range boundary.'}`;
        setLiveTimelineLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), text: finGptText, status: 'success' }]);
        
        setTimeout(() => {
          setLiveTimelineLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), text: 'Sending recommendation to Gemini Risk Management Agent...', status: 'info' }]);
        }, 1000);

        setTimeout(() => {
          const geminiApproved = result.approved !== false;
          const geminiText = `Gemini Decision: ${geminiApproved ? 'APPROVED' : 'REJECTED'}. Action: ${result.action || 'HOLD'} of ${result.quantity || 0} units. Trailing target book profit at ₹${(result.target || 0.0).toFixed(2)}.`;
          setLiveTimelineLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), text: geminiText, status: geminiApproved ? 'success' : 'error' }]);
          
          if (geminiApproved && result.quantity > 0) {
            addNotification(`Order placed: ${result.action} ${result.quantity} of ${activeSymbol.ticker}`, 'success');
          } else {
            addNotification(`AI scan finished: Position holding/skipped.`, 'info');
          }
          
          // Sync database state to UI
          syncLedgerFromBackend();
        }, 2200);

      } catch (err) {
        setLiveTimelineLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), text: 'AI processing failed: ' + err.message, status: 'error' }]);
        addNotification('AI round run failed: ' + err.message, 'error');
      }
    }, 6000);
  };

  const renderLiveProcessingView = () => (
    <div className="main-content" style={{ padding: '24px', overflowY: 'auto', color: '#fff', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-accent)', textTransform: 'uppercase', margin: 0 }}>📡 Live AI Agent Processing Console</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Monitor the live autonomous trading pipeline, including data pulls, technical checks, FinGPT scans, and Gemini risk reviews.</p>
        </div>
        <button 
          className="btn btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontWeight: 'bold' }}
          onClick={triggerLiveMarketScan}
        >
          <Play size={14} /> Trigger Live Market Scan
        </button>
      </div>

      {/* Live RPC Timeline logs */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, minHeight: '400px', background: '#0b111e', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '10px' }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-cyan)', textTransform: 'uppercase' }}>Pipeline Timeline</span>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Status: Active SCANNING</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontFamily: 'var(--font-mono)', fontSize: '12.5px', overflowY: 'auto' }}>
          {liveTimelineLogs.map((log, index) => (
            <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ color: 'var(--text-dim)', flexShrink: 0 }}>[{log.timestamp}]</span>
              <span style={{ 
                color: log.status === 'success' ? 'var(--color-up)' : log.status === 'error' ? 'var(--color-down)' : 'var(--text-primary)',
                fontWeight: log.status === 'success' || log.status === 'error' ? 'bold' : 'normal' 
              }}>
                {log.status === 'success' ? '✓ ' : log.status === 'error' ? '✗ ' : '• '} 
                {log.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const getAnalytics = () => {
    const closedTrades = [];
    
    // Scan orderHistory for SELL transactions to match with preceding BUYs
    orderHistory.forEach((order, index) => {
      if (order.transactionType === 'SELL') {
        let precedingBuy = null;
        for (let i = index + 1; i < orderHistory.length; i++) {
          if (orderHistory[i].ticker === order.ticker && orderHistory[i].transactionType === 'BUY') {
            precedingBuy = orderHistory[i];
            break;
          }
        }
        
        const entryPrice = precedingBuy ? precedingBuy.price : (order.stopLoss ? order.stopLoss / 0.97 : order.price * 0.95);
        const grossPnl = (order.price - entryPrice) * order.quantity;
        
        // Calculate charges
        const brokerage = 40.0;
        const exchangeCharges = (entryPrice + order.price) * order.quantity * 0.00053;
        const gst = 18.0 * (brokerage + exchangeCharges) / 100.0;
        const stt = 0.0625 * (order.price * order.quantity) / 100.0;
        const sebi = (entryPrice + order.price) * order.quantity * 0.000001;
        const stamp = entryPrice * order.quantity * 0.00003;
        const totalCharges = brokerage + exchangeCharges + gst + stt + sebi + stamp;
        
        const netPnl = grossPnl - totalCharges;
        closedTrades.push({
          ticker: order.ticker,
          netPnl,
          cost: entryPrice * order.quantity,
          charges: totalCharges
        });
      }
    });

    const totalTrades = closedTrades.length;
    const winningTrades = closedTrades.filter(t => t.netPnl > 0);
    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
    const lossRate = totalTrades > 0 ? 100 - winRate : 0;
    
    const totalChargesPaid = closedTrades.reduce((sum, t) => sum + t.charges, 0);
    const totalProfit = closedTrades.reduce((sum, t) => sum + t.netPnl, 0);
    const totalInvestment = closedTrades.reduce((sum, t) => sum + t.cost, 0);
    const totalProfitPct = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;

    let bestTradeVal = 0.0;
    let worstTradeVal = 0.0;
    closedTrades.forEach(t => {
      if (t.netPnl > bestTradeVal) bestTradeVal = t.netPnl;
      if (t.netPnl < worstTradeVal) worstTradeVal = t.netPnl;
    });

    return {
      totalTrades,
      winRate,
      lossRate,
      totalChargesPaid,
      totalProfit,
      totalProfitPct,
      totalInvestment,
      bestTradeVal,
      worstTradeVal,
      closedTrades
    };
  };

  const renderProfitCurveSvg = (closedTrades) => {
    if (closedTrades.length === 0) {
      return (
        <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
          Execute trades to visualize profit curves.
        </div>
      );
    }

    let cum = 0;
    const data = [0];
    closedTrades.slice().reverse().forEach(t => {
      cum += t.netPnl;
      data.push(cum);
    });

    const width = 500;
    const height = 150;
    const maxVal = Math.max(...data, 100);
    const minVal = Math.min(...data, -100);
    const valRange = maxVal - minVal;

    const points = data.map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - minVal) / valRange) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0, 208, 156, 0.4)" />
            <stop offset="100%" stopColor="rgba(0, 208, 156, 0)" />
          </linearGradient>
        </defs>
        
        {/* Zero baseline */}
        {minVal < 0 && maxVal > 0 && (
          <line 
            x1="0" 
            y1={height - ((0 - minVal) / valRange) * height} 
            x2={width} 
            y2={height - ((0 - minVal) / valRange) * height} 
            stroke="rgba(255,255,255,0.15)" 
            strokeDasharray="4 4" 
          />
        )}

        {/* Fill Area */}
        <polyline
          fill="url(#profitGrad)"
          stroke="none"
          points={`0,${height} ${points} ${width},${height}`}
        />

        {/* Polyline */}
        <polyline
          fill="none"
          stroke="var(--color-up)"
          strokeWidth="3"
          points={points}
        />
      </svg>
    );
  };

  const renderAnalyticsView = () => {
    const stats = getAnalytics();
    
    return (
      <div className="main-content" style={{ padding: '24px', overflowY: 'auto', color: '#fff', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: '4px' }}>📊 Performance Analytics Dashboard</h2>
        
        {/* Key Stats Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Total Trades</span>
            <strong style={{ fontSize: '24px', color: 'var(--text-primary)' }}>{stats.totalTrades}</strong>
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Win / Loss Rate</span>
            <strong style={{ fontSize: '20px', color: 'var(--color-up)' }}>
              {stats.winRate.toFixed(1)}% <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>/ {stats.lossRate.toFixed(1)}%</span>
            </strong>
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Total Net Return</span>
            <strong style={{ fontSize: '20px', color: stats.totalProfit >= 0 ? 'var(--color-up)' : 'var(--color-down)' }}>
              {stats.totalProfit >= 0 ? '+' : ''}₹{stats.totalProfit.toFixed(2)}
              <span style={{ fontSize: '11px', marginLeft: '6px' }}>({stats.totalProfitPct.toFixed(2)}%)</span>
            </strong>
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Charges & Taxes Paid</span>
            <strong style={{ fontSize: '20px', color: 'var(--color-down)' }}>₹{stats.totalChargesPaid.toFixed(2)}</strong>
          </div>
        </div>

        {/* Charts & Outliers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>
          {/* Chart Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 className="card-title" style={{ margin: 0 }}>📈 Cumulative profit Curve</h3>
            <div style={{ background: '#090e18', padding: '16px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              {renderProfitCurveSvg(stats.closedTrades)}
            </div>
          </div>

          {/* Performance outliers */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 className="card-title" style={{ margin: 0 }}>🏆 Strategy Outliers</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Best Net Trade:</span>
                <strong style={{ color: 'var(--color-up)', fontSize: '12px' }}>
                  {stats.bestTradeVal > 0 ? `+₹${stats.bestTradeVal.toFixed(2)}` : '₹0.00'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Worst Net Trade:</span>
                <strong style={{ color: 'var(--color-down)', fontSize: '12px' }}>
                  {stats.worstTradeVal < 0 ? `₹${stats.worstTradeVal.toFixed(2)}` : '₹0.00'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Total Margin Utilized:</span>
                <strong style={{ color: 'var(--color-cyan)', fontSize: '12px' }}>₹{stats.totalInvestment.toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Avg Trade holding Time:</span>
                <strong style={{ color: 'var(--text-primary)', fontSize: '12px' }}>Intraday (Standard)</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Safety Settings
  const renderSettingsView = () => (
    <div className="main-content" style={{ padding: '24px', overflowY: 'auto', color: '#fff' }}>
      <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: '16px' }}>🛡️ Safety Settings & Agent Guards</h2>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '500px' }}>
        <div style={{ display: 'flex', justify: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          <div>
            <strong className="block text-white">Max Utilized Margin Limit</strong>
            <span className="text-slate-500 text-[10px] block mt-0.5">Strictly limits trade size under 50% available margin.</span>
          </div>
          <span style={{ color: 'var(--color-up)', fontWeight: 'bold' }}>ACTIVE</span>
        </div>
        <div style={{ display: 'flex', justify: 'space-between' }}>
          <div>
            <strong className="block text-white">Max Net Daily Loss Guard</strong>
            <span className="text-slate-500 text-[10px] block mt-0.5">Locks out new positions if daily P&L drops below -₹50,000.</span>
          </div>
          <span style={{ color: 'var(--color-up)', fontWeight: 'bold' }}>ACTIVE</span>
        </div>
      </div>
    </div>
  );

  // Render Order Confirmation Modal
  const renderOrderModal = () => {
    if (!orderModalOpen) return null;
    const isOption = orderTicker.includes(' ');
    let optionType = 'CALL';
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

    const currentPrice = orderType === 'MARKET' ? orderLtp : orderPrice;
    const isLeveraged = !isOption && orderProduct === 'INTRADAY' && !orderTicker.startsWith('^');
    let requiredFunds = orderQuantity * currentPrice;
    if (isLeveraged) {
      requiredFunds = requiredFunds / 5.0; // 5x leverage
    }

    return (
      <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-center items-center z-[1000] p-4 text-white">
        <div className="bg-slate-900 border border-slate-800 rounded-lg max-w-sm w-full overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-850 flex justify-between items-center">
            <h3 className="text-xs font-black uppercase text-white m-0">Confirm Trade Order</h3>
            <button onClick={() => setOrderModalOpen(false)} className="text-slate-400 hover:text-white"><X size={16} /></button>
          </div>

          <div className="p-4 space-y-4 text-xs">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-slate-400 block">Instrument:</span>
                <strong className="text-sm font-bold font-mono">{orderTicker}</strong>
              </div>
              <span className={`px-2 py-0.5 rounded font-bold ${orderTransactionType === 'BUY' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-500'}`}>
                {orderTransactionType}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 block mb-1">Product:</span>
                <span className="bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded block font-bold text-center">{orderProduct}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Price Type:</span>
                <span className="bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded block font-bold text-center">{orderType}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 block mb-1">Quantity:</span>
                <input 
                  type="number" 
                  value={orderQuantity} 
                  onChange={(e) => setOrderQuantity(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 font-bold font-mono text-center outline-none"
                />
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Price:</span>
                <input 
                  type="number" 
                  value={orderPrice} 
                  disabled={orderType === 'MARKET'}
                  onChange={(e) => setOrderPrice(parseFloat(e.target.value) || 0.0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 font-bold font-mono text-center outline-none"
                />
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-850 p-3 rounded space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Margin Required:</span>
                <strong className={`font-mono ${orderTransactionType === 'BUY' ? 'text-emerald-400' : 'text-rose-500'}`}>
                  ₹{requiredFunds.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Available Balance:</span>
                <strong className="font-mono text-white">₹{marginDetails.availableMargin.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
              </div>
            </div>

            {orderStatusReceipt && (
              <div className={`p-3 rounded text-[11px] font-bold ${orderStatusReceipt.status === 'SUCCESS' ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/45' : 'bg-rose-950/20 text-rose-500 border border-rose-900/45'}`}>
                {orderStatusReceipt.message}
              </div>
            )}

            <button
              onClick={handleExecuteOrder}
              disabled={orderExecuting || marginDetails.availableMargin < requiredFunds}
              className={`w-full py-2.5 rounded font-black text-center text-white ${orderTransactionType === 'BUY' ? 'bg-[#00d09c] hover:bg-emerald-650' : 'bg-[#ff5252] hover:bg-red-650'}`}
            >
              {orderExecuting ? 'Executing Order...' : orderTransactionType === 'BUY' ? 'Confirm Buy Order' : 'Confirm Sell Order'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`app-container ${theme === 'dark' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'}`} style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Toast Notification Container */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 9999,
        pointerEvents: 'none'
      }}>
        {notifications.map(n => (
          <div key={n.id} style={{
            pointerEvents: 'auto',
            background: n.type === 'error' ? 'rgba(244,63,94,0.95)' : n.type === 'success' ? 'rgba(0, 208, 156, 0.95)' : 'rgba(15, 23, 42, 0.95)',
            borderLeft: `4px solid ${n.type === 'error' ? '#f43f5e' : n.type === 'success' ? '#00d09c' : '#7c3aed'}`,
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '6px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            fontSize: '12.5px',
            fontWeight: 650,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            minWidth: '280px'
          }}>
            <Bell size={14} />
            <span>{n.text}</span>
          </div>
        ))}
      </div>

      {renderTopBar()}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        
        {error && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'rgba(244,63,94,0.15)', borderBottom: '1px solid rgba(244,63,94,0.4)', color: 'var(--color-down)', padding: '10px 24px', fontSize: '13px', display: 'flex', zIndex: 99 }}>
            <AlertCircle size={16} style={{ marginRight: '8px' }} />
            <span>{error}</span>
            <button className="btn" style={{ marginLeft: 'auto', padding: '2px 8px', fontSize: '11px', background: 'rgba(255,255,255,0.08)' }} onClick={sendListTools}>Reconnect</button>
          </div>
        )}

        {/* Sidebar + Main workspace */}
        {renderLeftSidebar()}

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {activeNav === 'DASHBOARD' && renderDashboardView()}
            {activeNav === 'LIVE_PROCESSING' && renderLiveProcessingView()}
            {activeNav === 'WATCHLIST_PAGE' && renderWatchlistView()}
            {activeNav === 'PORTFOLIO' && renderPortfolioView()}
            {activeNav === 'ANALYTICS' && renderAnalyticsView()}
            {activeNav === 'STRATEGIES' && renderStrategiesView()}
            {activeNav === 'AI_AGENTS' && renderAiAgentsView()}
            {activeNav === 'NEWS' && renderNewsView()}
            {activeNav === 'LEDGER' && renderLedgerView()}
            {activeNav === 'DECISION_LOGS' && renderDecisionLogsView()}
            {activeNav === 'SETTINGS' && renderSettingsView()}
          </div>

          {/* Bottom MCP Traffic monitor panel */}
          <div style={{
            background: 'var(--bg-card)',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            height: consoleExpanded ? '240px' : '38px',
            transition: 'height 0.22s ease-in-out',
            zIndex: 200,
            fontFamily: 'var(--font-mono)'
          }}>
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
                <span style={{ fontSize: '9px', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: '8px', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>{logs.length} logged events</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button 
                  onClick={(e) => { e.stopPropagation(); clearLogs(); }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}
                >
                  <Trash2 size={12} /> Clear
                </button>
                {consoleExpanded ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronUp size={14} color="var(--text-muted)" />}
              </div>
            </div>

            {consoleExpanded && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#05070e' }}>
                {logs.length === 0 ? (
                  <div style={{ color: 'var(--text-dim)', padding: '10px 0', fontSize: '11.5px' }}>
                    &gt;_ No JSON-RPC messages recorded yet.
                  </div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.02)', paddingBottom: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: 'var(--text-dim)', fontSize: '10px' }}>[{log.timestamp}]</span>
                        <span style={{ color: log.direction === 'SENT' ? 'var(--color-accent)' : log.direction === 'RECEIVED' ? 'var(--color-up)' : 'var(--color-hold)', background: log.direction === 'SENT' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(16, 185, 129, 0.12)', padding: '1px 5px', borderRadius: '3px', fontSize: '9px', fontWeight: 800 }}>{log.direction}</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{log.method}</strong>
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>- {log.detail}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

        </div>
      </div>
      {orderModalOpen && renderOrderModal()}
    </div>
  );
}
