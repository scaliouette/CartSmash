import React from 'react';
import { formatProductName } from '../utils/imageService';

const ShoppingListItem = ({
  item,
  onQuantityChange,
  onDelete,
  onSelect,
  isSelected,
  getProductImage,
  getConfidenceDisplay,
  getCategory,
  formatUnitDisplay,
  updateQuantity,
  setQuantity,
  deleteSingleItem,
  toggleItemSelection,
  onShowPriceHistory
}) => {
  const confidence = getConfidenceDisplay(item);
  const isChecked = isSelected;

  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      padding: '12px',
      backgroundColor: isChecked ? '#FFF5F2' : 'white',
      borderBottom: '1px solid #E5E5E5',
      borderLeft: isChecked ? '3px solid #FB4F14' : 'none',
      alignItems: 'flex-start'
    }}>
      {/* Left section: Checkbox, Image, and Quantity below */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px'
      }}>
        {/* Checkbox with checkmark */}
        <label style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '22px',
          height: '22px',
          cursor: 'pointer'
        }}>
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => toggleItemSelection(item.id)}
            style={{
              position: 'absolute',
              opacity: 0,
              width: '100%',
              height: '100%',
              cursor: 'pointer'
            }}
          />
          <div style={{
            width: '22px',
            height: '22px',
            border: '2px solid #d1d5db',
            borderRadius: '4px',
            backgroundColor: isChecked ? '#3b82f6' : 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}>
            {isChecked && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        </label>

        {/* Product Image */}
        <img
          src={getProductImage(item)}
          alt={item.productName || item.name}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '8px',
            objectFit: 'cover',
            backgroundColor: '#F5F5F5',
            flexShrink: 0
          }}
        />

        {/* Quantity Controls underneath */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          padding: '4px'
        }}>
          <button
            onClick={() => updateQuantity(item.id, -1)}
            disabled={(item.quantity || 1) <= 1}
            style={{
              width: '28px',
              height: '28px',
              border: 'none',
              backgroundColor: (item.quantity || 1) > 1 ? 'white' : 'transparent',
              borderRadius: '4px',
              cursor: (item.quantity || 1) > 1 ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              color: (item.quantity || 1) > 1 ? '#111' : '#9ca3af'
            }}
          >
            −
          </button>

          <input
            type="text"
            value={item.quantity || 1}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 0;
              setQuantity(item.id, val);
            }}
            style={{
              width: '40px',
              textAlign: 'center',
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: '14px',
              fontWeight: '600'
            }}
          />

          <button
            onClick={() => updateQuantity(item.id, 1)}
            style={{
              width: '28px',
              height: '28px',
              border: 'none',
              backgroundColor: 'white',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              color: '#111'
            }}
          >
            +
          </button>
        </div>
      </div>

      {/* Middle section: Product Info */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        <div style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#002244',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          {formatProductName(item.productName || item.name || 'Unknown Item')}
          <span style={{
            fontSize: '12px',
            color: '#FB4F14',
            fontWeight: '500',
            backgroundColor: '#FFF5F2',
            padding: '2px 6px',
            borderRadius: '4px'
          }}>
            {confidence.value}% match
          </span>
        </div>
        <div style={{
          fontSize: '14px',
          color: '#666'
        }}>
          {getCategory(item)} • {item.brand ? formatProductName(item.brand) : 'Generic'}
        </div>
        {formatUnitDisplay(item) && (
          <span style={{
            display: 'inline-block',
            backgroundColor: '#FB4F14',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '600',
            marginTop: '4px',
            width: 'fit-content'
          }}>
            {formatUnitDisplay(item)}
          </span>
        )}
      </div>

      {/* Right section: Price and Delete button */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px',
        paddingTop: '4px'
      }}>
        {/* Delete button at top right */}
        <button
          onClick={() => deleteSingleItem(item.id)}
          style={{
            width: '32px',
            height: '32px',
            border: 'none',
            backgroundColor: '#fee2e2',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#dc2626',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#fecaca';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#fee2e2';
          }}
          title="Remove item"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        </button>

        {/* Price underneath delete button */}
        <div style={{
          textAlign: 'right',
          minWidth: '60px'
        }}>
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onShowPriceHistory && onShowPriceHistory(item);
            }}
            style={{
              fontWeight: 'bold',
              fontSize: '16px',
              color: '#111',
              cursor: 'pointer',
              marginBottom: '2px'
            }}
            title="Click to see price comparison from all vendors"
          >
            ${((parseFloat(item.price) || 0) * (item.quantity || 1)).toFixed(2)} 📊
          </div>
          <div style={{
            fontSize: '12px',
            color: '#666'
          }}>
            ${(parseFloat(item.price) || 0).toFixed(2)} ea
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShoppingListItem;