import React, { useState } from 'react';
import { Plus, Search, TrendingUp, BarChart2 } from 'lucide-react';

export default function Watchlist({ symbols, activeSymbol, onSelectSymbol, onAddSymbol, loading }) {
  const [newTicker, setNewTicker] = useState('');
  const [newName, setNewName] = useState('');
  const [type, setType] = useState('STOCK');
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeWatchlistFilter, setActiveWatchlistFilter] = useState('ALL'); // ALL | STOCK_INDEX | COMMODITIES

  const filteredSymbols = symbols.filter(sym => {
    if (activeWatchlistFilter === 'STOCK_INDEX') {
      return sym.type === 'STOCK' || sym.type === 'INDEX';
    }
    if (activeWatchlistFilter === 'COMMODITIES') {
      return sym.type === 'COMMODITY';
    }
    return true; // ALL
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newTicker.trim()) return;
    setError('');

    try {
      await onAddSymbol({
        ticker: newTicker.trim().toUpperCase(),
        name: newName.trim() || newTicker.trim().toUpperCase(),
        type: type
      });
      setNewTicker('');
      setNewName('');
      setShowAddForm(false);
    } catch (err) {
      setError(err.message || 'Failed to add symbol');
    }
  };

  return (
    <div className="sidebar" style={{ height: '100%' }}>
      <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={16} color="var(--color-up)" /> WATCHLIST
          </h3>
          <button 
            className="btn" 
            style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', gap: '4px' }}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus size={12} /> Add
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--bg-dark)', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '10px' }}>
            <input 
              type="text" 
              placeholder="Ticker (e.g. AAPL, BTC-USD)" 
              value={newTicker}
              onChange={(e) => setNewTicker(e.target.value)}
              className="input-field"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '6px 10px', fontSize: '12px' }}
              required
            />
            <input 
              type="text" 
              placeholder="Company Name (optional)" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="input-field"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '6px 10px', fontSize: '12px' }}
            />
            <div style={{ display: 'flex', gap: '10px', fontSize: '11px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input type="radio" checked={type === 'STOCK'} onChange={() => setType('STOCK')} /> Stock
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input type="radio" checked={type === 'INDEX'} onChange={() => setType('INDEX')} /> Index
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                <input type="radio" checked={type === 'COMMODITY'} onChange={() => setType('COMMODITY')} /> Commodity
              </label>
            </div>
            {error && <div style={{ color: 'var(--color-down)', fontSize: '11px' }}>{error}</div>}
            <button type="submit" className="btn btn-primary" style={{ padding: '6px', fontSize: '11px' }}>
              Confirm Ticker
            </button>
          </form>
        )}
      </div>

      {/* Watchlist Category Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', padding: '0 20px 10px 20px', borderBottom: '1px solid var(--border-color)', fontSize: '11px' }}>
        <button 
          onClick={() => setActiveWatchlistFilter('ALL')}
          style={{
            flex: 1,
            padding: '6px 4px',
            borderRadius: '4px',
            border: '1px solid var(--border-color)',
            backgroundColor: activeWatchlistFilter === 'ALL' ? 'var(--color-accent)' : 'transparent',
            color: activeWatchlistFilter === 'ALL' ? '#fff' : 'var(--text-muted)',
            fontWeight: activeWatchlistFilter === 'ALL' ? '700' : '500',
            cursor: 'pointer',
            fontSize: '10px'
          }}
        >
          All
        </button>
        <button 
          onClick={() => setActiveWatchlistFilter('STOCK_INDEX')}
          style={{
            flex: 1.5,
            padding: '6px 4px',
            borderRadius: '4px',
            border: '1px solid var(--border-color)',
            backgroundColor: activeWatchlistFilter === 'STOCK_INDEX' ? 'var(--color-accent)' : 'transparent',
            color: activeWatchlistFilter === 'STOCK_INDEX' ? '#fff' : 'var(--text-muted)',
            fontWeight: activeWatchlistFilter === 'STOCK_INDEX' ? '700' : '500',
            cursor: 'pointer',
            fontSize: '10px'
          }}
        >
          Stocks/Indices
        </button>
        <button 
          onClick={() => setActiveWatchlistFilter('COMMODITIES')}
          style={{
            flex: 1.2,
            padding: '6px 4px',
            borderRadius: '4px',
            border: '1px solid var(--border-color)',
            backgroundColor: activeWatchlistFilter === 'COMMODITIES' ? 'var(--color-accent)' : 'transparent',
            color: activeWatchlistFilter === 'COMMODITIES' ? '#fff' : 'var(--text-muted)',
            fontWeight: activeWatchlistFilter === 'COMMODITIES' ? '700' : '500',
            cursor: 'pointer',
            fontSize: '10px'
          }}
        >
          Commodities
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
        {filteredSymbols.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
            No matching symbols.
          </div>
        ) : (
          filteredSymbols.map((sym) => {
            const isActive = activeSymbol && activeSymbol.ticker === sym.ticker;
            return (
              <div
                key={sym.ticker}
                onClick={() => onSelectSymbol(sym)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  marginBottom: '6px',
                  backgroundColor: isActive ? 'var(--color-accent-glow)' : 'transparent',
                  border: isActive ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                className={!isActive ? 'watchlist-item-hover' : ''}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: isActive ? 'var(--text-primary)' : 'var(--text-primary)' }}>
                    {sym.ticker}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sym.name}
                  </span>
                </div>
                <span 
                  style={{ 
                    fontSize: '9px', 
                    fontWeight: 700, 
                    padding: '2px 6px', 
                    borderRadius: '4px', 
                    background: sym.type === 'CRYPTO' ? 'rgba(6, 182, 212, 0.12)' : 'rgba(142, 157, 191, 0.1)',
                    color: sym.type === 'CRYPTO' ? 'var(--color-cyan)' : 'var(--text-muted)',
                    border: sym.type === 'CRYPTO' ? '1px solid rgba(6, 182, 212, 0.2)' : '1px solid rgba(142, 157, 191, 0.15)'
                  }}
                >
                  {sym.type}
                </span>
              </div>
            );
          })
        )}
      </div>
      
      <style>{`
        .watchlist-item-hover:hover {
          background-color: var(--bg-card);
          border-color: var(--border-color);
        }
      `}</style>
    </div>
  );
}
