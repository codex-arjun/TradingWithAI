import React, { useState } from 'react';
import { Newspaper, MessageSquare, Calendar, Maximize2, X, AlertTriangle, TrendingUp, TrendingDown, Info } from 'lucide-react';

const LOCAL_FALLBACK_NEWS = [
  {
    title: "Nifty & Sensex Slide 1.2% Amid Rising Crude Oil Prices and Geopolitical Tensions",
    description: "Indian stock markets finished lower today as international crude oil prices surged past $85 per barrel due to escalating tensions in the Middle East, triggering broad inflation worries for energy-importing nations.",
    sentiment: "BEARISH",
    publishedAt: new Date().toISOString(),
    url: "https://finance.yahoo.com"
  },
  {
    title: "Why Indian Share Market is Down Today: Top Geopolitical Factors",
    description: "Market experts highlight major pressure points dragging BSE Sensex and NSE Nifty down today: rising geopolitical conflicts, heavy FII outflows exceeding ₹3,000 crores, surging energy prices, and interest rate hikes.",
    sentiment: "BEARISH",
    publishedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    url: "https://finance.yahoo.com"
  },
  {
    title: "Global Markets Volatile as Trade Tariffs and Crude Oil Supply Risks Escalate",
    description: "World shares trade in mixed bands as investors keep a close watch on shipping corridors in the Red Sea. Shipping rate hikes and oil blockades fuel core inflation concerns across the US and Eurozone.",
    sentiment: "NEUTRAL",
    publishedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    url: "https://finance.yahoo.com"
  },
  {
    title: "Late Buying in Banking and IT Stocks Helps Nifty 50 Defend Key Support Levels",
    description: "A minor recovery in global equity futures and stabilization of crude oil benchmarks prompted short-covering in HDFC Bank, Reliance, and TCS, leading to a bounce back from support levels.",
    sentiment: "BULLISH",
    publishedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    url: "https://finance.yahoo.com"
  },
  {
    title: "FII Outflows Shift to Gold and Safe-Haven Assets as War Conflicts Intensify",
    description: "Institutional investors reduce equity exposures in emerging markets, allocating capital to bullion and sovereign bonds amid fear of prolonged geopolitical tensions and energy supply shocks.",
    sentiment: "BEARISH",
    publishedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    url: "https://finance.yahoo.com"
  }
];

export default function NewsFeed({ news }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const boundaryDate = new Date(Date.now() - 48 * 3600000); // 48 hours (2 days)
  let displayNews = (!news || news.length === 0)
    ? LOCAL_FALLBACK_NEWS
    : news.filter(item => new Date(item.publishedAt) >= boundaryDate);

  if (displayNews.length === 0) {
    displayNews = LOCAL_FALLBACK_NEWS;
  }

  const getSentimentStyle = (sentiment) => {
    if (sentiment === 'BULLISH') return 'badge badge-buy';
    if (sentiment === 'BEARISH') return 'badge badge-sell';
    return 'badge badge-hold';
  };

  const formatTime = (timeStr) => {
    try {
      const d = new Date(timeStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return timeStr;
    }
  };

  // Calculate stats
  const bearishCount = displayNews.filter(item => item.sentiment === 'BEARISH').length;
  const bullishCount = displayNews.filter(item => item.sentiment === 'BULLISH').length;
  const neutralCount = displayNews.filter(item => item.sentiment === 'NEUTRAL').length;
  const totalCount = displayNews.length;

  let dominantSentiment = 'NEUTRAL';
  let dominantColor = 'var(--color-hold)';
  if (bearishCount > bullishCount && bearishCount >= neutralCount) {
    dominantSentiment = 'BEARISH (HIGH RISK)';
    dominantColor = 'var(--color-down)';
  } else if (bullishCount > bearishCount && bullishCount >= neutralCount) {
    dominantSentiment = 'BULLISH (BULL RUN)';
    dominantColor = 'var(--color-up)';
  } else if (neutralCount >= bearishCount && neutralCount >= bullishCount) {
    dominantSentiment = 'NEUTRAL (CONSOLIDATING)';
    dominantColor = 'var(--color-hold)';
  }

  return (
    <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: '460px', position: 'relative' }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .modal-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 20px;
        }
        @media (max-width: 768px) {
          .modal-grid {
            grid-template-columns: 1fr;
          }
        }
        .news-card-modal {
          background: rgba(243, 244, 246, 0.5);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: all 0.25s ease;
        }
        .news-card-modal:hover {
          border-color: var(--color-cyan);
          transform: translateY(-2px);
          background: rgba(243, 244, 246, 0.9);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
        }
        .pulse-expand-btn {
          animation: pulse-border 2s infinite;
          border: 1px solid rgba(6, 182, 212, 0.4);
        }
        @keyframes pulse-border {
          0% {
            box-shadow: 0 0 0 0 rgba(6, 182, 212, 0.4);
          }
          70% {
            box-shadow: 0 0 0 8px rgba(6, 182, 212, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(6, 182, 212, 0);
          }
        }
      `}</style>

      <h3 className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Newspaper size={16} color="var(--color-cyan)" /> MARKET SENTIMENT & NEWS
        </span>
        <button 
          onClick={() => setIsModalOpen(true)}
          style={{
            background: 'rgba(6, 182, 212, 0.1)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            color: 'var(--color-cyan)',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: 600
          }}
        >
          <Maximize2 size={11} /> Expand Popup
        </button>
      </h3>
      
      {/* Short list in sidebar */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', marginBottom: '10px' }}>
        {displayNews.slice(0, 3).map((item, idx) => (
          <div key={item.id || idx} className="news-item" style={{ padding: '10px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '4px' }}>
              <a 
                href={item.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="news-title"
                style={{ fontSize: '12.5px', fontWeight: 600, margin: 0 }}
              >
                {item.title}
              </a>
              <span className={getSentimentStyle(item.sentiment)} style={{ fontSize: '8.5px', padding: '1px 4px' }}>
                {item.sentiment}
              </span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.3' }}>
              {item.description}
            </p>
          </div>
        ))}
      </div>

      <button 
        className="btn pulse-expand-btn"
        onClick={() => setIsModalOpen(true)}
        style={{
          width: '100%',
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(99, 102, 241, 0.1) 100%)',
          color: 'var(--color-cyan)',
          fontWeight: 700,
          fontSize: '12px',
          padding: '10px',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          borderRadius: '6px'
        }}
      >
        📰 Open Geopolitical News & Sentiment Popup
      </button>

      {/* FULL PORTAL MODAL POPUP */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.25s ease-out'
        }}>
          <div style={{
            width: '90%',
            maxWidth: '1000px',
            height: '85%',
            maxHeight: '800px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            boxShadow: '0 20px 45px -12px rgba(0, 0, 0, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-color)',
              background: 'var(--bg-dark)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Newspaper size={20} color="var(--color-cyan)" />
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Geopolitical Market Sentiment & News Analyzer
                  </h2>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Real-time internet feeds mapping crude oil, war conflicts, and index trends</span>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'rgba(244, 63, 94, 0.1)',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  color: 'var(--color-down)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Sentiment Summary Analytics Bar */}
              <div style={{
                background: 'var(--bg-dark)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 300px' }}>
                  {dominantSentiment.includes('BEARISH') ? (
                    <AlertTriangle size={32} color="var(--color-down)" />
                  ) : dominantSentiment.includes('BULLISH') ? (
                    <TrendingUp size={32} color="var(--color-up)" />
                  ) : (
                    <Info size={32} color="var(--color-hold)" />
                  )}
                  <div>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '1px' }}>Macro Geopolitical Sentiment</span>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: dominantColor, margin: '2px 0 0 0' }}>
                      {dominantSentiment}
                    </h3>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ background: '#070b14', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 18px', textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Bearish (Conflicts/Oil)</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-down)', fontFamily: 'var(--font-mono)' }}>{bearishCount}</div>
                  </div>
                  <div style={{ background: '#070b14', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 18px', textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Neutral (Consolidating)</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-hold)', fontFamily: 'var(--font-mono)' }}>{neutralCount}</div>
                  </div>
                  <div style={{ background: '#070b14', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 18px', textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Bullish (Growth/Bargains)</div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-up)', fontFamily: 'var(--font-mono)' }}>{bullishCount}</div>
                  </div>
                </div>
              </div>

              {/* Grid of articles */}
              <div className="modal-grid">
                {displayNews.map((item, idx) => (
                  <div key={item.id || idx} className="news-card-modal">
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                        <span className={getSentimentStyle(item.sentiment)} style={{ fontSize: '9px', padding: '2px 8px' }}>
                          {item.sentiment}
                        </span>
                        <span style={{ fontSize: '10.5px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={11} /> {formatTime(item.publishedAt)}
                        </span>
                      </div>
                      
                      <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'none', lineHeight: '1.45', display: 'block', marginBottom: '8px' }}
                      >
                        {item.title}
                      </a>
                      
                      <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                        {item.description}
                      </p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.03)', fontSize: '11px', color: 'var(--text-dim)' }}>
                      <span>Source: Google News</span>
                      <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ color: 'var(--color-cyan)', textDecoration: 'none', fontWeight: 600 }}
                      >
                        Read Full Article →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #1e2a4a',
              background: '#131b31',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button 
                className="btn btn-primary" 
                onClick={() => setIsModalOpen(false)}
                style={{ minWidth: '120px' }}
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
