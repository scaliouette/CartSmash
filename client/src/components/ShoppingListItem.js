import React from 'react';
import { formatProductName } from '../utils/imageService';
import { useDeviceDetection } from '../hooks/useDeviceDetection';

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
  const { isMobile } = useDeviceDetection();
  const confidence = getConfidenceDisplay(item);
  const isChecked = isSelected;

  // Mobile layout with card-based design
  if (isMobile) {
    return (
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #E0E0E0',
        backgroundColor: isChecked ? '#FFF5F0' : 'white',
        borderLeft: isChecked ? '4px solid #FB4F14' : '4px solid transparent',
        transition: 'all 0.2s ease'
      }}>
        {/* Top Row: Checkbox, Image, Product Info */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          marginBottom: '12px'
        }}>
          {/* Checkbox with larger touch target */}
          <label style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            cursor: 'pointer',
            marginTop: '2px'
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
              width: '24px',
              height: '24px',
              border: `2px solid ${isChecked ? '#FB4F14' : '#d1d5db'}`,
              borderRadius: '6px',
              backgroundColor: isChecked ? '#FB4F14' : 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              boxShadow: isChecked ? '0 2px 4px rgba(251, 79, 20, 0.3)' : 'none'
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
              width: '64px',
              height: '64px',
              borderRadius: '8px',
              objectFit: 'cover',
              border: '1px solid #E0E0E0',
              flexShrink: 0
            }}
          />

          {/* Product Info with proper text handling */}
          <div style={{
            flex: 1,
            minWidth: 0, // Critical for text wrapping
            overflow: 'hidden'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: '600',
              color: '#002244',
              lineHeight: '1.3',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%'
            }}>
              {formatProductName(item.productName || item.name || 'Unknown Item')}
            </h3>
            <p style={{
              margin: '4px 0',
              fontSize: '13px',
              color: '#6B7280',
              lineHeight: '1.2',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {getCategory(item)} • {item.brand ? formatProductName(item.brand) : 'Generic'}
            </p>
            {/* Confidence Badge */}
            <span style={{
              display: 'inline-block',
              fontSize: '11px',
              color: confidence.value > 80 ? '#002244' : '#FB4F14',
              fontWeight: '600',
              backgroundColor: confidence.value > 80 ? '#E6EBF2' : '#FFF5F0',
              border: `1px solid ${confidence.value > 80 ? '#7B9AC8' : '#FFD4C4'}`,
              padding: '2px 6px',
              borderRadius: '4px',
              lineHeight: '1',
              marginTop: '4px'
            }}>
              {confidence.value}% match
            </span>
          </div>
        </div>

        {/* Bottom Row: Quantity Controls, Price, and Actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px'
        }}>
          {/* Quantity Controls with larger touch targets */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#F8F9FA',
            borderRadius: '8px',
            padding: '4px',
            gap: '8px'
          }}>
            <button
              onClick={() => updateQuantity(item.id, -1)}
              disabled={(item.quantity || 1) <= 1}
              style={{
                minWidth: '40px',
                minHeight: '40px',
                border: 'none',
                backgroundColor: (item.quantity || 1) > 1 ? 'white' : 'transparent',
                borderRadius: '6px',
                cursor: (item.quantity || 1) > 1 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: '600',
                color: (item.quantity || 1) > 1 ? '#374151' : '#9CA3AF',
                transition: 'all 0.2s'
              }}
            >
              −
            </button>

            <span style={{
              minWidth: '24px',
              textAlign: 'center',
              fontSize: '16px',
              fontWeight: '600',
              color: '#1F2937'
            }}>
              {item.quantity || 1}
            </span>

            <button
              onClick={() => updateQuantity(item.id, 1)}
              style={{
                minWidth: '40px',
                minHeight: '40px',
                border: 'none',
                backgroundColor: 'white',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: '600',
                color: '#374151',
                transition: 'all 0.2s',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              +
            </button>
          </div>

          {/* Price and Actions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onShowPriceHistory && onShowPriceHistory(item);
              }}
              style={{
                textAlign: 'right',
                cursor: 'pointer',
                transition: 'color 0.2s'
              }}
              title="Click to see price comparison"
            >
              <div style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#002244',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                ${((parseFloat(item.price) || 0) * (item.quantity || 1)).toFixed(2)}
                <span style={{ fontSize: '12px', opacity: 0.7 }}>📊</span>
              </div>
              <div style={{
                fontSize: '12px',
                color: '#9CA3AF',
                fontWeight: '500'
              }}>
                ${(parseFloat(item.price) || 0).toFixed(2)} ea
              </div>
            </div>

            {/* Delete Button with larger touch target */}
            <button
              onClick={() => deleteSingleItem(item.id)}
              style={{
                minWidth: '44px',
                minHeight: '44px',
                backgroundColor: '#FEF2F2',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#DC2626',
                transition: 'all 0.2s',
                border: '1px solid #FECACA'
              }}
              title="Remove item"
            >
              <svg
                width="20"
                height="20"
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
          </div>
        </div>
      </div>
    );
  }

  // Desktop layout (original design)
  return (
    <div style={{
      display: 'flex',
      gap: '16px',
      padding: '16px',
      backgroundColor: isChecked ? '#FFF5F0' : 'white',
      borderBottom: '1px solid #F0F0F0',
      borderLeft: isChecked ? '4px solid #FB4F14' : '4px solid transparent',
      alignItems: 'center',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
      minHeight: '80px'
    }}>
      {/* Left section: Checkbox */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <label style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
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
            width: '24px',
            height: '24px',
            border: `2px solid ${isChecked ? '#FB4F14' : '#d1d5db'}`,
            borderRadius: '6px',
            backgroundColor: isChecked ? '#FB4F14' : 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            boxShadow: isChecked ? '0 2px 4px rgba(251, 79, 20, 0.3)' : 'none'
          }}>
            {isChecked && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
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
      </div>

      {/* Product Image with improved styling */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <img
          src={getProductImage(item)}
          alt={item.productName || item.name}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '10px',
            objectFit: 'cover',
            backgroundColor: '#F8F9FA',
            border: '1px solid #E0E0E0',
            boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
            flexShrink: 0
          }}
        />
      </div>

      {/* Product Info - Improved typography hierarchy */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        minWidth: 0 // Prevent flex item overflow
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '17px',
            fontWeight: '600',
            color: '#002244',
            lineHeight: '1.3',
            wordBreak: 'break-word'
          }}>
            {formatProductName(item.productName || item.name || 'Unknown Item')}
          </h3>
          {/* Refined confidence badge */}
          <span style={{
            fontSize: '11px',
            color: confidence.value > 80 ? '#002244' : '#FB4F14',
            fontWeight: '600',
            backgroundColor: confidence.value > 80 ? '#E6EBF2' : '#FFF5F0',
            border: `1px solid ${confidence.value > 80 ? '#7B9AC8' : '#FFD4C4'}`,
            padding: '3px 7px',
            borderRadius: '5px',
            lineHeight: '1'
          }}>
            {confidence.value}% match
          </span>
        </div>
        <div style={{
          fontSize: '13px',
          color: '#6B7280',
          lineHeight: '1.2'
        }}>
          {getCategory(item)} • {item.brand ? formatProductName(item.brand) : 'Generic'}
        </div>
        {formatUnitDisplay(item) && (
          <span style={{
            display: 'inline-block',
            backgroundColor: '#F3F4F6',
            color: '#374151',
            border: '1px solid #D1D5DB',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: '600',
            width: 'fit-content'
          }}>
            {formatUnitDisplay(item)}
          </span>
        )}
      </div>

      {/* Quantity Controls - Horizontal layout */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        padding: '2px'
      }}>
        <button
          onClick={() => updateQuantity(item.id, -1)}
          disabled={(item.quantity || 1) <= 1}
          style={{
            width: '32px',
            height: '32px',
            border: 'none',
            backgroundColor: (item.quantity || 1) > 1 ? 'white' : 'transparent',
            borderRadius: '6px',
            cursor: (item.quantity || 1) > 1 ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: '600',
            color: (item.quantity || 1) > 1 ? '#374151' : '#9CA3AF',
            transition: 'all 0.2s'
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
            width: '44px',
            textAlign: 'center',
            border: 'none',
            backgroundColor: 'transparent',
            fontSize: '15px',
            fontWeight: '600',
            color: '#1F2937',
            outline: 'none'
          }}
        />

        <button
          onClick={() => updateQuantity(item.id, 1)}
          style={{
            width: '32px',
            height: '32px',
            border: 'none',
            backgroundColor: 'white',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: '600',
            color: '#374151',
            transition: 'all 0.2s',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}
        >
          +
        </button>
      </div>

      {/* Price section - Improved hierarchy */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '2px',
        minWidth: '80px'
      }}>
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onShowPriceHistory && onShowPriceHistory(item);
          }}
          style={{
            fontSize: '18px',
            fontWeight: '700',
            color: '#002244',
            cursor: 'pointer',
            transition: 'color 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          title="Click to see price comparison from all vendors"
          onMouseEnter={(e) => {
            e.target.style.color = '#FB4F14';
          }}
          onMouseLeave={(e) => {
            e.target.style.color = '#002244';
          }}
        >
          ${((parseFloat(item.price) || 0) * (item.quantity || 1)).toFixed(2)}
          <span style={{ fontSize: '14px', opacity: 0.7 }}>📊</span>
        </div>
        <div style={{
          fontSize: '12px',
          color: '#9CA3AF',
          fontWeight: '500'
        }}>
          ${(parseFloat(item.price) || 0).toFixed(2)} ea
        </div>
      </div>

      {/* Delete button - Modern design */}
      <div style={{
        display: 'flex',
        alignItems: 'center'
      }}>
        <button
          onClick={() => deleteSingleItem(item.id)}
          style={{
            width: '36px',
            height: '36px',
            backgroundColor: '#FEF2F2',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#DC2626',
            transition: 'all 0.2s',
            border: '1px solid #FECACA'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#FEE2E2';
            e.target.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#FEF2F2';
            e.target.style.transform = 'scale(1)';
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
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ShoppingListItem;