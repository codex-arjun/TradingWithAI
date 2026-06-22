import React, { useState, useEffect } from 'react';
import { Layers, Activity, TrendingUp, Info } from 'lucide-react';

export default function OptionChain({ ticker, spotPrice, onSelectOption, marketData, onPlaceOrder }) {
  const [numStrikes, setNumStrikes] = useState(15);
  const [optionData, setOptionData] = useState([]);
  const [expiryDate, setExpiryDate] = useState('');

  // 1. Calculate nearest upcoming Thursday for option expiry
  useEffect(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday, 4 is Thursday
    const daysUntilThursday = (4 - dayOfWeek + 7) % 7 || 7; // if today is Thursday, expire next Thursday
    const nextThursday = new Date(today);
    nextThursday.setDate(today.getDate() + daysUntilThursday);
    setExpiryDate(nextThursday.toISOString().split('T')[0]);
  }, []);

  // 2. Generate strikes and base premiums when spotPrice or numStrikes changes
  useEffect(() => {
    if (!spotPrice) return;

    // Define strike step size based on symbol type
    let step = 50;
    if (ticker === '^NSEI') step = 50;
    else if (ticker === '^NSEBANK') step = 100;
    else if (ticker === '^BSESN') step = 500;
    else {
      // Stock strike steps
      if (spotPrice > 2000) step = 50;
      else if (spotPrice > 1000) step = 20;
      else if (spotPrice > 500) step = 10;
      else step = 5;
    }

    const atmStrike = Math.round(spotPrice / step) * step;
    const strikes = [];
    const half = Math.floor(numStrikes / 2);
    for (let i = -half; i <= half; i++) {
      strikes.push(atmStrike + i * step);
    }

    // Generate initial option chain quotes based on spot price
    const initialData = strikes.map(strike => {
      // Call option (CE) LTP calculation
      const callIntrinsic = Math.max(0, spotPrice - strike);
      const callTimeValue = spotPrice * 0.008 * Math.exp(-Math.abs(strike - spotPrice) / (spotPrice * 0.04));
      const callLtp = Math.max(1.0, callIntrinsic + callTimeValue);
      const callChange = (Math.random() - 0.48) * 8; // randomized change %

      // Put option (PE) LTP calculation
      const putIntrinsic = Math.max(0, strike - spotPrice);
      const putTimeValue = spotPrice * 0.008 * Math.exp(-Math.abs(spotPrice - strike) / (spotPrice * 0.04));
      const putLtp = Math.max(1.0, putIntrinsic + putTimeValue);
      const putChange = (Math.random() - 0.52) * 8;

      // Bid/Ask and Open Interest (OI)
      // Highlight ATM strikes with larger open interest
      const multiplier = Math.exp(-Math.abs(strike - spotPrice) / (spotPrice * 0.03));
      const callOi = Math.round((30000 + Math.random() * 70000) * (0.3 + 0.7 * multiplier));
      const putOi = Math.round((30000 + Math.random() * 70000) * (0.3 + 0.7 * multiplier));
      const callOiChange = Math.round((Math.random() - 0.45) * 5000 * multiplier);
      const putOiChange = Math.round((Math.random() - 0.45) * 5000 * multiplier);

      return {
        strike,
        callLtp,
        callChange,
        callOi,
        callOiChange,
        putLtp,
        putChange,
        putOi,
        putOiChange,
      };
    });

    setOptionData(initialData);
  }, [ticker, spotPrice, numStrikes]);

  // 3. Live tick simulation (adds small fluctuations to premiums and OI changes every 2.5s)
  useEffect(() => {
    if (optionData.length === 0) return;

    const interval = setInterval(() => {
      setOptionData(prev => 
        prev.map(row => {
          const callTick = (Math.random() - 0.5) * 0.3; // +/- 0.15% change
          const putTick = (Math.random() - 0.5) * 0.3;
          const callOiTick = Math.round((Math.random() - 0.5) * 200);
          const putOiTick = Math.round((Math.random() - 0.5) * 200);
          
          return {
            ...row,
            callLtp: Math.max(1.0, row.callLtp * (1 + callTick / 100)),
            callChange: row.callChange + callTick,
            callOiChange: row.callOiChange + callOiTick,
            putLtp: Math.max(1.0, row.putLtp * (1 + putTick / 100)),
            putChange: row.putChange + putTick,
            putOiChange: row.putOiChange + putOiTick,
          };
        })
      );
    }, 2500);

    return () => clearInterval(interval);
  }, [optionData]);

  if (!spotPrice) {
    return (
      <div className="card" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)' }}>
        No price data available for option chain.
      </div>
    );
  }

  // 4. Calculate PCR, S/R, and Pivot Points
  const totalCallOi = optionData.reduce((sum, r) => sum + r.callOi, 0);
  const totalPutOi = optionData.reduce((sum, r) => sum + r.putOi, 0);
  const pcr = totalCallOi > 0 ? (totalPutOi / totalCallOi) : 1.0;

  let pcrText = 'Balanced (Neutral)';
  let pcrColor = 'var(--color-hold)';
  if (pcr > 1.15) {
    pcrText = 'Bullish (Put Writing dominance)';
    pcrColor = 'var(--color-up)';
  } else if (pcr < 0.85) {
    pcrText = 'Bearish (Call Writing dominance)';
    pcrColor = 'var(--color-down)';
  }

  // Option-based S/R from Max OI
  let maxCallOiRow = optionData.reduce((max, r) => r.callOi > max.callOi ? r : max, { callOi: 0 });
  let maxPutOiRow = optionData.reduce((max, r) => r.putOi > max.putOi ? r : max, { putOi: 0 });
  const optionResistance = maxCallOiRow.strike || 0;
  const optionSupport = maxPutOiRow.strike || 0;

  // Technical Pivot Points from Daily Candlestick History
  const getPivotPoints = () => {
    if (!marketData || marketData.length === 0) return null;
    const latestBar = marketData[marketData.length - 1];
    const H = latestBar.highPrice;
    const L = latestBar.lowPrice;
    const C = latestBar.closePrice;
    
    const P = (H + L + C) / 3;
    const R1 = 2 * P - L;
    const S1 = 2 * P - H;
    const R2 = P + (H - L);
    const S2 = P - (H - L);
    const R3 = H + 2 * (P - L);
    const S3 = L - 2 * (H - P);
    
    return { P, R1, S1, R2, S2, R3, S3 };
  };

  const pivots = getPivotPoints();

  const formatLtp = (val) => val.toFixed(2);
  const formatChange = (val) => `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* 1. Options & Technical Analysis Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        
        {/* Left: Options Sentiment Panel */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(243, 244, 246, 0.5)' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-cyan)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
            <Activity size={14} /> OPTIONS SENTIMENT SUMMARY
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
            <div style={{ background: 'var(--bg-darker)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Put-Call Ratio (PCR)</span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: pcrColor, fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
                {pcr.toFixed(2)}
              </div>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{pcrText}</span>
            </div>
            
            <div style={{ background: 'var(--bg-darker)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>OI Boundary (Max Pain)</span>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0' }}>
                Support: <span style={{ color: 'var(--color-up)', fontFamily: 'var(--font-mono)' }}>{optionSupport.toLocaleString()}</span>
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Resistance: <span style={{ color: 'var(--color-down)', fontFamily: 'var(--font-mono)' }}>{optionResistance.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-dark)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', marginTop: '4px' }}>
            <Info size={14} style={{ flexShrink: 0, marginTop: '1px' }} color="var(--color-cyan)" />
            <span>
              Maximum Call accumulation is at strike <strong>{optionResistance}</strong>, indicating a strong overhead resistance zone. Maximum Put accumulation is at strike <strong>{optionSupport}</strong>, establishing immediate trading support.
            </span>
          </div>
        </div>

        {/* Right: Candlestick Pivot Points Support/Resistance */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(243, 244, 246, 0.5)' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-hold)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
            <TrendingUp size={14} /> TECHNICAL PIVOT LEVELS (DAILY CANDLES)
          </h4>
          {pivots ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: '11px', marginTop: '6px' }}>
              
              {/* Supports */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontWeight: 700, color: 'var(--color-up)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>SUPPORTS</span>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>S1</span>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{Math.round(pivots.S1)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>S2</span>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{Math.round(pivots.S2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>S3</span>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{Math.round(pivots.S3)}</strong>
                </div>
              </div>

              {/* Pivot */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--bg-darker)', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <span style={{ fontWeight: 700, color: 'var(--color-cyan)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>PIVOT POINT</span>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', margin: 'auto 0' }}>
                  {Math.round(pivots.P)}
                </div>
              </div>

              {/* Resistances */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontWeight: 700, color: 'var(--color-down)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>RESISTANCES</span>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>R1</span>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{Math.round(pivots.R1)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>R2</span>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{Math.round(pivots.R2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>R3</span>
                  <strong style={{ fontFamily: 'var(--font-mono)' }}>{Math.round(pivots.R3)}</strong>
                </div>
              </div>

            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
              Historical daily candles are loading...
            </div>
          )}
          
          <div style={{ fontSize: '10.5px', color: 'var(--text-dim)', fontStyle: 'italic', marginTop: 'auto' }}>
            *Calculated dynamically using Daily High/Low/Close data of the underlying asset.
          </div>
        </div>
      </div>

      {/* 2. Interactive Option Chain Matrix */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}>
        
        {/* Controls Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 className="card-title" style={{ margin: 0 }}>
              <Layers size={16} color="var(--color-cyan)" /> CONTRACTS CHAIN matrix
            </h3>
            
            {/* Rows Selection Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Strikes:</span>
              <select 
                value={numStrikes} 
                onChange={(e) => setNumStrikes(parseInt(e.target.value))}
                style={{ 
                  background: 'var(--bg-darker)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '4px', 
                  color: 'var(--text-primary)', 
                  padding: '3px 8px', 
                  fontSize: '11.5px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value={7}>7 strikes</option>
                <option value={15}>15 strikes (Default)</option>
                <option value={25}>25 strikes</option>
                <option value={35}>35 strikes (All)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '14px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
            <div>Spot Price: <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{(ticker && ticker.startsWith('^')) ? `${spotPrice.toFixed(2)} pts` : `₹${spotPrice.toFixed(2)}`}</strong></div>
            <div>Expiry: <strong style={{ color: 'var(--color-hold)' }}>{expiryDate} (Thursday Weekly)</strong></div>
          </div>
        </div>

        {/* Option Chain Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '11.5px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-darker)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                <th colSpan="4" style={{ padding: '8px', color: 'var(--color-up)', borderRight: '1px solid var(--border-color)', fontSize: '12px' }}>CALL OPTIONS (CE)</th>
                <th style={{ padding: '8px', fontSize: '12px' }}>STRIKE</th>
                <th colSpan="4" style={{ padding: '8px', color: 'var(--color-down)', borderLeft: '1px solid var(--border-color)', fontSize: '12px' }}>PUT OPTIONS (PE)</th>
              </tr>
              <tr style={{ background: 'rgba(255, 255, 255, 0.02)', color: 'var(--text-dim)', fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '6px' }}>OI (Lakhs)</th>
                <th style={{ padding: '6px' }}>Chg in OI</th>
                <th style={{ padding: '6px' }}>LTP</th>
                <th style={{ padding: '6px', borderRight: '1px solid var(--border-color)' }}>Net Chg</th>
                <th style={{ padding: '6px', color: 'var(--text-primary)', background: 'var(--bg-darker)' }}>Strike Price</th>
                <th style={{ padding: '6px', borderLeft: '1px solid var(--border-color)' }}>LTP</th>
                <th style={{ padding: '6px' }}>Net Chg</th>
                <th style={{ padding: '6px' }}>Chg in OI</th>
                <th style={{ padding: '6px' }}>OI (Lakhs)</th>
              </tr>
            </thead>
            <tbody>
              {optionData.map((row, index) => {
                const isAtm = Math.abs(spotPrice - row.strike) < (row.strike * 0.005);
                
                // CE ITM: Strike < Spot
                const isCeItm = row.strike < spotPrice;
                // PE ITM: Strike > Spot
                const isPeItm = row.strike > spotPrice;

                // Color variables for ITM shading (standard amber tint background)
                const itmBackground = 'rgba(251, 191, 36, 0.035)'; 

                return (
                  <React.Fragment key={row.strike}>
                    {/* Render Spot Price ATM line if spot falls between this row and next */}
                    {index > 0 && optionData[index - 1].strike <= spotPrice && row.strike > spotPrice && (
                      <tr style={{ background: 'rgba(6, 182, 212, 0.12)', borderTop: '2px dashed var(--color-cyan)', borderBottom: '2px dashed var(--color-cyan)' }}>
                        <td colSpan="4" style={{ padding: '4px', fontSize: '10px', fontWeight: 800, color: 'var(--color-cyan)', textAlign: 'right' }}>
                          ◀ IN-THE-MONEY (ITM) CALLS
                        </td>
                        <td style={{ padding: '4px', fontWeight: 800, color: 'var(--color-cyan)', fontSize: '10.5px', fontFamily: 'var(--font-mono)' }}>
                          SPOT: {spotPrice.toFixed(1)}
                        </td>
                        <td colSpan="4" style={{ padding: '4px', fontSize: '10px', fontWeight: 800, color: 'var(--color-cyan)', textAlign: 'left' }}>
                          IN-THE-MONEY (ITM) PUTS ▶
                        </td>
                      </tr>
                    )}

                    <tr 
                      style={{ 
                        borderBottom: '1px solid var(--border-color)',
                        background: isAtm ? 'rgba(99, 102, 241, 0.04)' : 'transparent',
                        transition: 'all 0.15s ease'
                      }}
                      className="option-row"
                    >
                      {/* Call CE Columns */}
                      <td style={{ padding: '8px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', background: isCeItm ? itmBackground : 'transparent' }}>
                        {(row.callOi / 1000).toFixed(1)}L
                      </td>
                      <td style={{ padding: '8px', color: row.callOiChange >= 0 ? 'var(--color-up)' : 'var(--color-down)', fontFamily: 'var(--font-mono)', background: isCeItm ? itmBackground : 'transparent', fontSize: '10.5px' }}>
                        {row.callOiChange >= 0 ? '+' : ''}{(row.callOiChange / 1000).toFixed(1)}L
                      </td>
                      <td 
                        onClick={() => {
                          const displaySymbol = ticker ? ticker.toUpperCase().replace('^', '').replace('.NS', '') : '';
                          const contract = `${displaySymbol} ${row.strike} CE`;
                          if (onPlaceOrder) onPlaceOrder(contract, 'BUY', row.callLtp);
                          onSelectOption({ strike: row.strike, type: 'CALL', expiry: expiryDate });
                        }}
                        style={{ 
                          padding: '8px', 
                          color: 'var(--color-up)', 
                          fontWeight: 700, 
                          cursor: 'pointer',
                          background: isCeItm ? 'rgba(16, 185, 129, 0.06)' : 'rgba(16, 185, 129, 0.02)',
                          fontFamily: 'var(--font-mono)'
                        }}
                        title="Click to analyze & buy Call Option"
                      >
                        ₹{formatLtp(row.callLtp)}
                      </td>
                      <td style={{ 
                        padding: '8px', 
                        color: row.callChange >= 0 ? 'var(--color-up)' : 'var(--color-down)',
                        borderRight: '1px solid var(--border-color)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10.5px',
                        background: isCeItm ? itmBackground : 'transparent'
                      }}>
                        {formatChange(row.callChange)}
                      </td>

                      {/* Strike Price Column */}
                      <td style={{ 
                        padding: '8px', 
                        fontWeight: 800, 
                        color: isAtm ? 'var(--color-cyan)' : 'var(--text-primary)', 
                        background: 'var(--bg-darker)',
                        fontFamily: 'var(--font-mono)'
                      }}>
                        {row.strike.toLocaleString()}
                      </td>

                      {/* Put PE Columns */}
                      <td 
                        onClick={() => {
                          const displaySymbol = ticker ? ticker.toUpperCase().replace('^', '').replace('.NS', '') : '';
                          const contract = `${displaySymbol} ${row.strike} PE`;
                          if (onPlaceOrder) onPlaceOrder(contract, 'BUY', row.putLtp);
                          onSelectOption({ strike: row.strike, type: 'PUT', expiry: expiryDate });
                        }}
                        style={{ 
                          padding: '8px', 
                          color: 'var(--color-down)', 
                          fontWeight: 700, 
                          cursor: 'pointer',
                          background: isPeItm ? 'rgba(244, 63, 94, 0.06)' : 'rgba(244, 63, 94, 0.02)',
                          borderLeft: '1px solid var(--border-color)',
                          fontFamily: 'var(--font-mono)'
                        }}
                        title="Click to analyze & buy Put Option"
                      >
                        ₹{formatLtp(row.putLtp)}
                      </td>
                      <td style={{ 
                        padding: '8px', 
                        color: row.putChange >= 0 ? 'var(--color-up)' : 'var(--color-down)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10.5px',
                        background: isPeItm ? itmBackground : 'transparent'
                      }}>
                        {formatChange(row.putChange)}
                      </td>
                      <td style={{ padding: '8px', color: row.putOiChange >= 0 ? 'var(--color-up)' : 'var(--color-down)', fontFamily: 'var(--font-mono)', background: isPeItm ? itmBackground : 'transparent', fontSize: '10.5px' }}>
                        {row.putOiChange >= 0 ? '+' : ''}{(row.putOiChange / 1000).toFixed(1)}L
                      </td>
                      <td style={{ padding: '8px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', background: isPeItm ? itmBackground : 'transparent' }}>
                        {(row.putOi / 1000).toFixed(1)}L
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '10.5px', color: 'var(--text-dim)', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
          <div>💡 <em>CE ITM (In-the-Money) calls are highlighted on the left (Strikes &lt; Spot Price). PE ITM (In-the-Money) puts are highlighted on the right (Strikes &gt; Spot Price).</em></div>
          <div>OI units are represented in <strong>Lakhs (L)</strong> of contracts.</div>
        </div>
      </div>
      
    </div>
  );
}
