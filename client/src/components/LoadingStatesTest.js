// client/src/components/LoadingStatesTest.js
import React, { useState } from 'react';
import LoadingSpinner, { 
  ButtonSpinner, 
  InlineSpinner, 
  OverlaySpinner, 
  ProgressSpinner,
  SkeletonLoader 
} from './LoadingSpinner';

function LoadingStatesTest() {
  const [showOverlay, setShowOverlay] = useState(false);
  const [progress, setProgress] = useState(0);
  const [loadingButtons, setLoadingButtons] = useState({});

  const simulateProgress = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const simulateButtonLoading = (buttonId) => {
    setLoadingButtons(prev => ({ ...prev, [buttonId]: true }));
    setTimeout(() => {
      setLoadingButtons(prev => ({ ...prev, [buttonId]: false }));
    }, 3000);
  };

  const simulateOverlay = () => {
    setShowOverlay(true);
    setTimeout(() => setShowOverlay(false), 3000);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Loading States Test Page</h1>
      
      {/* Overlay Demo */}
      {showOverlay && <OverlaySpinner text="Processing your request..." />}
      
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>1. Basic Loading Spinners</h2>
        
        <div style={styles.demo}>
          <div style={styles.demoItem}>
            <h3>Small</h3>
            <LoadingSpinner size="small" />
          </div>
          
          <div style={styles.demoItem}>
            <h3>Medium</h3>
            <LoadingSpinner size="medium" />
          </div>
          
          <div style={styles.demoItem}>
            <h3>Large</h3>
            <LoadingSpinner size="large" />
          </div>
          
          <div style={styles.demoItem}>
            <h3>Custom Color</h3>
            <LoadingSpinner color="#10b981" text="Loading data..." />
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>2. Button Loading States</h2>
        
        <div style={styles.buttonGroup}>
          <button
            onClick={() => simulateButtonLoading('save')}
            disabled={loadingButtons.save}
            style={styles.button}
          >
            {loadingButtons.save ? (
              <>
                <ButtonSpinner /> Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
          
          <button
            onClick={() => simulateButtonLoading('submit')}
            disabled={loadingButtons.submit}
            style={{ ...styles.button, backgroundColor: '#3b82f6' }}
          >
            {loadingButtons.submit ? (
              <>
                <ButtonSpinner color="white" /> Processing...
              </>
            ) : (
              'Submit Form'
            )}
          </button>
          
          <button
            onClick={() => simulateButtonLoading('delete')}
            disabled={loadingButtons.delete}
            style={{ ...styles.button, backgroundColor: '#ef4444' }}
          >
            {loadingButtons.delete ? (
              <>
                <ButtonSpinner color="white" /> Deleting...
              </>
            ) : (
              'Delete Item'
            )}
          </button>
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>3. Inline Loading</h2>
        
        <div style={styles.inlineDemo}>
          <p>
            Fetching prices... <InlineSpinner color="#10b981" />
          </p>
          
          <p>
            Validating items <InlineSpinner text="(3 of 10)" />
          </p>
          
          <p>
            Syncing to cloud <InlineSpinner text="Almost done..." color="#f59e0b" />
          </p>
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>4. Progress Loading</h2>
        
        <button onClick={simulateProgress} style={styles.button}>
          Start Progress Demo
        </button>
        
        <ProgressSpinner 
          progress={progress} 
          text={progress < 100 ? "Processing items..." : "Complete!"} 
        />
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>5. Overlay Loading</h2>
        
        <button onClick={simulateOverlay} style={styles.button}>
          Show Overlay Spinner
        </button>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>6. Skeleton Loading</h2>
        
        <div style={styles.skeletonDemo}>
          <h3>Text Content Loading</h3>
          <SkeletonLoader lines={3} />
          
          <h3 style={{ marginTop: '20px' }}>Card Loading</h3>
          <div style={styles.skeletonCard}>
            <SkeletonLoader lines={1} height="40px" />
            <div style={{ marginTop: '10px' }}>
              <SkeletonLoader lines={2} />
            </div>
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>7. Real-World Examples</h2>
        
        <div style={styles.examples}>
          <div style={styles.exampleCard}>
            <h3>Auto-Save Status</h3>
            <div style={styles.autoSave}>
              <span>Draft auto-saved</span>
              <InlineSpinner text="" color="#10b981" />
            </div>
          </div>
          
          <div style={styles.exampleCard}>
            <h3>Form Submission</h3>
            <form style={styles.form}>
              <input 
                type="text" 
                placeholder="Enter grocery item" 
                style={styles.input}
              />
              <button 
                type="submit" 
                disabled
                style={{ ...styles.button, opacity: 0.7 }}
              >
                <ButtonSpinner /> Adding to cart...
              </button>
            </form>
          </div>
          
          <div style={styles.exampleCard}>
            <h3>List Loading</h3>
            <div style={styles.listLoading}>
              {[1, 2, 3].map(i => (
                <div key={i} style={styles.listItem}>
                  <SkeletonLoader lines={1} width="100%" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '40px 20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  
  title: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '40px',
    textAlign: 'center',
  },
  
  section: {
    marginBottom: '60px',
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
  
  sectionTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: '20px',
  },
  
  demo: {
    display: 'flex',
    gap: '40px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  
  demoItem: {
    textAlign: 'center',
    minWidth: '120px',
  },
  
  buttonGroup: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap',
  },
  
  button: {
    padding: '10px 20px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'opacity 0.2s',
  },
  
  inlineDemo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    fontSize: '16px',
    color: '#4b5563',
  },
  
  skeletonDemo: {
    maxWidth: '400px',
  },
  
  skeletonCard: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  
  examples: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  },
  
  exampleCard: {
    padding: '20px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  
  autoSave: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px',
    backgroundColor: '#f0f9ff',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#0369a1',
  },
  
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  
  input: {
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '16px',
  },
  
  listLoading: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  
  listItem: {
    padding: '10px',
    backgroundColor: 'white',
    borderRadius: '6px',
  },
};

export default LoadingStatesTest;