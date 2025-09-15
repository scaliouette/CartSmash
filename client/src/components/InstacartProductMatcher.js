// client/src/components/InstacartProductMatcher.js
// Enhanced Product Matching with Instacart API Confidence Scoring

import React, { useState, useEffect } from 'react';

const InstacartProductMatcher = ({ searchTerm, retailerId, onProductSelect, onClose }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [originalItem, setOriginalItem] = useState(null);

  useEffect(() => {
    if (searchTerm && retailerId) {
      searchProducts();
    }
  }, [searchTerm, retailerId]);

  const searchProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log(`🔍 Searching Instacart for: "${searchTerm}" at retailer: ${retailerId}`);

      const response = await fetch(`/api/instacart/search?q=${encodeURIComponent(searchTerm)}&retailer_id=${retailerId}&limit=10`);
      const data = await response.json();

      if (data.success && data.products) {
        setProducts(data.products);
        setOriginalItem(data.originalItem || { name: searchTerm });
        console.log(`✅ Found ${data.products.length} products with confidence scores`);
      } else {
        setError('No products found matching your search');
      }
    } catch (err) {
      console.error('❌ Search error:', err);
      setError('Failed to search products');
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#10b981'; // Green - Excellent match
    if (confidence >= 0.6) return '#f59e0b'; // Yellow - Good match
    if (confidence >= 0.4) return '#ef4444'; // Red - Fair match
    return '#6b7280'; // Gray - Poor match
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.8) return 'Excellent Match';
    if (confidence >= 0.6) return 'Good Match';
    if (confidence >= 0.4) return 'Fair Match';
    return 'Poor Match';
  };

  const getMatchingDetails = (product, originalItem) => {
    const details = [];

    // Name similarity
    if (product.name && originalItem.name) {
      const nameSimilarity = calculateNameSimilarity(product.name, originalItem.name);
      details.push({
        type: 'Name Match',
        score: nameSimilarity,
        description: `"${product.name}" vs "${originalItem.name}"`
      });
    }

    // Brand matching
    if (product.brand && originalItem.brand) {
      const brandMatch = product.brand.toLowerCase() === originalItem.brand.toLowerCase();
      details.push({
        type: 'Brand Match',
        score: brandMatch ? 1.0 : 0.0,
        description: brandMatch ? `✓ Exact brand: ${product.brand}` : `✗ Different brand: ${product.brand} vs ${originalItem.brand}`
      });
    }

    // Category matching
    if (product.category && originalItem.category) {
      const categoryMatch = product.category.toLowerCase() === originalItem.category.toLowerCase();
      details.push({
        type: 'Category Match',
        score: categoryMatch ? 1.0 : 0.0,
        description: categoryMatch ? `✓ Same category: ${product.category}` : `✗ Different category: ${product.category} vs ${originalItem.category}`
      });
    }

    // Size matching
    if (product.size && originalItem.size) {
      const sizeMatch = product.size === originalItem.size;
      details.push({
        type: 'Size Match',
        score: sizeMatch ? 1.0 : 0.0,
        description: sizeMatch ? `✓ Same size: ${product.size}` : `✗ Different size: ${product.size} vs ${originalItem.size}`
      });
    }

    // Availability
    const availabilityPenalty = product.availability === 'out_of_stock' ? -0.2 : 0.0;
    if (availabilityPenalty !== 0) {
      details.push({
        type: 'Availability',
        score: availabilityPenalty,
        description: '✗ Out of stock (-0.2 penalty)'
      });
    } else {
      details.push({
        type: 'Availability',
        score: 0.0,
        description: '✓ In stock'
      });
    }

    return details;
  };

  const calculateNameSimilarity = (name1, name2) => {
    // Simple word-based similarity calculation
    const words1 = name1.toLowerCase().split(/\s+/);
    const words2 = name2.toLowerCase().split(/\s+/);

    let matchingWords = 0;
    words1.forEach(word1 => {
      if (words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
        matchingWords++;
      }
    });

    return matchingWords / Math.max(words1.length, words2.length);
  };

  if (loading) {
    return (
      <div className="product-matcher-overlay">
        <div className="product-matcher-modal">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <h3>Searching Products...</h3>
            <p>Finding the best matches for "{searchTerm}"</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="product-matcher-overlay">
      <div className="product-matcher-modal">
        <div className="matcher-header">
          <h3>🔍 Product Matches for "{searchTerm}"</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        {error ? (
          <div className="error-state">
            <p>{error}</p>
            <button onClick={searchProducts} className="retry-btn">🔄 Try Again</button>
          </div>
        ) : (
          <div className="products-list">
            {products.map((product, index) => {
              const confidence = product.confidence || 0;
              const matchingDetails = getMatchingDetails(product, originalItem);

              return (
                <div
                  key={product.id || index}
                  className="product-match-card"
                  onClick={() => onProductSelect(product)}
                >
                  <div className="product-info">
                    <div className="product-image">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} />
                      ) : (
                        <div className="no-image">📦</div>
                      )}
                    </div>

                    <div className="product-details">
                      <div className="product-header">
                        <h4 className="product-name">{product.name}</h4>
                        <div className="product-price">${product.price}</div>
                      </div>

                      <div className="product-meta">
                        {product.brand && <span className="brand">🏷️ {product.brand}</span>}
                        {product.size && <span className="size">📏 {product.size}</span>}
                        <span className={`availability ${product.availability === 'in_stock' ? 'in-stock' : 'out-of-stock'}`}>
                          {product.availability === 'in_stock' ? '✅ In Stock' : '❌ Out of Stock'}
                        </span>
                      </div>

                      {product.description && (
                        <p className="product-description">{product.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="confidence-section">
                    <div className="confidence-header">
                      <div
                        className="confidence-score"
                        style={{ color: getConfidenceColor(confidence) }}
                      >
                        {Math.round(confidence * 100)}%
                      </div>
                      <div className="confidence-label">
                        {getConfidenceLabel(confidence)}
                      </div>
                    </div>

                    <div className="confidence-breakdown">
                      <h5>Match Details:</h5>
                      {matchingDetails.map((detail, idx) => (
                        <div key={idx} className="detail-row">
                          <span className="detail-type">{detail.type}:</span>
                          <span
                            className="detail-score"
                            style={{
                              color: detail.score >= 0.5 ? '#10b981' : detail.score < 0 ? '#ef4444' : '#f59e0b'
                            }}
                          >
                            {detail.score >= 0 ? `+${Math.round(detail.score * 100)}%` : `${Math.round(detail.score * 100)}%`}
                          </span>
                          <span className="detail-description">{detail.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="matcher-footer">
          <div className="confidence-legend">
            <h5>Confidence Score Guide:</h5>
            <div className="legend-items">
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#10b981' }}></div>
                <span>80-100%: Excellent Match</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#f59e0b' }}></div>
                <span>60-79%: Good Match</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#ef4444' }}></div>
                <span>40-59%: Fair Match</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#6b7280' }}></div>
                <span>0-39%: Poor Match</span>
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          .product-matcher-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .product-matcher-modal {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            max-width: 900px;
            width: 95%;
            max-height: 90vh;
            overflow-y: auto;
          }

          .matcher-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem;
            border-bottom: 1px solid #e5e7eb;
          }

          .matcher-header h3 {
            margin: 0;
            color: #1f2937;
            font-size: 1.25rem;
          }

          .close-btn {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #6b7280;
            padding: 0.5rem;
            border-radius: 6px;
            transition: all 0.2s ease;
          }

          .close-btn:hover {
            background: #f3f4f6;
            color: #1f2937;
          }

          .loading-state {
            text-align: center;
            padding: 3rem;
          }

          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #f3f4f6;
            border-top: 3px solid #00B14F;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem auto;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .products-list {
            padding: 1rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .product-match-card {
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 1rem;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            gap: 1rem;
          }

          .product-match-card:hover {
            border-color: #00B14F;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 177, 79, 0.1);
          }

          .product-info {
            flex: 1;
            display: flex;
            gap: 1rem;
          }

          .product-image {
            width: 80px;
            height: 80px;
            border-radius: 6px;
            overflow: hidden;
            background: #f3f4f6;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .product-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .no-image {
            font-size: 2rem;
            color: #9ca3af;
          }

          .product-details {
            flex: 1;
          }

          .product-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 0.5rem;
          }

          .product-name {
            margin: 0;
            color: #1f2937;
            font-size: 1rem;
            font-weight: 600;
            flex: 1;
            margin-right: 1rem;
          }

          .product-price {
            color: #059669;
            font-weight: 600;
            font-size: 1.1rem;
          }

          .product-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
            margin-bottom: 0.5rem;
            font-size: 0.875rem;
          }

          .brand, .size {
            color: #4b5563;
          }

          .availability.in-stock {
            color: #10b981;
          }

          .availability.out-of-stock {
            color: #ef4444;
          }

          .product-description {
            margin: 0;
            color: #6b7280;
            font-size: 0.875rem;
            line-height: 1.4;
          }

          .confidence-section {
            min-width: 250px;
            border-left: 1px solid #e5e7eb;
            padding-left: 1rem;
          }

          .confidence-header {
            text-align: center;
            margin-bottom: 1rem;
          }

          .confidence-score {
            font-size: 2rem;
            font-weight: 700;
            line-height: 1;
          }

          .confidence-label {
            font-size: 0.875rem;
            color: #6b7280;
            margin-top: 0.25rem;
          }

          .confidence-breakdown h5 {
            margin: 0 0 0.5rem 0;
            color: #1f2937;
            font-size: 0.875rem;
            font-weight: 600;
          }

          .detail-row {
            display: grid;
            grid-template-columns: auto auto 1fr;
            gap: 0.5rem;
            margin-bottom: 0.25rem;
            font-size: 0.75rem;
            align-items: center;
          }

          .detail-type {
            color: #4b5563;
            font-weight: 500;
          }

          .detail-score {
            font-weight: 600;
            text-align: right;
          }

          .detail-description {
            color: #6b7280;
          }

          .matcher-footer {
            border-top: 1px solid #e5e7eb;
            padding: 1rem 1.5rem;
            background: #f9fafb;
          }

          .confidence-legend h5 {
            margin: 0 0 0.75rem 0;
            color: #1f2937;
            font-size: 0.875rem;
          }

          .legend-items {
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
          }

          .legend-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.75rem;
            color: #4b5563;
          }

          .legend-color {
            width: 12px;
            height: 12px;
            border-radius: 2px;
          }

          .error-state {
            text-align: center;
            padding: 3rem;
            color: #6b7280;
          }

          .retry-btn {
            background: #00B14F;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            cursor: pointer;
            margin-top: 1rem;
            transition: all 0.2s ease;
          }

          .retry-btn:hover {
            background: #059142;
          }

          @media (max-width: 768px) {
            .product-match-card {
              flex-direction: column;
            }

            .confidence-section {
              border-left: none;
              border-top: 1px solid #e5e7eb;
              padding-left: 0;
              padding-top: 1rem;
              min-width: auto;
            }

            .legend-items {
              flex-direction: column;
              gap: 0.5rem;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default InstacartProductMatcher;