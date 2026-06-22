import React, { useState } from 'react';
import { HelpCircle, Play, ArrowUpCircle, ArrowDownCircle, MinusCircle, Shield, AlertCircle } from 'lucide-react';

export default function CustomAnalyzer({ activeTicker, prefilledOption, onAnalyze }) {
  const [ticker, setTicker] = useState(activeTicker || '^NSEI');
  const [query, setQuery] = useState('');
  const [isOption, setIsOption] = useState(false);
  const [optionType, setOptionType] = useState('CALL');
  const [optionStrike, setOptionStrike] = useState('');
  const [optionExpiry, setOptionExpiry] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sync with active symbol if changed
  React.useEffect(() => {
    if (activeTicker) {
      setTicker(activeTicker);
    }
  }, [activeTicker]);

  // Sync with prefilled option if selected from option chain
  React.useEffect(() => {
    if (prefilledOption) {
      setIsOption(true);
      setOptionStrike(prefilledOption.strike.toString());
      setOptionType(prefilledOption.type);
      setOptionExpiry(prefilledOption.expiry);
      // Auto-fill query
      setQuery(`Will the ${ticker} ${prefilledOption.type} Option at Strike ${prefilledOption.strike} be profitable?`);
    }
  }, [prefilledOption]);

  const formatVal = (val) => {
    if (val === null || val === undefined || isNaN(val) || val === 0) return 'N/A';
    const isIndex = ticker && ticker.startsWith('^');
    if (isIndex) return `${val.toFixed(2)} pts`;
    return `₹${val.toFixed(2)}`;
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const payload = {
        ticker: ticker.trim().toUpperCase(),
        query: query.trim() || 'Will this share go up or down?',
        optionStrike: isOption && optionStrike ? parseFloat(optionStrike) : null,
        optionType: isOption ? optionType : 'NONE',
        optionExpiry: isOption && optionExpiry ? optionExpiry : null
      };

      if (!onAnalyze) {
        throw new Error('Analysis callback not provided.');
      }
      const data = await onAnalyze(payload);
      setResult(data);
    } catch (err) {
      console.error(err);
      setError('Could not fetch custom prediction from Llama.');
    } finally {
      setLoading(false);
    }
  };

  const getDirectionDetails = (dir) => {
    if (dir === 'UP') return { label: 'BULLISH / UP', color: 'var(--color-up)', icon: <ArrowUpCircle size={24} color="var(--color-up)" /> };
    if (dir === 'DOWN') return { label: 'BEARISH / DOWN', color: 'var(--color-down)', icon: <ArrowDownCircle size={24} color="var(--color-down)" /> };
    return { label: 'STAGNANT / RANGE-BOUND', color: 'var(--color-hold)', icon: <MinusCircle size={24} color="var(--color-hold)" /> };
  };

  const getOptionRecommendation = (dir, type) => {
    let step = 50;
    const cleanTicker = ticker ? ticker.trim().toUpperCase() : '';
    if (cleanTicker === '^NSEI') step = 50;
    else if (cleanTicker === '^NSEBANK') step = 100;
    else if (cleanTicker === '^BSESN') step = 100; // Sensex: 100 points step
    else {
      step = 10;
    }

    // Determine target strike from state input, result price, or index defaults
    let targetStrike = optionStrike ? parseFloat(optionStrike) : 0;
    if (!targetStrike && result && result.targetPrice) {
      targetStrike = Math.round(result.targetPrice / step) * step;
    }
    if (!targetStrike) {
      targetStrike = cleanTicker === '^NSEI' ? 24150 : cleanTicker === '^BSESN' ? 77400 : 1000;
    }

    const displaySymbol = cleanTicker.replace('^', '').replace('.NS', '');

    if (dir === 'UP') {
      return `BUY ${displaySymbol} ${targetStrike} CALL (CE) Option`;
    } else if (dir === 'DOWN') {
      return `BUY ${displaySymbol} ${targetStrike} PUT (PE) Option`;
    } else {
      return 'HOLD / AVOID option trading';
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} id="custom-analyzer-section">
      <h3 className="card-title" style={{ margin: 0 }}>
        <HelpCircle size={16} color="var(--color-cyan)" /> CUSTOM AI PREDICTION
      </h3>

      <form onSubmit={handleAnalyze} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Ticker</span>
            <input 
              type="text" 
              value={ticker} 
              onChange={(e) => setTicker(e.target.value)} 
              className="input-field" 
              style={{ background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '6px 8px', fontSize: '12px' }}
              required 
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Custom Question / Scenario</span>
            <input 
              type="text" 
              value={query} 
              onChange={(e) => setQuery(e.target.value)} 
              placeholder="e.g. Will Nifty cross 25000 this month?" 
              className="input-field" 
              style={{ background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '6px 8px', fontSize: '12px' }}
            />
          </div>
        </div>

        {/* Option toggle checkbox */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', cursor: 'pointer', color: 'var(--text-muted)' }}>
          <input type="checkbox" checked={isOption} onChange={() => setIsOption(!isOption)} />
          Analyze Option Contract (Nifty/Sensex/Shares)
        </label>

        {isOption && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '8px', 
            padding: '10px', 
            background: 'var(--bg-darker)', 
            borderRadius: '6px', 
            border: '1px solid var(--border-color)' 
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>TYPE</span>
              <select 
                value={optionType} 
                onChange={(e) => setOptionType(e.target.value)}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', padding: '4px', fontSize: '11px', outline: 'none' }}
              >
                <option value="CALL">CALL (CE)</option>
                <option value="PUT">PUT (PE)</option>
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>STRIKE</span>
              <input 
                type="number" 
                value={optionStrike} 
                onChange={(e) => setOptionStrike(e.target.value)} 
                placeholder="e.g. 23500" 
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', padding: '4px', fontSize: '11px', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>EXPIRY</span>
              <input 
                type="date" 
                value={optionExpiry} 
                onChange={(e) => setOptionExpiry(e.target.value)} 
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', padding: '2px 4px', fontSize: '10px', outline: 'none' }}
              />
            </div>
          </div>
        )}

        <button type="submit" className="btn btn-primary" style={{ padding: '8px', width: '100%' }} disabled={loading}>
          <Play size={12} fill="currentColor" /> {loading ? 'Computing Prediction...' : 'Run Llama Forecast'}
        </button>
      </form>

      {error && (
        <div style={{ fontSize: '11.5px', color: 'var(--color-down)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <AlertCircle size={13} />
          {error}
        </div>
      )}

      {result && (
        <div style={{ 
          marginTop: '6px', 
          borderTop: '1px solid var(--border-color)', 
          paddingTop: '14px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px' 
        }}>
          {/* Prediction Result Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {getDirectionDetails(result.direction).icon}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Llama AI Forecast</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: getDirectionDetails(result.direction).color }}>
                {getDirectionDetails(result.direction).label}
              </span>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Probability</span>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-cyan)', fontFamily: 'var(--font-mono)' }}>
                {result.probability.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Option Action Recommendation */}
          {isOption && (
            <div style={{ 
              background: 'var(--color-accent-glow)', 
              padding: '10px 14px', 
              borderRadius: 'var(--radius-sm)', 
              border: '1px solid rgba(99, 102, 241, 0.4)', 
              textAlign: 'center',
              animation: 'pulse-scale 2s infinite ease-in-out'
            }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trading Option Action</span>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                🚀 {getOptionRecommendation(result.direction, optionType)}
              </div>
            </div>
          )}

          {/* Target / Stop Loss details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{ background: 'var(--bg-darker)', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>TARGET PRICE</span>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-up)', fontFamily: 'var(--font-mono)' }}>
                {formatVal(result.targetPrice)}
              </div>
            </div>
            <div style={{ background: 'var(--bg-darker)', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>STOP LOSS</span>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-down)', fontFamily: 'var(--font-mono)' }}>
                {formatVal(result.stopLoss)}
              </div>
            </div>
          </div>

          {/* Explanation Text */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>PREDICTION ANALYSIS</span>
            <p style={{ 
              fontSize: '11.5px', 
              color: 'var(--text-muted)', 
              lineHeight: '1.45', 
              background: 'var(--bg-dark)', 
              padding: '10px', 
              borderRadius: '6px', 
              border: '1px solid var(--border-color)',
              fontStyle: 'italic'
            }}>
              {result.explanation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
