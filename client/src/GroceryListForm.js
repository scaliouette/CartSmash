import React, { useState, useEffect, useRef } from 'react';
import groceryService from './api/groceryService';
import { parseGroceryList, getCurrentCart, clearCart } from './utils/parseGroceryList';
import ParsedResultsDisplay from './ParsedResultsDisplay';

// Cart Smash SmashButton Component with Cart Actions
const SmashButton = ({ onSmash, isDisabled = false, itemCount = 0, cartAction = 'replace' }) => {
  const [isSmashing, setIsSmashing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [ripples, setRipples] = useState([]);
  const buttonRef = useRef(null);

  const generateConfetti = () => {
    const particles = [];
    const colors = ['#FF6B35', '#F7931E', '#FFD23F', '#06FFA5', '#3A86FF', '#8338EC'];
    
    for (let i = 0; i < 50; i++) {
      particles.push({
        id: i,
        color: colors[Math.floor(Math.random() * colors.length)],
        x: Math.random() * window.innerWidth,
        y: -10,
        vx: (Math.random() - 0.5) * 8,
        vy: Math.random() * 4 + 3,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        scale: Math.random() * 1.2 + 0.6,
        gravity: 0.15,
        life: 1,
      });
    }
    return particles;
  };

  const ConfettiParticle = ({ particle }) => {
    const [pos, setPos] = useState({ x: particle.x, y: particle.y });
    const [rotation, setRotation] = useState(particle.rotation);
    const [opacity, setOpacity] = useState(1);

    useEffect(() => {
      let animationFrame;
      let startTime = Date.now();

      const animate = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed > 4) return;

        const newY = particle.y + particle.vy * elapsed * 60 + 0.5 * particle.gravity * Math.pow(elapsed * 60, 2);
        const newX = particle.x + particle.vx * elapsed * 60;
        const newRotation = particle.rotation + particle.rotationSpeed * elapsed * 60;
        const newOpacity = Math.max(0, 1 - elapsed / 4);

        setPos({ x: newX, y: newY });
        setRotation(newRotation);
        setOpacity(newOpacity);

        if (newY < window.innerHeight + 100 && newOpacity > 0) {
          animationFrame = requestAnimationFrame(animate);
        }
      };

      animationFrame = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animationFrame);
    }, [particle]);

    return (
      <div
        style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          width: '10px',
          height: '10px',
          backgroundColor: particle.color,
          transform: `rotate(${rotation}deg) scale(${particle.scale})`,
          opacity: opacity,
          pointerEvents: 'none',
          zIndex: 9999,
          borderRadius: '3px',
          boxShadow: '0 0 6px rgba(0,0,0,0.3)',
        }}
      />
    );
  };

  const createRipple = (e) => {
    const rect = buttonRef.current.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    const newRipple = { id: Date.now(), x, y, size };
    setRipples(prev => [...prev, newRipple]);
    
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
    }, 1000);
  };

  const triggerHaptic = () => {
    if (navigator.vibrate) {
      navigator.vibrate([150, 50, 150, 50, 200]);
    }
  };

  const playSmashSound = () => {
    if (typeof AudioContext !== 'undefined' || typeof window.webkitAudioContext !== 'undefined') {
      const audioContext = new (AudioContext || window.webkitAudioContext)();
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator1.frequency.setValueAtTime(1000, audioContext.currentTime);
      oscillator1.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.15);
      
      oscillator2.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator2.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
      
      oscillator1.start(audioContext.currentTime);
      oscillator1.stop(audioContext.currentTime + 0.25);
      
      oscillator2.start(audioContext.currentTime + 0.05);
      oscillator2.stop(audioContext.currentTime + 0.3);
    }
  };

  const handleSmash = async (e) => {
    if (isDisabled || isSmashing) return;

    createRipple(e);
    setIsSmashing(true);
    playSmashSound();
    triggerHaptic();
    setShowConfetti(true);
    
    document.body.style.animation = 'cartSmashShake 0.6s ease-in-out';
    
    try {
      await onSmash();
    } catch (error) {
      console.error('Smash error:', error);
    } finally {
      setTimeout(() => {
        setIsSmashing(false);
        setShowConfetti(false);
        document.body.style.animation = '';
      }, 2500);
    }
  };

  const getButtonText = () => {
    if (isSmashing) {
      return cartAction === 'merge' ? '🔀 MERGING...' : '🔄 REPLACING...';
    }
    return cartAction === 'merge' ? '🔀 MERGE WITH CART' : '🛒 SMASH MY LIST';
  };

  const getActionEmoji = () => {
    return cartAction === 'merge' ? '🔀' : '💥';
  };

  return (
    <>
      <style>
        {`
          @keyframes cartSmashShake {
            0%, 100% { transform: translateX(0) translateY(0); }
            10% { transform: translateX(-4px) translateY(-2px); }
            20% { transform: translateX(4px) translateY(2px); }
            30% { transform: translateX(-3px) translateY(-1px); }
            40% { transform: translateX(3px) translateY(1px); }
            50% { transform: translateX(-2px) translateY(-1px); }
            60% { transform: translateX(2px) translateY(1px); }
            70% { transform: translateX(-1px) translateY(0px); }
            80% { transform: translateX(1px) translateY(0px); }
            90% { transform: translateX(0px) translateY(0px); }
          }
          
          @keyframes smashPulse {
            0% { transform: scale(1); }
            25% { transform: scale(1.08); }
            50% { transform: scale(0.95); }
            75% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
          
          @keyframes ripple {
            0% { transform: scale(0); opacity: 0.8; }
            100% { transform: scale(1); opacity: 0; }
          }
        `}
      </style>

      <button
        ref={buttonRef}
        onClick={handleSmash}
        disabled={isDisabled || isSmashing}
        style={{
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
          padding: '24px 48px',
          fontSize: '26px',
          fontWeight: '900',
          color: 'white',
          background: isSmashing 
            ? `linear-gradient(135deg, ${cartAction === 'merge' ? '#4CAF50' : '#FF6B35'}, #F7931E, #FFD23F)`
            : `linear-gradient(135deg, ${cartAction === 'merge' ? '#4CAF50' : '#FF6B35'}, #F7931E)`,
          border: 'none',
          borderRadius: '20px',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          transform: isSmashing ? 'scale(0.92)' : 'scale(1)',
          transition: 'all 0.2s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          boxShadow: isSmashing 
            ? `inset 0 6px 12px rgba(0,0,0,0.4), 0 12px 48px rgba(${cartAction === 'merge' ? '76,175,80' : '255,107,53'},0.6)`
            : `0 8px 32px rgba(${cartAction === 'merge' ? '76,175,80' : '255,107,53'},0.4), 0 4px 16px rgba(0,0,0,0.1)`,
          backgroundSize: '300% 300%',
          animation: isSmashing ? 'smashPulse 0.5s ease-in-out infinite' : 'none',
          opacity: isDisabled ? 0.6 : 1,
          textShadow: '3px 3px 6px rgba(0,0,0,0.4)',
          letterSpacing: '2px',
          textTransform: 'uppercase',
        }}
        onMouseEnter={(e) => {
          if (!isDisabled && !isSmashing) {
            e.target.style.backgroundPosition = '100% 0';
            e.target.style.transform = 'scale(1.05)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isDisabled && !isSmashing) {
            e.target.style.backgroundPosition = '0% 0';
            e.target.style.transform = 'scale(1)';
          }
        }}
      >
        {ripples.map(ripple => (
          <span
            key={ripple.id}
            style={{
              position: 'absolute',
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
              height: ripple.size,
              background: 'rgba(255,255,255,0.7)',
              borderRadius: '50%',
              animation: 'ripple 1s ease-out',
              pointerEvents: 'none',
            }}
          />
        ))}
        
        <span style={{ position: 'relative', zIndex: 1 }}>
          {getButtonText()}
          {itemCount > 0 && !isSmashing && (
            <div style={{ 
              fontSize: '14px', 
              marginTop: '4px',
              opacity: 0.9,
              fontWeight: '600',
              letterSpacing: '1px',
            }}>
              {itemCount} ITEMS READY
            </div>
          )}
        </span>
      </button>

      {showConfetti && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          pointerEvents: 'none', 
          zIndex: 9999 
        }}>
          {generateConfetti().map((particle) => (
            <ConfettiParticle key={particle.id} particle={particle} />
          ))}
        </div>
      )}

      {isSmashing && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: `rgba(${cartAction === 'merge' ? '76,175,80' : '255,107,53'}, 0.98)`,
          color: 'white',
          padding: '32px 48px',
          borderRadius: '20px',
          fontSize: '32px',
          fontWeight: '900',
          zIndex: 10000,
          textAlign: 'center',
          animation: 'smashPulse 0.6s ease-in-out infinite',
          boxShadow: '0 16px 64px rgba(0,0,0,0.4)',
          border: '3px solid rgba(255,255,255,0.3)',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
          letterSpacing: '2px',
        }}>
          <div>{getActionEmoji()} CART SMASH ACTIVATED! {getActionEmoji()}</div>
          <div style={{ 
            fontSize: '18px', 
            marginTop: '12px', 
            opacity: 0.9,
            fontWeight: '600',
            letterSpacing: '1px',
          }}>
            {cartAction === 'merge' ? 'MERGING WITH CART...' : 'REPLACING CART...'}
          </div>
        </div>
      )}
    </>
  );
};

function GroceryListForm() {
  const [listText, setListText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedItems, setParsedItems] = useState([]);
  const [currentCart, setCurrentCart] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [apiStatus, setApiStatus] = useState('checking');
  const [cartAction, setCartAction] = useState('replace');

  // Check API health and load current cart
  useEffect(() => {
    checkApiHealth();
    loadCurrentCart();
  }, []);

  const checkApiHealth = async () => {
    try {
      await groceryService.checkHealth();
      setApiStatus('connected');
    } catch (err) {
      setApiStatus('disconnected');
      setError('Cannot connect to server. Please ensure the backend is running on port 3001.');
    }
  };

  const loadCurrentCart = async () => {
    try {
      const cart = await getCurrentCart();
      setCurrentCart(cart);
    } catch (err) {
      console.error('Failed to load current cart:', err);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    
    if (!listText.trim()) {
      setError('Please enter a grocery list');
      return;
    }

    setIsProcessing(true);

    try {
      const result = await parseGroceryList(listText, cartAction);
      
      setParsedItems(result.cart);
      setCurrentCart(result.cart);
      
      // Show success message
      const actionText = cartAction === 'merge' ? 'merged with' : 'replaced';
      const duplicateText = result.duplicatesSkipped > 0 ? ` (${result.duplicatesSkipped} duplicates skipped)` : '';
      setSuccess(`✅ Successfully ${actionText} cart! ${result.itemsAdded} items added${duplicateText}`);

      console.log(`Cart ${cartAction}:`, result);
    } catch (err) {
      setError(err.message || `Error ${cartAction === 'merge' ? 'merging with' : 'replacing'} cart. Please try again.`);
      console.error('Error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setListText('');
    setParsedItems([]);
    setError('');
    setSuccess('');
  };

  const handleClearCart = async () => {
    try {
      await clearCart();
      setCurrentCart([]);
      setParsedItems([]);
      setSuccess('🗑️ Cart cleared successfully!');
    } catch (err) {
      setError('Failed to clear cart');
    }
  };

  const sampleList = `2 lbs organic bananas
1 container Greek yogurt
3 chicken breasts
1 loaf artisan bread
2 fresh avocados
1 dozen free-range eggs
2 cans black beans
1 bag frozen broccoli
Olive oil
Pasta sauce
Cheddar cheese
Fresh spinach`;

  const getStatusColor = () => {
    switch (apiStatus) {
      case 'connected': return '#FF6B35';
      case 'disconnected': return '#dc3545';
      default: return '#ffc107';
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.apiStatus}>
        <span style={{...styles.statusDot, backgroundColor: getStatusColor()}}></span>
        API Status: {apiStatus}
      </div>
      
      {currentCart.length > 0 && (
        <div style={styles.cartSummary}>
          <div style={styles.cartInfo}>
            <span>🛒 Current Cart: {currentCart.length} items</span>
            <button onClick={handleClearCart} style={styles.clearCartButton}>
              🗑️ Clear Cart
            </button>
          </div>
        </div>
      )}
      
      <div style={styles.formSection}>
        <h2 style={styles.title}>🛒 Paste Your Grocery List</h2>
        <p style={styles.subtitle}>
          Ready to <strong>SMASH</strong> through your shopping list? Choose your action and watch the magic happen! 💥
        </p>
        
        <div style={styles.actionSelector}>
          <label style={styles.actionOption}>
            <input
              type="radio"
              name="cartAction"
              value="replace"
              checked={cartAction === 'replace'}
              onChange={(e) => setCartAction(e.target.value)}
              disabled={isProcessing}
            />
            <span style={styles.actionLabel}>
              🔄 <strong>Replace Cart</strong> - Clear cart and add new items
            </span>
          </label>
          
          <label style={styles.actionOption}>
            <input
              type="radio"
              name="cartAction"
              value="merge"
              checked={cartAction === 'merge'}
              onChange={(e) => setCartAction(e.target.value)}
              disabled={isProcessing}
            />
            <span style={styles.actionLabel}>
              🔀 <strong>Merge with Cart</strong> - Add new items, skip duplicates
            </span>
          </label>
        </div>
        
        <form onSubmit={(e) => e.preventDefault()}>
          <textarea
            value={listText}
            onChange={(e) => setListText(e.target.value)}
            placeholder={`Paste your grocery list here and prepare for SMASH mode...

Example:
2 lbs organic bananas
1 container Greek yogurt
3 chicken breasts
1 loaf artisan bread`}
            style={styles.textarea}
            rows={10}
            disabled={isProcessing || apiStatus === 'disconnected'}
          />
          
          <div style={styles.buttonGroup}>
            <SmashButton
              onSmash={handleSubmit}
              isDisabled={!listText.trim() || isProcessing || apiStatus === 'disconnected'}
              itemCount={listText.split('\n').filter(line => line.trim()).length}
              cartAction={cartAction}
            />
            
            <div style={styles.secondaryButtons}>
              <button 
                type="button" 
                onClick={handleClear}
                style={{...styles.button, ...styles.clearButton}}
                disabled={isProcessing}
              >
                🗑️ Clear
              </button>
              
              <button 
                type="button" 
                onClick={() => setListText(sampleList)}
                style={{...styles.button, ...styles.sampleButton}}
                disabled={isProcessing}
              >
                📋 Try Sample
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div style={styles.error}>
            ❌ {error}
          </div>
        )}

        {success && (
          <div style={styles.success}>
            {success}
          </div>
        )}
      </div>

      {parsedItems.length > 0 && (
        <ParsedResultsDisplay
          items={parsedItems}
          onItemEdit={() => {}}
          onItemRemove={() => {}}
          onAddToCart={() => {}}
        />
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
  },
  cartSummary: {
    backgroundColor: '#e8f5e9',
    border: '2px solid #4CAF50',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
  },
  cartInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontWeight: '600',
    color: '#2e7d32',
  },
  clearCartButton: {
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  formSection: {
    backgroundColor: '#ffffff',
    padding: '40px',
    borderRadius: '20px',
    boxShadow: '0 8px 32px rgba(255,107,53,0.1), 0 2px 16px rgba(0,0,0,0.05)',
    border: '2px solid rgba(255,107,53,0.1)',
  },
  title: {
    color: '#2c3e50',
    marginBottom: '16px',
    fontSize: '32px',
    fontWeight: '800',
    textAlign: 'center',
    background: 'linear-gradient(135deg, #FF6B35, #F7931E)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    color: '#666',
    marginBottom: '30px',
    fontSize: '18px',
    textAlign: 'center',
    lineHeight: '1.5',
  },
  actionSelector: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
    border: '2px solid #e9ecef',
  },
  actionOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  actionLabel: {
    fontSize: '16px',
    lineHeight: '1.4',
  },
  textarea: {
    width: '100%',
    padding: '20px',
    fontSize: '16px',
    border: '3px solid #f0f0f0',
    borderRadius: '16px',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '240px',
    transition: 'border-color 0.3s, box-shadow 0.3s',
    boxSizing: 'border-box',
    backgroundColor: '#fafafa',
    lineHeight: '1.5',
  },
  buttonGroup: {
    marginTop: '24px',
  },
  secondaryButtons: {
    display: 'flex',
    gap: '12px',
    marginTop: '16px',
    justifyContent: 'center',
  },
  button: {
    padding: '12px 24px',
    fontSize: '16px',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'all 0.3s',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  clearButton: {
    backgroundColor: '#dc3545',
    color: 'white',
  },
  sampleButton: {
    backgroundColor: '#6c757d',
    color: 'white',
  },
  error: {
    marginTop: '20px',
    padding: '16px',
    backgroundColor: '#fee',
    color: '#c33',
    borderRadius: '12px',
    border: '2px solid #fcc',
    textAlign: 'center',
    fontWeight: '600',
  },
  success: {
    marginTop: '20px',
    padding: '16px',
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    borderRadius: '12px',
    border: '2px solid #4caf50',
    textAlign: 'center',
    fontWeight: '600',
  },
  apiStatus: {
    position: 'fixed',
    top: '16px',
    right: '16px',
    padding: '8px 16px',
    backgroundColor: 'white',
    borderRadius: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    zIndex: 1000,
    border: '1px solid rgba(255,107,53,0.2)',
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    display: 'inline-block',
  },
};

export default GroceryListForm;