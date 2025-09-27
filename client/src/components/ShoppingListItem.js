import React, { useState } from 'react';
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
  const [showImageModal, setShowImageModal] = useState(false);
  const confidence = getConfidenceDisplay(item);
  const isChecked = isSelected;
  const imageUrl = getProductImage(item);

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

          {/* Product Image with click to enlarge */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              setShowImageModal(true);
            }}
            style={{
              position: 'relative',
              cursor: 'zoom-in',
              flexShrink: 0
            }}
            title="Click to enlarge"
          >
            <img
              src={imageUrl || 'data:image/svg+xml;charset=utf-8,%3Csvg width="64" height="64" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="64" height="64" fill="%239E9E9E"/%3E%3Ctext x="32" y="32" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="white"%3EI%3C/text%3E%3C/svg%3E'}
              alt={item.productName || item.name}
              onError={(e) => {
                e.target.src = 'data:image/svg+xml;charset=utf-8,%3Csvg width="64" height="64" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="64" height="64" fill="%239E9E9E"/%3E%3Ctext x="32" y="32" font-family="Arial, sans-serif" font-size="24" font-weight="bold" text-anchor="middle" fill="white"%3EI%3C/text%3E%3C/svg%3E';
              }}
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '8px',
                objectFit: 'cover',
                border: '1px solid #E0E0E0'
              }}
            />
            <div style={{
              position: 'absolute',
              bottom: '2px',
              right: '2px',
              backgroundColor: 'rgba(0,0,0,0.6)',
              borderRadius: '4px',
              padding: '2px 4px'
            }}>
              <span style={{ fontSize: '10px', color: 'white' }}>🔍</span>
            </div>
          </div>

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
              {item.aisle && ` • Aisle: ${item.aisle}`}
              {item.price && ` • $${typeof item.price === 'number' ? item.price.toFixed(2) : item.price}`}
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
          {/* Additional Spoonacular information if available */}
          {item.spoonacularData && (
            <div style={{
              fontSize: '11px',
              color: '#6B7280',
              marginTop: '2px'
            }}>
              {item.spoonacularData.badges && item.spoonacularData.badges.length > 0 && (
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {item.spoonacularData.badges.slice(0, 3).map((badge, idx) => (
                    <span key={idx} style={{
                      backgroundColor: '#E6F4EA',
                      color: '#1E7E34',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      fontSize: '10px'
                    }}>
                      {badge}
                    </span>
                  ))}
                </div>
              )}
              {item.spoonacularData.nutrition && (
                <div style={{ marginTop: '2px' }}>
                  {item.spoonacularData.nutrition.calories && (
                    <span>Cal: {item.spoonacularData.nutrition.calories}</span>
                  )}
                  {item.spoonacularData.nutrition.protein && (
                    <span> • Protein: {item.spoonacularData.nutrition.protein}g</span>
                  )}
                </div>
              )}
            </div>
          )}
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

      {/* Image Modal for Mobile */}
      {showImageModal && (
        <div
          onClick={() => setShowImageModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '16px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#002244' }}>
                {formatProductName(item.productName || item.name)}
              </h3>
              <button
                onClick={() => setShowImageModal(false)}
                style={{
                  border: 'none',
                  backgroundColor: '#F3F4F6',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ✕
              </button>
            </div>
            <img
              src={imageUrl || 'data:image/svg+xml;charset=utf-8,%3Csvg width="400" height="400" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="400" height="400" fill="%239E9E9E"/%3E%3Ctext x="200" y="200" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="white"%3ENO IMAGE%3C/text%3E%3C/svg%3E'}
              alt={item.productName || item.name}
              style={{
                maxWidth: '100%',
                maxHeight: '60vh',
                objectFit: 'contain',
                borderRadius: '8px'
              }}
            />
            {/* Additional Product Details */}
            <div style={{
              fontSize: '14px',
              color: '#6B7280',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div><strong>Category:</strong> {getCategory(item)}</div>
              <div><strong>Brand:</strong> {item.brand || 'Generic'}</div>
              <div><strong>Price:</strong> ${(parseFloat(item.price) || 0).toFixed(2)}</div>
              <div><strong>Quantity:</strong> {item.quantity || 1} {formatUnitDisplay(item) || ''}</div>
              <div><strong>Match Confidence:</strong> {confidence.value}%</div>
              {item.spoonacularData && (
                <>
                  {item.spoonacularData.badges && item.spoonacularData.badges.length > 0 && (
                    <div>
                      <strong>Badges:</strong> {item.spoonacularData.badges.join(', ')}
                    </div>
                  )}
                  {item.spoonacularData.nutrition && (
                    <div>
                      <strong>Nutrition:</strong>
                      {item.spoonacularData.nutrition.calories && ` Calories: ${item.spoonacularData.nutrition.calories}`}
                      {item.spoonacularData.nutrition.protein && `, Protein: ${item.spoonacularData.nutrition.protein}g`}
                      {item.spoonacularData.nutrition.fat && `, Fat: ${item.spoonacularData.nutrition.fat}g`}
                      {item.spoonacularData.nutrition.carbs && `, Carbs: ${item.spoonacularData.nutrition.carbs}g`}
                    </div>
                  )}
                  {item.spoonacularData.aisle && (
                    <div><strong>Store Aisle:</strong> {item.spoonacularData.aisle}</div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    );
  }

  // Desktop layout (original design)

  return (
    <>
    <div style={{
      display: 'flex',
      gap: '16px',
      padding: '16px',
      backgroundColor: isChecked ? '#FFF5F0' : 'white',
      borderBottom: '1px solid #F0F0F0',
      borderLeft: isChecked ? '4px solid #FB4F14' : '4px solid transparent',
      alignItems: 'center',
      transition: 'all 0.2s ease',
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

      {/* Product Image with click to enlarge */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          setShowImageModal(true);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          cursor: 'zoom-in'
        }}
        title="Click to enlarge"
      >
        <img
          src={imageUrl || 'data:image/svg+xml;charset=utf-8,%3Csvg width="56" height="56" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="56" height="56" fill="%239E9E9E"/%3E%3Ctext x="28" y="28" font-family="Arial, sans-serif" font-size="20" font-weight="bold" text-anchor="middle" fill="white"%3EI%3C/text%3E%3C/svg%3E'}
          alt={item.productName || item.name}
          onError={(e) => {
            e.target.src = 'data:image/svg+xml;charset=utf-8,%3Csvg width="56" height="56" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="56" height="56" fill="%239E9E9E"/%3E%3Ctext x="28" y="28" font-family="Arial, sans-serif" font-size="20" font-weight="bold" text-anchor="middle" fill="white"%3EI%3C/text%3E%3C/svg%3E';
          }}
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
        <div style={{
          position: 'absolute',
          bottom: '2px',
          right: '2px',
          backgroundColor: 'rgba(0,0,0,0.6)',
          borderRadius: '4px',
          padding: '2px 4px'
        }}>
          <span style={{ fontSize: '10px', color: 'white' }}>🔍</span>
        </div>
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
        {/* Additional Spoonacular information if available */}
        {item.spoonacularData && (
          <div style={{
            fontSize: '11px',
            color: '#6B7280',
            marginTop: '4px',
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap'
          }}>
            {item.spoonacularData.badges && item.spoonacularData.badges.length > 0 && (
              item.spoonacularData.badges.slice(0, 3).map((badge, idx) => (
                <span key={idx} style={{
                  backgroundColor: '#E6F4EA',
                  color: '#1E7E34',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: '500'
                }}>
                  {badge}
                </span>
              ))
            )}
            {item.spoonacularData.nutrition && item.spoonacularData.nutrition.calories && (
              <span style={{
                backgroundColor: '#FEF3C7',
                color: '#92400E',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: '500'
              }}>
                {item.spoonacularData.nutrition.calories} cal
              </span>
            )}
            {item.spoonacularData.aisle && (
              <span style={{
                backgroundColor: '#E0E7FF',
                color: '#3730A3',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: '500'
              }}>
                Aisle: {item.spoonacularData.aisle}
              </span>
            )}
          </div>
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

    {/* Image Modal for Desktop */}
    {showImageModal && (
      <div
        onClick={() => setShowImageModal(false)}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '40px'
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '800px',
            maxHeight: '90vh',
            display: 'flex',
            gap: '24px',
            overflow: 'auto'
          }}
        >
          <div style={{ flex: '1 1 50%' }}>
            <img
              src={imageUrl || 'data:image/svg+xml;charset=utf-8,%3Csvg width="400" height="400" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="400" height="400" fill="%239E9E9E"/%3E%3Ctext x="200" y="200" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="white"%3ENO IMAGE%3C/text%3E%3C/svg%3E'}
              alt={item.productName || item.name}
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '400px',
                objectFit: 'contain',
                borderRadius: '12px',
                border: '1px solid #E0E0E0'
              }}
            />
          </div>
          <div style={{ flex: '1 1 50%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'start'
            }}>
              <h2 style={{ margin: 0, fontSize: '24px', color: '#002244', flex: 1 }}>
                {formatProductName(item.productName || item.name)}
              </h2>
              <button
                onClick={() => setShowImageModal(false)}
                style={{
                  border: 'none',
                  backgroundColor: '#F3F4F6',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500'
                }}
              >
                Close
              </button>
            </div>

            {/* Product Details Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '12px',
              fontSize: '15px',
              color: '#374151'
            }}>
              <strong>Category:</strong>
              <span>{getCategory(item)}</span>

              <strong>Brand:</strong>
              <span>{item.brand || 'Generic'}</span>

              <strong>Price:</strong>
              <span>${(parseFloat(item.price) || 0).toFixed(2)} each</span>

              <strong>Quantity:</strong>
              <span>{item.quantity || 1} {formatUnitDisplay(item) || 'units'}</span>

              <strong>Total:</strong>
              <span style={{ fontSize: '18px', color: '#002244', fontWeight: '600' }}>
                ${((parseFloat(item.price) || 0) * (item.quantity || 1)).toFixed(2)}
              </span>

              <strong>Match:</strong>
              <span>
                <span style={{
                  backgroundColor: confidence.value > 80 ? '#E6F4EA' : '#FEF2F2',
                  color: confidence.value > 80 ? '#1E7E34' : '#DC2626',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: '600'
                }}>
                  {confidence.value}% Confidence
                </span>
              </span>
            </div>

            {/* Spoonacular Data if available */}
            {item.spoonacularData && (
              <div style={{
                borderTop: '1px solid #E5E7EB',
                paddingTop: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#002244' }}>
                  Additional Information
                </h3>

                {item.spoonacularData.badges && item.spoonacularData.badges.length > 0 && (
                  <div>
                    <strong style={{ fontSize: '14px', color: '#6B7280' }}>Product Badges:</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                      {item.spoonacularData.badges.map((badge, idx) => (
                        <span key={idx} style={{
                          backgroundColor: '#E6F4EA',
                          color: '#1E7E34',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '500'
                        }}>
                          ✓ {badge}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {item.spoonacularData.nutrition && (
                  <div>
                    <strong style={{ fontSize: '14px', color: '#6B7280' }}>Nutritional Information:</strong>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '8px',
                      marginTop: '6px'
                    }}>
                      {item.spoonacularData.nutrition.calories && (
                        <div style={{
                          backgroundColor: '#FEF3C7',
                          padding: '8px',
                          borderRadius: '6px',
                          fontSize: '13px'
                        }}>
                          <strong>Calories:</strong> {item.spoonacularData.nutrition.calories}
                        </div>
                      )}
                      {item.spoonacularData.nutrition.protein && (
                        <div style={{
                          backgroundColor: '#DBEAFE',
                          padding: '8px',
                          borderRadius: '6px',
                          fontSize: '13px'
                        }}>
                          <strong>Protein:</strong> {item.spoonacularData.nutrition.protein}g
                        </div>
                      )}
                      {item.spoonacularData.nutrition.fat && (
                        <div style={{
                          backgroundColor: '#FEE2E2',
                          padding: '8px',
                          borderRadius: '6px',
                          fontSize: '13px'
                        }}>
                          <strong>Fat:</strong> {item.spoonacularData.nutrition.fat}g
                        </div>
                      )}
                      {item.spoonacularData.nutrition.carbs && (
                        <div style={{
                          backgroundColor: '#F3E8FF',
                          padding: '8px',
                          borderRadius: '6px',
                          fontSize: '13px'
                        }}>
                          <strong>Carbs:</strong> {item.spoonacularData.nutrition.carbs}g
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {item.spoonacularData.aisle && (
                  <div>
                    <strong style={{ fontSize: '14px', color: '#6B7280' }}>Store Location:</strong>
                    <div style={{
                      backgroundColor: '#E0E7FF',
                      color: '#3730A3',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      marginTop: '6px',
                      display: 'inline-block'
                    }}>
                      📍 {item.spoonacularData.aisle}
                    </div>
                  </div>
                )}

                {item.spoonacularData.description && (
                  <div>
                    <strong style={{ fontSize: '14px', color: '#6B7280' }}>Description:</strong>
                    <p style={{
                      fontSize: '13px',
                      color: '#4B5563',
                      lineHeight: '1.5',
                      marginTop: '6px'
                    }}>
                      {item.spoonacularData.description}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default ShoppingListItem;