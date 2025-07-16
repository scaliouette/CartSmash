# update-grocery-form.ps1 - Windows PowerShell version for Cart Smash
# Run with: powershell -ExecutionPolicy Bypass -File update-grocery-form.ps1

Write-Host "🛒💥 Updating GroceryListForm.js for Cart Smash..." -ForegroundColor Yellow

# Define the file path
$FormFile = "client\src\GroceryListForm.js"

# Check if file exists
if (-Not (Test-Path $FormFile)) {
    Write-Host "❌ Error: $FormFile not found!" -ForegroundColor Red
    Write-Host "Make sure you're running this from the project root directory." -ForegroundColor Red
    exit 1
}

# Create backup
Copy-Item $FormFile "$FormFile.backup"
Write-Host "📋 Created backup: $FormFile.backup" -ForegroundColor Green

# Create the updated GroceryListForm.js content
$UpdatedContent = @'
import React, { useState, useEffect, useRef } from 'react';
import groceryService from './api/groceryService';
import ParsedResultsDisplay from './ParsedResultsDisplay';

// Cart Smash SmashButton Component
const SmashButton = ({ onSmash, isDisabled = false, itemCount = 0 }) => {
  const [isSmashing, setIsSmashing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [ripples, setRipples] = useState([]);
  const buttonRef = useRef(null);

  const generateConfetti = () => {
    const particles = [];
    const colors = ['#FF6B35', '#F7931E', '#FFD23F', '#06FFA5', '#3A86FF', '#8338EC'];
    
    for (let i = 0; i < 40; i++) {
      particles.push({
        id: i,
        color: colors[Math.floor(Math.random() * colors.length)],
        x: Math.random() * window.innerWidth,
        y: -10,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 3 + 2,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        scale: Math.random() * 0.8 + 0.4,
        gravity: 0.1,
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
        if (elapsed > 3) return;

        const newY = particle.y + particle.vy * elapsed * 60 + 0.5 * particle.gravity * Math.pow(elapsed * 60, 2);
        const newX = particle.x + particle.vx * elapsed * 60;
        const newRotation = particle.rotation + particle.rotationSpeed * elapsed * 60;
        const newOpacity = Math.max(0, 1 - elapsed / 3);

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
          width: '8px',
          height: '8px',
          backgroundColor: particle.color,
          transform: `rotate(${rotation}deg) scale(${particle.scale})`,
          opacity: opacity,
          pointerEvents: 'none',
          zIndex: 9999,
          borderRadius: '2px',
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
    if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
      const audioContext = new (AudioContext || webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    }
  };

  const handleSmash = async (e) => {
    if (isDisabled || isSmashing) return;

    createRipple(e);
    setIsSmashing(true);
    playSmashSound();
    triggerHaptic();
    setShowConfetti(true);
    
    document.body.style.animation = 'cartSmashShake 0.5s ease-in-out';
    
    try {
      await onSmash();
    } catch (error) {
      console.error('Smash error:', error);
    } finally {
      setTimeout(() => {
        setIsSmashing(false);
        setShowConfetti(false);
        document.body.style.animation = '';
      }, 2000);
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes cartSmashShake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
            20%, 40%, 60%, 80% { transform: translateX(3px); }
          }
          
          @keyframes smashPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
          
          @keyframes ripple {
            0% { transform: scale(0); opacity: 0.6; }
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
          padding: '20px 40px',
          fontSize: '24px',
          fontWeight: 'bold',
          color: 'white',
          background: isSmashing 
            ? 'linear-gradient(45deg, #FF6B35, #F7931E, #FFD23F, #FF6B35)'
            : 'linear-gradient(45deg, #FF6B35, #F7931E)',
          border: 'none',
          borderRadius: '16px',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          transform: isSmashing ? 'scale(0.95)' : 'scale(1)',
          transition: 'all 0.2s ease',
          boxShadow: isSmashing 
            ? 'inset 0 4px 8px rgba(0,0,0,0.3), 0 8px 32px rgba(255,107,53,0.4)'
            : '0 8px 32px rgba(255,107,53,0.3), 0 4px 16px rgba(0,0,0,0.1)',
          backgroundSize: '200% 200%',
          animation: isSmashing ? 'smashPulse 0.6s ease-in-out infinite' : 'none',
          opacity: isDisabled ? 0.6 : 1,
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}
        onMouseEnter={(e) => {
          if (!isDisabled) {
            e.target.style.backgroundPosition = '100% 0';
            e.target.style.transform = 'scale(1.02)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isDisabled) {
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
              background: 'rgba(255,255,255,0.6)',
              borderRadius: '50%',
              animation: 'ripple 1s ease-out',
              pointerEvents: 'none',
            }}
          />
        ))}
        
        <span style={{ position: 'relative', zIndex: 1 }}>
          {isSmashing ? (
            <>💥 SMASHING... 💥</>
          ) : (
            <>🛒 SMASH MY LIST 🛒</>
          )}
          {itemCount > 0 && !isSmashing && (
            <div style={{ 
              fontSize: '14px', 
              marginTop: '4px',
              opacity: 0.9,
              fontWeight: '600',
            }}>
              {itemCount} ITEMS READY
            </div>
          )}
        </span>
      </button>

      {showConfetti && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 }}>
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
          backgroundColor: 'rgba(255, 107, 53, 0.95)',
          color: 'white',
          padding: '20px 40px',
          borderRadius: '12px',
          fontSize: '24px',
          fontWeight: 'bold',
          zIndex: 10000,
          textAlign: 'center',
          animation: 'smashPulse 0.6s ease-in-out infinite',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          <div>🚀 CART SMASH ACTIVATED! 🚀</div>
          <div style={{ fontSize: '16px', marginTop: '8px', opacity: 0.9 }}>
            SMASHING YOUR LIST...
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
  const [error, setError] = useState('');
  const [apiStatus, setApiStatus] = useState('checking');
  const [useAdvancedParsing, setUseAdvancedParsing] = useState(true);

  // Check API health on component mount
  useEffect(() => {
    checkApiHealth();
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

  const handleSubmit = async () => {
    setError('');
    
    // Validate input
    const validation = groceryService.validateGroceryList(listText);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setIsProcessing(true);

    try {
      let data;
      if (useAdvancedParsing) {
        data = await groceryService.parseGroceryListAdvanced(listText, {
          groupByCategory: true
        });
      } else {
        data = await groceryService.parseGroceryList(listText);
      }
      
      setParsedItems(data.items);
      
      // Log categories if using advanced parsing
      if (data.categories) {
        console.log('Found categories:', data.categories);
      }
    } catch (err) {
      setError(err.message || 'Error smashing your list. Please try again.');
      console.error('Error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setListText('');
    setParsedItems([]);
    setError('');
  };

  const handleItemEdit = (itemId, newName) => {
    setParsedItems(items => 
      items.map(item => 
        item.id === itemId ? { ...item, itemName: newName } : item
      )
    );
  };

  const handleItemRemove = (itemId) => {
    setParsedItems(items => items.filter(item => item.id !== itemId));
  };

  const handleAddToCart = (selectedItems) => {
    console.log('Adding to Instacart:', selectedItems);
    alert(`Ready to add ${selectedItems.length} items to Instacart!`);
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

  // Show API status indicator
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
      
      <div style={styles.formSection}>
        <h2 style={styles.title}>🛒 Paste Your Grocery List</h2>
        <p style={styles.subtitle}>
          Ready to <strong>SMASH</strong> through your shopping list? Paste it below and watch the magic happen! 💥
        </p>
        
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
          
          <div style={styles.options}>
            <label style={styles.checkbox}>
              <input
                type="checkbox"
                checked={useAdvancedParsing}
                onChange={(e) => setUseAdvancedParsing(e.target.checked)}
                disabled={isProcessing}
              />
              🔥 Use advanced SMASH parsing (extracts quantities & categories)
            </label>
          </div>
          
          <div style={styles.buttonGroup}>
            <SmashButton
              onSmash={handleSubmit}
              isDisabled={!listText.trim() || isProcessing || apiStatus === 'disconnected'}
              itemCount={listText.split('\n').filter(line => line.trim()).length}
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
      </div>

      {parsedItems.length > 0 && (
        <ParsedResultsDisplay
          items={parsedItems}
          onItemEdit={handleItemEdit}
          onItemRemove={handleItemRemove}
          onAddToCart={handleAddToCart}
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
  options: {
    marginTop: '16px',
    marginBottom: '16px',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '16px',
    cursor: 'pointer',
    fontWeight: '600',
    color: '#333',
  },
};

export default GroceryListForm;
'@

# Write the updated content to file
Set-Content -Path $FormFile -Value $UpdatedContent -Encoding UTF8

Write-Host "✅ Updated $FormFile with Cart Smash branding!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Changes made:" -ForegroundColor Cyan
Write-Host "   ✅ Integrated SmashButton component directly" -ForegroundColor Green
Write-Host "   ✅ Updated colors to Cart Smash orange theme" -ForegroundColor Green
Write-Host "   ✅ Changed 'Parse' to 'SMASH' throughout" -ForegroundColor Green
Write-Host "   ✅ Enhanced UI with Cart Smash branding" -ForegroundColor Green
Write-Host "   ✅ Added confetti and sound effects" -ForegroundColor Green
Write-Host "   ✅ Updated placeholder text and messaging" -ForegroundColor Green
Write-Host "   ✅ Improved styling and animations" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Test the updated form: npm run dev" -ForegroundColor White
Write-Host "   2. Try the new SMASH button experience!" -ForegroundColor White
Write-Host "   3. Verify all animations and effects work" -ForegroundColor White
Write-Host ""
Write-Host "🛒💥 Cart Smash GroceryListForm.js is ready to SMASH! 💥🛒" -ForegroundColor Magenta