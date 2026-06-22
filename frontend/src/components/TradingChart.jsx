import React, { useRef, useEffect, useState } from 'react';

export default function TradingChart({ data, ticker, interval = '1d', onIntervalChange }) {
  const isIndex = ticker && ticker.startsWith('^');
  const formatVal = (val) => {
    if (val === null || val === undefined) return '';
    if (isIndex) return val.toFixed(2);
    return `₹${val.toFixed(2)}`;
  };
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [hoverIndex, setHoverIndex] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [chartTimeframe, setChartTimeframe] = useState('ALL'); // ALL, 1Y, 1M, 1W, 1D

  // Filter data client-side based on user selected timeframe
  const getFilteredData = () => {
    if (!data || data.length === 0) return [];
    if (interval !== '1d') return data;
    if (chartTimeframe === '1D') return data.slice(-2);
    if (chartTimeframe === '1W') return data.slice(-5);
    if (chartTimeframe === '1M') return data.slice(-22);
    if (chartTimeframe === '1Y') return data.slice(-250);
    return data; // ALL (Overall 6 months)
  };

  const filteredData = getFilteredData();

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = 540 * window.devicePixelRatio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `540px`;

      drawChart();
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial draw

    return () => window.removeEventListener('resize', handleResize);
  }, [filteredData, hoverIndex, mousePos]);

  const getMouseIndex = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || filteredData.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const chartWidth = canvas.width / window.devicePixelRatio - 60; // right padding for price scale
    const barWidth = chartWidth / filteredData.length;
    const index = Math.min(filteredData.length - 1, Math.max(0, Math.floor(x / barWidth)));

    setHoverIndex(index);
    setMousePos({ x: x * window.devicePixelRatio, y: y * window.devicePixelRatio });
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || !filteredData || filteredData.length === 0) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio;
    ctx.scale(dpr, dpr);
    
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const rightMargin = 60;
    const chartWidth = width - rightMargin;
    const barWidth = chartWidth / filteredData.length;

    // Layout partitions (y-coordinates)
    const priceTop = 30;
    const priceBottom = 280;
    const priceHeight = priceBottom - priceTop;

    const rsiTop = 310;
    const rsiBottom = 400;
    const rsiHeight = rsiBottom - rsiTop;

    const macdTop = 430;
    const macdBottom = 510;
    const macdHeight = macdBottom - macdTop;

    // ----------------------------------------------------
    // Draw Grid Lines & Borders
    // ----------------------------------------------------
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
    // Draw vertical borders
    ctx.beginPath();
    ctx.moveTo(chartWidth, 0);
    ctx.lineTo(chartWidth, height);
    ctx.stroke();

    // Price panel border
    ctx.strokeRect(0, priceTop, chartWidth, priceHeight);
    // RSI panel border
    ctx.strokeRect(0, rsiTop, chartWidth, rsiHeight);
    // MACD panel border
    ctx.strokeRect(0, macdTop, chartWidth, macdHeight);

    // ----------------------------------------------------
    // SCALE CALCULATIONS
    // ----------------------------------------------------
    // Price scale (Include High, Low, and VWAP)
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    filteredData.forEach(d => {
      if (d.lowPrice < minPrice) minPrice = d.lowPrice;
      if (d.highPrice > maxPrice) maxPrice = d.highPrice;
      if (d.vwap < minPrice) minPrice = d.vwap;
      if (d.vwap > maxPrice) maxPrice = d.vwap;
    });
    // Add 5% padding
    const pricePadding = (maxPrice - minPrice) * 0.05 || 1;
    minPrice -= pricePadding;
    maxPrice += pricePadding;

    const getPriceY = (val) => priceBottom - ((val - minPrice) / (maxPrice - minPrice)) * priceHeight;

    // Volume scale
    let maxVolume = 0;
    filteredData.forEach(d => {
      if (d.volume > maxVolume) maxVolume = d.volume;
    });
    const getVolHeight = (val) => (val / (maxVolume || 1)) * (priceHeight * 0.25);

    // MACD Scale
    let maxMacd = 0.0001;
    filteredData.forEach(d => {
      if (d.macdLine != null && Math.abs(d.macdLine) > maxMacd) maxMacd = Math.abs(d.macdLine);
      if (d.signalLine != null && Math.abs(d.signalLine) > maxMacd) maxMacd = Math.abs(d.signalLine);
      if (d.macdHist != null && Math.abs(d.macdHist) > maxMacd) maxMacd = Math.abs(d.macdHist);
    });
    const getMacdY = (val) => {
      const center = macdTop + macdHeight / 2;
      return center - (val / maxMacd) * (macdHeight / 2);
    };

    // RSI Scale
    const getRsiY = (val) => rsiBottom - (val / 100) * rsiHeight;

    // ----------------------------------------------------
    // DRAW HORIZONTAL GUIDES & LABELS
    // ----------------------------------------------------
    ctx.fillStyle = '#475569';
    ctx.font = '10px JetBrains Mono';
    ctx.textAlign = 'left';

    // Price Labels
    const priceSteps = 4;
    for (let i = 0; i <= priceSteps; i++) {
      const priceVal = minPrice + (i / priceSteps) * (maxPrice - minPrice);
      const y = getPriceY(priceVal);
      // Grid line
      ctx.strokeStyle = 'rgba(229, 232, 240, 0.6)';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();
      // Label
      ctx.fillText(formatVal(priceVal), chartWidth + 5, y + 4);
    }

    // RSI Labels & Lines (30 & 70)
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.15)';
    ctx.fillStyle = 'rgba(139, 92, 246, 0.02)';
    ctx.fillRect(0, getRsiY(70), chartWidth, getRsiY(30) - getRsiY(70));
    
    // 70 line
    ctx.strokeStyle = '#ff5252';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(0, getRsiY(70)); ctx.lineTo(chartWidth, getRsiY(70)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ff5252';
    ctx.fillText('70', chartWidth + 5, getRsiY(70) + 3);

    // 30 line
    ctx.strokeStyle = '#00d09c';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(0, getRsiY(30)); ctx.lineTo(chartWidth, getRsiY(30)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#00d09c';
    ctx.fillText('30', chartWidth + 5, getRsiY(30) + 3);

    // RSI 50 center line
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.15)';
    ctx.beginPath(); ctx.moveTo(0, getRsiY(50)); ctx.lineTo(chartWidth, getRsiY(50)); ctx.stroke();
    ctx.fillStyle = '#475569';
    ctx.fillText('50', chartWidth + 5, getRsiY(50) + 3);

    // MACD zero line
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.2)';
    ctx.beginPath();
    ctx.moveTo(0, getMacdY(0));
    ctx.lineTo(chartWidth, getMacdY(0));
    ctx.stroke();
    ctx.fillText('0.00', chartWidth + 5, getMacdY(0) + 3);

    // Titles
    ctx.font = 'bold 10px Outfit';
    ctx.fillStyle = '#475569';
    ctx.fillText('PRICE & VWAP', 10, priceTop - 10);
    ctx.fillText('RSI (14)', 10, rsiTop - 10);
    ctx.fillText('MACD (12, 26, 9)', 10, macdTop - 10);

    // ----------------------------------------------------
    // DRAW DATA SERIES
    // ----------------------------------------------------
    
    // 1. Draw Candlesticks & Volume & VWAP
    filteredData.forEach((d, i) => {
      const x = i * barWidth;
      const midX = x + barWidth / 2;
      const isBullish = d.closePrice >= d.openPrice;
      const candleColor = isBullish ? '#00d09c' : '#ff5252';

      // volume bar (translucent)
      ctx.fillStyle = isBullish ? 'rgba(0, 208, 156, 0.12)' : 'rgba(255, 82, 82, 0.12)';
      const volH = getVolHeight(d.volume);
      ctx.fillRect(x + 1, priceBottom - volH, barWidth - 2, volH);

      // candlestick wick
      ctx.strokeStyle = candleColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(midX, getPriceY(d.highPrice));
      ctx.lineTo(midX, getPriceY(d.lowPrice));
      ctx.stroke();

      // candlestick body
      ctx.fillStyle = candleColor;
      const yOpen = getPriceY(d.openPrice);
      const yClose = getPriceY(d.closePrice);
      const bodyH = Math.max(1, Math.abs(yOpen - yClose));
      ctx.fillRect(x + 1.5, Math.min(yOpen, yClose), barWidth - 3, bodyH);
    });

    // 2. Draw VWAP line
    ctx.strokeStyle = '#0284c7'; // Sky Blue for VWAP
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    filteredData.forEach((d, i) => {
      const midX = i * barWidth + barWidth / 2;
      if (i === 0) ctx.moveTo(midX, getPriceY(d.vwap));
      else ctx.lineTo(midX, getPriceY(d.vwap));
    });
    ctx.stroke();

    // 3. Draw RSI Line
    ctx.strokeStyle = '#a855f7'; // Purple
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let rsiStarted = false;
    filteredData.forEach((d, i) => {
      const midX = i * barWidth + barWidth / 2;
      if (d.rsi != null) {
        if (!rsiStarted) {
          ctx.moveTo(midX, getRsiY(d.rsi));
          rsiStarted = true;
        } else {
          ctx.lineTo(midX, getRsiY(d.rsi));
        }
      }
    });
    ctx.stroke();

    // 4. Draw MACD Histogram & Lines
    filteredData.forEach((d, i) => {
      const x = i * barWidth;
      const midX = x + barWidth / 2;
      if (d.macdHist != null) {
        const histY = getMacdY(d.macdHist);
        const zeroY = getMacdY(0);
        ctx.fillStyle = d.macdHist >= 0 ? 'rgba(0, 208, 156, 0.6)' : 'rgba(255, 82, 82, 0.6)';
        ctx.fillRect(x + 2, Math.min(histY, zeroY), barWidth - 4, Math.abs(histY - zeroY));
      }
    });

    // MACD Line (Blue)
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    let macdStarted = false;
    filteredData.forEach((d, i) => {
      const midX = i * barWidth + barWidth / 2;
      if (d.macdLine != null) {
        if (!macdStarted) {
          ctx.moveTo(midX, getMacdY(d.macdLine));
          macdStarted = true;
        } else {
          ctx.lineTo(midX, getMacdY(d.macdLine));
        }
      }
    });
    ctx.stroke();

    // Signal Line (Orange)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    let signalStarted = false;
    filteredData.forEach((d, i) => {
      const midX = i * barWidth + barWidth / 2;
      if (d.signalLine != null) {
        if (!signalStarted) {
          ctx.moveTo(midX, getMacdY(d.signalLine));
          signalStarted = true;
        } else {
          ctx.lineTo(midX, getMacdY(d.signalLine));
        }
      }
    });
    ctx.stroke();

    // X-Axis Date Labels (draw dynamic based on sliced data length)
    ctx.fillStyle = '#64748b';
    ctx.font = '9px JetBrains Mono';
    ctx.textAlign = 'center';
    
    // Choose step dynamically so labels don't overlap on smaller viewports / subsets
    const labelStep = filteredData.length <= 10 ? 1 : filteredData.length <= 30 ? 5 : 20;

    filteredData.forEach((d, i) => {
      if (i % labelStep === 0) {
        const midX = i * barWidth + barWidth / 2;
        const formatXLabel = (tsStr) => {
          const date = new Date(tsStr);
          if (interval === '1m' || interval === '5m' || interval === '10m') {
            return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
          } else if (interval === '1h') {
            return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
          } else if (interval === '1mo') {
            return date.toLocaleDateString(undefined, { year: '2-digit', month: 'short' });
          } else {
            return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          }
        };
        const dateStr = formatXLabel(d.timestamp);
        ctx.fillText(dateStr, midX, height - 10);
        
        ctx.strokeStyle = 'rgba(229, 231, 235, 0.4)';
        ctx.beginPath();
        ctx.moveTo(midX, priceTop);
        ctx.lineTo(midX, height - 20);
        ctx.stroke();
      }
    });

    // ----------------------------------------------------
    // HOVER CROSSHAIR & DRAW TOOLTIP IN MAIN DISPLAY
    // ----------------------------------------------------
    if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < filteredData.length) {
      const d = filteredData[hoverIndex];
      const midX = hoverIndex * barWidth + barWidth / 2;

      // Draw vertical crosshair line
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(midX, 20);
      ctx.lineTo(midX, height - 20);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  // Render info of current hovered candle
  const hoveredData = hoverIndex !== null && hoverIndex < filteredData.length ? filteredData[hoverIndex] : filteredData[filteredData.length - 1];

  return (
    <div className="card" style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }} ref={containerRef}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '4px' }}>
        <h3 className="card-title" style={{ margin: 0, textTransform: 'uppercase', fontSize: '14px', letterSpacing: '0.5px' }}>
          📊 {ticker} TECHNICAL CHART
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Candle Interval Selector */}
          <div style={{
            display: 'inline-flex',
            gap: '3px',
            background: 'rgba(7, 11, 20, 0.4)',
            padding: '3px',
            borderRadius: '6px',
            border: '1px solid var(--border-color)'
          }}>
            {[
              { label: '1m', value: '1m', tooltip: '1 Minute Candle' },
              { label: '5m', value: '5m', tooltip: '5 Minute Candle' },
              { label: '10m', value: '10m', tooltip: '10 Minute Candle' },
              { label: '1h', value: '1h', tooltip: 'Hourly Candle' },
              { label: '1d', value: '1d', tooltip: 'Daily Candle' },
              { label: '1M', value: '1mo', tooltip: 'Monthly Candle' }
            ].map(ci => (
              <button
                key={ci.value}
                onClick={() => {
                  if (onIntervalChange) onIntervalChange(ci.value);
                  setHoverIndex(null);
                }}
                style={{
                  background: interval === ci.value ? 'var(--color-cyan)' : 'transparent',
                  color: interval === ci.value ? '#042f1a' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                title={ci.tooltip}
              >
                {ci.label}
              </button>
            ))}
          </div>

          {/* Timeframe Trends Filter Selector */}
          {interval === '1d' && (
            <div style={{
              display: 'inline-flex',
              gap: '3px',
              background: 'rgba(7, 11, 20, 0.4)',
              padding: '3px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)'
            }}>
              {[
                { label: '1D', value: '1D', tooltip: '1 Day Trend' },
                { label: '1W', value: '1W', tooltip: '1 Week Trend' },
                { label: '1M', value: '1M', tooltip: '1 Month Trend' },
                { label: '1Y', value: '1Y', tooltip: '1 Year Trend' },
                { label: 'Overall', value: 'ALL', tooltip: 'Overall Chart (6 Months)' }
              ].map(tf => (
                <button
                  key={tf.value}
                  onClick={() => {
                    setChartTimeframe(tf.value);
                    setHoverIndex(null); // Reset hover to avoid index out of bounds
                  }}
                  style={{
                    background: chartTimeframe === tf.value ? 'var(--color-cyan)' : 'transparent',
                    color: chartTimeframe === tf.value ? '#042f1a' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  title={tf.tooltip}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {hoveredData && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '15px',
          padding: '8px 12px',
          background: 'var(--bg-darker)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-color)',
          fontSize: '11.5px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-muted)'
        }}>
          <div>Date: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{
            (() => {
              const date = new Date(hoveredData.timestamp);
              if (interval === '1m' || interval === '5m' || interval === '10m' || interval === '1h') {
                return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
              }
              return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
            })()
          }</span></div>
          <div>O: <span style={{ color: hoveredData.closePrice >= hoveredData.openPrice ? 'var(--color-up)' : 'var(--color-down)' }}>{formatVal(hoveredData.openPrice)}</span></div>
          <div>H: <span style={{ color: 'var(--text-primary)' }}>{formatVal(hoveredData.highPrice)}</span></div>
          <div>L: <span style={{ color: 'var(--text-primary)' }}>{formatVal(hoveredData.lowPrice)}</span></div>
          <div>C: <span style={{ color: hoveredData.closePrice >= hoveredData.openPrice ? 'var(--color-up)' : 'var(--color-down)', fontWeight: 600 }}>{formatVal(hoveredData.closePrice)}</span></div>
          <div>Vol: <span style={{ color: 'var(--text-primary)' }}>{hoveredData.volume.toLocaleString()}</span></div>
          <div>VWAP: <span style={{ color: 'var(--color-cyan)' }}>{formatVal(hoveredData.vwap)}</span></div>
          {hoveredData.rsi != null && (
            <div>RSI(14): <span style={{ color: hoveredData.rsi > 70 ? 'var(--color-down)' : hoveredData.rsi < 30 ? 'var(--color-up)' : '#a855f7', fontWeight: 600 }}>{hoveredData.rsi.toFixed(2)}</span></div>
          )}
          {hoveredData.macdLine != null && (
            <div>MACD: <span style={{ color: '#3b82f6' }}>{hoveredData.macdLine.toFixed(3)}</span> | <span style={{ color: '#f59e0b' }}>{hoveredData.signalLine.toFixed(3)}</span> | <span style={{ color: hoveredData.macdHist >= 0 ? 'var(--color-up)' : 'var(--color-down)' }}>{hoveredData.macdHist.toFixed(3)}</span></div>
          )}
        </div>
      )}
      <div style={{ position: 'relative', overflow: 'hidden', cursor: 'crosshair' }}>
        <canvas
          ref={canvasRef}
          onMouseMove={getMouseIndex}
          onMouseLeave={handleMouseLeave}
          style={{ display: 'block', borderRadius: '4px' }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)', padding: '0 5px' }}>
        <span>← Timeframe Trends Applied</span>
        <span style={{ display: 'flex', gap: '12px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', background: '#06b6d4', borderRadius: '50%' }}></span> VWAP</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', background: '#a855f7', borderRadius: '50%' }}></span> RSI</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', background: '#3b82f6', borderRadius: '50%' }}></span> MACD</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', background: '#f59e0b', borderRadius: '50%' }}></span> Signal</span>
        </span>
        <span>Interactive Crosshairs Enabled</span>
      </div>
    </div>
  );
}
