import React from 'react';
import { Compass, ShieldAlert, Award, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function RecommendationCard({ recommendations, ticker, onPlaceOrder }) {
  const isIndex = ticker && ticker.startsWith('^');
  const formatVal = (val) => {
    if (val === null || val === undefined) return '';
    if (isIndex) return `${val.toFixed(2)} pts`;
    return `₹${val.toFixed(2)}`;
  };

  const getOptionsSetup = (action, entryPrice) => {
    if (!entryPrice || action === 'HOLD') {
      return { action: 'AVOID / HOLD', contract: 'Avoid options buying (Decay risk)' };
    }
    
    let step = 50;
    const cleanTicker = ticker ? ticker.toUpperCase() : '';
    if (cleanTicker === '^NSEI') step = 50;
    else if (cleanTicker === '^NSEBANK') step = 100;
    else if (cleanTicker === '^BSESN') step = 100; // Sensex strike steps are 100 points
    else {
      if (entryPrice > 2000) step = 50;
      else if (entryPrice > 1000) step = 20;
      else if (entryPrice > 500) step = 10;
      else step = 5;
    }
    
    const strike = Math.round(entryPrice / step) * step;
    const displaySymbol = cleanTicker.replace('^', '').replace('.NS', '');
    
    if (action === 'BUY') {
      return {
        action: 'BUY CALL (CE)',
        contract: `${displaySymbol} ${strike} CE`
      };
    } else {
      return {
        action: 'BUY PUT (PE)',
        contract: `${displaySymbol} ${strike} PE`
      };
    }
  };

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>
        No recommendations generated yet.
      </div>
    );
  }

  // Find intraday and long-term recommendations
  const intraday = recommendations.find(r => r.tradeType === 'INTRADAY');
  const longTerm = recommendations.find(r => r.tradeType === 'LONG_TERM');

  const getActionClass = (action) => {
    if (action === 'BUY') return 'buy';
    if (action === 'SELL') return 'sell';
    return 'hold';
  };

  const getBadgeStyle = (action) => {
    if (action === 'BUY') return 'badge badge-buy';
    if (action === 'SELL') return 'badge badge-sell';
    return 'badge badge-hold';
  };

  const renderRecommendation = (reco, title) => {
    if (!reco) return null;

    const profitPotential = ((reco.profitTarget - reco.entryPrice) / reco.entryPrice) * 100;
    const isUp = profitPotential >= 0;

    return (
      <div 
        className={`card reco-card ${getActionClass(reco.action)}`} 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px',
          background: 'var(--bg-card)',
          height: '100%'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
            {title}
          </h4>
          <span className={getBadgeStyle(reco.action)} style={{ fontSize: '12px', padding: '4px 10px' }}>
            {reco.action}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
            {formatVal(reco.entryPrice)}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Entry Price</span>
        </div>

        {/* Trade Setup metrics */}
        <div className="reco-metrics">
          <div className="reco-metric">
            <div className="reco-metric-label">Stop Loss</div>
            <div className="reco-metric-value down" style={{ color: 'var(--color-down)' }}>
              {formatVal(reco.stopLoss)}
            </div>
          </div>
          <div className="reco-metric">
            <div className="reco-metric-label">Target Price</div>
            <div className="reco-metric-value up" style={{ color: 'var(--color-up)' }}>
              {formatVal(reco.profitTarget)}
            </div>
          </div>
          <div className="reco-metric">
            <div className="reco-metric-label">Profit Target</div>
            <div className="reco-metric-value up" style={{ color: 'var(--color-up)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
              {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {Math.abs(profitPotential).toFixed(1)}%
            </div>
          </div>
          <div className="reco-metric">
            <div className="reco-metric-label">Risk Exposure</div>
            <div className="reco-metric-value" style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <ShieldAlert size={12} color="var(--text-dim)" />
              {reco.riskPercentage.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Hold duration */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          background: 'var(--bg-dark)', 
          padding: '8px 12px', 
          borderRadius: 'var(--radius-sm)',
          fontSize: '12px',
          color: 'var(--text-muted)',
          border: '1px solid var(--border-color)'
        }}>
          <Clock size={14} color="var(--color-cyan)" />
          <span>Hold Time: <strong style={{ color: 'var(--text-primary)' }}>{reco.holdDuration}</strong></span>
        </div>

        {/* Options Trading Recommendation Setup */}
        {(() => {
          const optionContract = reco.optionSuggest && reco.optionSuggest !== 'N/A' 
            ? reco.optionSuggest 
            : getOptionsSetup(reco.action, reco.entryPrice).contract;
            
          const isCall = optionContract.toUpperCase().includes('CE');
          const isPut = optionContract.toUpperCase().includes('PE');
          const isAvoid = reco.action === 'HOLD' || optionContract.includes('Avoid');
          
          let btnLabel = 'AVOID OPTIONS';
          let textCol = 'var(--text-dim)';
          let bgCol = 'var(--bg-dark)';
          
          if (!isAvoid) {
            if (isCall) {
              btnLabel = 'BUY CALL (CE)';
              textCol = 'var(--color-up)';
              bgCol = 'rgba(0, 208, 156, 0.06)';
            } else {
              btnLabel = 'BUY PUT (PE)';
              textCol = 'var(--color-down)';
              bgCol = 'rgba(255, 82, 82, 0.06)';
            }
          }

          return (
            <div style={{ 
              background: bgCol, 
              padding: '14px 16px', 
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              border: '1px solid ' + (isAvoid ? 'var(--border-color)' : isCall ? 'rgba(0, 208, 156, 0.2)' : 'rgba(255, 82, 82, 0.2)'),
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.8px' }}>
                  🎯 Groww-Style Options Suggestion
                </span>
                <span style={{
                  fontSize: '9px',
                  background: 'rgba(0, 0, 0, 0.04)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  color: 'var(--text-muted)',
                  fontWeight: 600
                }}>Intraday Option</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', letterSpacing: '-0.3px' }}>
                  {isAvoid ? 'Avoid Option Buying' : optionContract}
                </span>
                <button 
                  onClick={() => !isAvoid && onPlaceOrder && onPlaceOrder(optionContract, 'BUY', reco.entryPrice)}
                  style={{ 
                    fontSize: '11px', 
                    fontWeight: 800, 
                    padding: '5px 12px', 
                    borderRadius: '6px', 
                    background: isAvoid ? 'rgba(0, 0, 0, 0.04)' : isCall ? 'rgba(0, 208, 156, 0.15)' : 'rgba(255, 82, 82, 0.15)',
                    color: textCol,
                    border: '1px solid ' + (isAvoid ? 'transparent' : textCol),
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    cursor: isAvoid ? 'not-allowed' : 'pointer'
                  }}
                  disabled={isAvoid}
                >
                  {btnLabel}
                </button>
              </div>
            </div>
          );
        })()}

        {/* Reasoning explanation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            tradewithAI Reasoning
          </span>
          <p style={{ 
            fontSize: '12px', 
            color: 'var(--text-muted)', 
            lineHeight: '1.5',
            background: 'var(--bg-dark)',
            padding: '10px',
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
            fontStyle: 'italic'
          }}>
            {reco.reasoning}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Compass size={16} color="var(--color-cyan)" /> TRADE PILOT RECOMMENDATIONS
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: isIndex ? '1fr' : '1fr 1fr', gap: '16px' }}>
        <div>
          {renderRecommendation(intraday, isIndex ? 'INTRADAY & OPTIONS ANALYSIS (INDEX)' : 'INTRADAY TRADING')}
        </div>
        {!isIndex && (
          <div>
            {renderRecommendation(longTerm, 'LONG-TERM INVESTMENT (SHARES)')}
          </div>
        )}
      </div>
    </div>
  );
}
