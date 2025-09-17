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
      alignItems: 'flex-start',
      padding: '12px',
      backgroundColor: 'white',
      borderBottom: '1px solid #e5e5e5',
      gap: '12px',
      position: 'relative'
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
            checked={isSelected}
            onChange={() => onSelect(item.id)}
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
            backgroundColor: isSelected ? '#3b82f6' : 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}>
            {isSelected && (
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
          src={item.image}
          alt={item.name}
          style={{
            width: '60px',
            height: '60px',
            objectFit: 'cover',
            borderRadius: '8px'
          }}
        />

        {/* Quantity Controls underneath */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#f3f4f6',
          borderRadius: '6px',
          padding: '2px'
        }}>
          <button
            onClick={() => handleQuantityChange(quantity - 1)}
            disabled={quantity <= 0}
            style={{
              width: '24px',
              height: '24px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: quantity > 0 ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              color: quantity > 0 ? '#374151' : '#9ca3af'
            }}
          >
            −
          </button>

          <input
            type="text"
            value={quantity}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 0;
              handleQuantityChange(val);
            }}
            style={{
              width: '30px',
              textAlign: 'center',
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: '14px',
              fontWeight: '600'
            }}
          />

          <button
            onClick={() => handleQuantityChange(quantity + 1)}
            style={{
              width: '24px',
              height: '24px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              color: '#374151'
            }}
          >
            +
          </button>
        </div>
      </div>

      {/* Middle section: Product Info */}
      <div style={{
        flex: 1,
        paddingTop: '4px'
      }}>
        <div style={{
          fontWeight: '600',
          fontSize: '14px',
          marginBottom: '4px',
          color: '#111'
        }}>
          {item.name}
          {item.match && (
            <span style={{
              marginLeft: '8px',
              color: '#dc2626',
              fontSize: '11px',
              fontWeight: 'normal'
            }}>
              {item.match}% match
            </span>
          )}
        </div>
        <div style={{
          color: '#6b7280',
          fontSize: '12px',
          marginBottom: '6px'
        }}>
          {item.category} • {item.type}
        </div>
        {item.size && (
          <span style={{
            display: 'inline-block',
            backgroundColor: '#ff6b35',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '500'
          }}>
            {item.size}
          </span>
        )}
      </div>

      {/* Right section: Delete button at top, price below */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px',
        paddingTop: '4px'
      }}>
        {/* Delete button at top right */}
        <button
          onClick={() => onDelete(item.id)}
          style={{
            width: '28px',
            height: '28px',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444',
            padding: '4px',
            borderRadius: '4px',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#fee2e2';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
          }}
          title="Remove item"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
          </svg>
        </button>

        {/* Price underneath delete button */}
        <div style={{
          textAlign: 'right',
          marginTop: 'auto'
        }}>
          <div style={{
            fontWeight: 'bold',
            fontSize: '16px',
            color: '#111'
          }}>
            ${(item.price * quantity).toFixed(2)}
          </div>
          <div style={{
            fontSize: '11px',
            color: '#6b7280'
          }}>
            ${item.price.toFixed(2)} ea
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShoppingListItem;