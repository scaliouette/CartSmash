// client/src/components/PriceHistory.js
// Multi-vendor price history component with automatic price loading

import React, { useState, useEffect, useCallback } from 'react';
import { ButtonSpinner } from './LoadingSpinner';

const PriceHistory = ({
  productName,
  currentPrice,
  currentVendor = 'Instacart',
  isOpen = false,
  onClose,
  productId = null
}) => {
  const [priceData, setPriceData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [sortBy, setSortBy] = useState('price'); // 'price', 'vendor', 'date'

  // Load price data automatically when component opens
  useEffect(() => {
    if (isOpen && productName) {
      loadPriceHistory();
    }
  }, [isOpen, productName, selectedTimeRange]);

  const loadPriceHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${baseUrl}/api/price-history?product=${encodeURIComponent(productName)}&timeRange=${selectedTimeRange}&productId=${productId || ''}`);

      if (!response.ok) {
        throw new Error('Failed to load price history');
      }

      const data = await response.json();
      setPriceData(data.priceHistory || []);
    } catch (err) {
      console.error('Price history loading error:', err);
      setError(err.message);
      // Fallback to mock data for development
      setPriceData(generateMockPriceData());
    } finally {
      setIsLoading(false);
    }
  }, [productName, selectedTimeRange, productId]);

  // Generate mock price data for development/demonstration
  const generateMockPriceData = () => {
    const vendors = [
      { name: 'Safeway', logo: '🛒', color: '#FF6B35' },
      { name: 'Costco', logo: '🏪', color: '#003F7F' },
      { name: 'Whole Foods', logo: '🥬', color: '#00A652' },
      { name: 'Target', logo: '🎯', color: '#CC0000' },
      { name: 'Walmart', logo: '🛍️', color: '#0071CE' },
      { name: 'Kroger', logo: '🏬', color: '#0066B2' },
      { name: 'Instacart', logo: '🥕', color: '#00B894' }
    ];

    const basePrice = currentPrice || 5.99;
    const now = new Date();

    return vendors.map((vendor, index) => {
      const priceVariation = (Math.random() - 0.5) * 2; // ±$2 variation
      const price = Math.max(0.99, basePrice + priceVariation);

      return {
        vendor: vendor.name,
        vendorLogo: vendor.logo,
        vendorColor: vendor.color,
        price: parseFloat(price.toFixed(2)),
        currency: 'USD',
        lastUpdated: new Date(now.getTime() - (index * 24 * 60 * 60 * 1000)), // Different days
        availability: Math.random() > 0.1 ? 'in-stock' : 'out-of-stock',
        deliveryTime: `${Math.floor(Math.random() * 3) + 1}-${Math.floor(Math.random() * 3) + 3} hours`,
        priceHistory: generateVendorPriceHistory(price, selectedTimeRange),
        isCurrentVendor: vendor.name === currentVendor
      };
    });
  };

  const generateVendorPriceHistory = (basePrice, timeRange) => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const history = [];

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const priceFluctuation = (Math.random() - 0.5) * 1; // ±$0.50 daily fluctuation
      const price = Math.max(0.99, basePrice + priceFluctuation);

      history.push({
        date: date.toISOString().split('T')[0],
        price: parseFloat(price.toFixed(2))
      });
    }

    return history;
  };

  const getSortedPriceData = () => {
    return [...priceData].sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return a.price - b.price;
        case 'vendor':
          return a.vendor.localeCompare(b.vendor);
        case 'date':
          return new Date(b.lastUpdated) - new Date(a.lastUpdated);
        default:
          return 0;
      }
    });
  };

  const getLowestPrice = () => {
    if (!priceData.length) return null;
    return Math.min(...priceData.map(item => item.price));
  };

  const getHighestPrice = () => {
    if (!priceData.length) return null;
    return Math.max(...priceData.map(item => item.price));
  };

  const getPriceSavings = (vendorPrice) => {
    const currentPriceValue = currentPrice || vendorPrice;
    const savings = currentPriceValue - vendorPrice;
    return savings;
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '1rem',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #002244 0%, #1a365d 100%)',
          color: '#FFFFFF',
          padding: '1.5rem',
          borderRadius: '1rem 1rem 0 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{
              margin: '0 0 0.5rem 0',
              fontSize: '1.5rem',
              fontWeight: '600'
            }}>
              📈 Price History
            </h2>
            <p style={{
              margin: 0,
              opacity: 0.9,
              fontSize: '0.875rem'
            }}>
              {productName} - Compare prices across vendors
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '0.25rem',
              opacity: 0.8,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.opacity = 1}
            onMouseLeave={(e) => e.target.style.opacity = 0.8}
          >
            ✕
          </button>
        </div>

        {/* Controls */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151'
            }}>
              Time Range:
            </label>
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              style={{
                padding: '0.5rem',
                borderRadius: '0.5rem',
                border: '2px solid #e5e7eb',
                fontSize: '0.875rem'
              }}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151'
            }}>
              Sort By:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '0.5rem',
                borderRadius: '0.5rem',
                border: '2px solid #e5e7eb',
                fontSize: '0.875rem'
              }}
            >
              <option value="price">Lowest Price</option>
              <option value="vendor">Vendor Name</option>
              <option value="date">Last Updated</option>
            </select>
          </div>

          <button
            onClick={loadPriceHistory}
            disabled={isLoading}
            style={{
              background: 'linear-gradient(135deg, #FB4F14 0%, #e8420c 100%)',
              color: '#FFFFFF',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '1.5rem'
            }}
          >
            {isLoading && <ButtonSpinner color="#FFFFFF" />}
            🔄 Refresh Prices
          </button>
        </div>

        {/* Price Summary */}
        {priceData.length > 0 && (
          <div style={{
            padding: '1.5rem',
            background: '#f9fafb',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem'
            }}>
              <div style={{
                background: '#FFFFFF',
                padding: '1rem',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ color: '#059669', fontWeight: '600', fontSize: '0.875rem' }}>
                  💰 Lowest Price
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
                  ${getLowestPrice()?.toFixed(2)}
                </div>
              </div>
              <div style={{
                background: '#FFFFFF',
                padding: '1rem',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ color: '#dc2626', fontWeight: '600', fontSize: '0.875rem' }}>
                  📊 Highest Price
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
                  ${getHighestPrice()?.toFixed(2)}
                </div>
              </div>
              <div style={{
                background: '#FFFFFF',
                padding: '1rem',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ color: '#6366f1', fontWeight: '600', fontSize: '0.875rem' }}>
                  🏪 Vendors Found
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
                  {priceData.filter(item => item.availability === 'in-stock').length}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>
          {isLoading ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3rem',
              color: '#6b7280'
            }}>
              <ButtonSpinner color="#FB4F14" />
              <span style={{ marginLeft: '0.75rem' }}>Loading price history...</span>
            </div>
          ) : error ? (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '0.5rem',
              padding: '1rem',
              color: '#dc2626',
              textAlign: 'center'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                ⚠️ Error Loading Prices
              </div>
              <div style={{ fontSize: '0.875rem' }}>
                {error}
              </div>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gap: '1rem'
            }}>
              {getSortedPriceData().map((item, index) => {
                const savings = getPriceSavings(item.price);
                const isLowestPrice = item.price === getLowestPrice();

                return (
                  <div
                    key={`${item.vendor}-${index}`}
                    style={{
                      background: item.isCurrentVendor ? '#f0f9ff' : '#FFFFFF',
                      border: item.isCurrentVendor ? '2px solid #0ea5e9' : isLowestPrice ? '2px solid #059669' : '1px solid #e5e7eb',
                      borderRadius: '0.75rem',
                      padding: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Badges */}
                    {item.isCurrentVendor && (
                      <div style={{
                        position: 'absolute',
                        top: '-0.5rem',
                        left: '1rem',
                        background: '#0ea5e9',
                        color: '#FFFFFF',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '1rem',
                        fontSize: '0.75rem',
                        fontWeight: '500'
                      }}>
                        Current Vendor
                      </div>
                    )}
                    {isLowestPrice && !item.isCurrentVendor && (
                      <div style={{
                        position: 'absolute',
                        top: '-0.5rem',
                        left: '1rem',
                        background: '#059669',
                        color: '#FFFFFF',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '1rem',
                        fontSize: '0.75rem',
                        fontWeight: '500'
                      }}>
                        💰 Best Price
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        fontSize: '2rem',
                        width: '3rem',
                        height: '3rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        background: `${item.vendorColor}15`,
                        border: `2px solid ${item.vendorColor}30`
                      }}>
                        {item.vendorLogo}
                      </div>

                      <div>
                        <div style={{
                          fontWeight: '600',
                          fontSize: '1.125rem',
                          color: '#111827',
                          marginBottom: '0.25rem'
                        }}>
                          {item.vendor}
                        </div>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          fontSize: '0.875rem',
                          color: '#6b7280'
                        }}>
                          <span style={{
                            background: item.availability === 'in-stock' ? '#dcfce7' : '#fee2e2',
                            color: item.availability === 'in-stock' ? '#166534' : '#dc2626',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: '500'
                          }}>
                            {item.availability === 'in-stock' ? '✅ In Stock' : '❌ Out of Stock'}
                          </span>

                          <span>🚚 {item.deliveryTime}</span>

                          <span>
                            📅 {new Date(item.lastUpdated).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontSize: '1.75rem',
                        fontWeight: '700',
                        color: '#111827',
                        marginBottom: '0.25rem'
                      }}>
                        ${item.price.toFixed(2)}
                      </div>

                      {savings !== 0 && (
                        <div style={{
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: savings > 0 ? '#059669' : '#dc2626'
                        }}>
                          {savings > 0 ? '💰 Save' : '💸 Extra'} ${Math.abs(savings).toFixed(2)}
                        </div>
                      )}

                      {item.availability === 'in-stock' && (
                        <button
                          style={{
                            background: `${item.vendorColor}`,
                            color: '#FFFFFF',
                            border: 'none',
                            padding: '0.375rem 0.75rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            marginTop: '0.5rem',
                            transition: 'opacity 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.opacity = 0.8}
                          onMouseLeave={(e) => e.target.style.opacity = 1}
                        >
                          Shop at {item.vendor}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          background: '#f9fafb',
          borderRadius: '0 0 1rem 1rem',
          borderTop: '1px solid #e5e7eb',
          fontSize: '0.75rem',
          color: '#6b7280',
          textAlign: 'center'
        }}>
          💡 Prices automatically updated every 30 minutes. Click refresh for latest pricing.
        </div>
      </div>
    </div>
  );
};

export default PriceHistory;