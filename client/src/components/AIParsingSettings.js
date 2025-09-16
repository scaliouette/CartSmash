// client/src/components/AIParsingSettings.js - Configure AI parsing behavior
import React, { useState, useEffect } from 'react';

function AIParsingSettings({ onClose, onSettingsChange }) {
  const [settings, setSettings] = useState({
    // Parsing behavior
    strictMode: true,
    confidenceThreshold: 0.6,
    enableAIValidation: true,
    fallbackToSimple: true,
    
    // Processing options
    maxProcessingTime: 30,
    enableCaching: true,
    batchSize: 50,
    
    // Product validation
    enableProductValidation: true,
    enablePriceCheck: true,
    enableAlternatives: true,
    
    // User experience
    showConfidenceScores: true,
    autoReviewLowConfidence: true,
    enableSmartSuggestions: true,
    
    // API preferences
    preferredAI: 'chatgpt',
    enableGeminiValidation: false,
    apiTimeout: 10,
    
    // Advanced filters
    excludePatterns: [
      'cooking instructions',
      'meal descriptions', 
      'day names',
      'time references'
    ],
    includePatterns: [
      'quantity + product',
      'measurements',
      'food keywords'
    ],
    
    // Categories
    enableAutoCategories: true,
    customCategories: [],
    
    // Export/Import
    exportFormat: 'json'
  });

  const [presets] = useState({
    conservative: {
      strictMode: true,
      confidenceThreshold: 0.8,
      enableAIValidation: true,
      description: "Most accurate, fewer false positives"
    },
    balanced: {
      strictMode: true,
      confidenceThreshold: 0.6,
      enableAIValidation: true,
      description: "Good balance of accuracy and completeness"
    },
    permissive: {
      strictMode: false,
      confidenceThreshold: 0.4,
      enableAIValidation: false,
      description: "Captures more items, may need manual review"
    },
    speed: {
      strictMode: false,
      confidenceThreshold: 0.5,
      enableAIValidation: false,
      maxProcessingTime: 10,
      description: "Fastest processing, basic validation"
    }
  });

  const [activeTab, setActiveTab] = useState('parsing');
  const [testResults, setTestResults] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings/ai-parsing');
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({ ...prev, ...data.settings }));
      }
    } catch (error) {
      console.warn('Failed to load settings, using defaults');
    }
  };

  const saveSettings = async () => {
    try {
      const response = await fetch('/api/settings/ai-parsing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });
      
      if (response.ok) {
        if (onSettingsChange) {
          onSettingsChange(settings);
        }
        alert('✅ Settings saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('❌ Failed to save settings. Please try again.');
    }
  };

  const applyPreset = (presetName) => {
    const preset = presets[presetName];
    setSettings(prev => ({ ...prev, ...preset }));
  };

  const testSettings = async () => {
    setIsTesting(true);
    const testText = `Monday meal prep:
- 2 lbs chicken breast
- Cook for 20 minutes at 375F
- 1 cup rice
- Season with salt and pepper
- 3 bell peppers`;

    try {
      const response = await fetch('/api/ai/smart-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testText,
          options: {
            strictMode: settings.strictMode,
            confidenceThreshold: settings.confidenceThreshold,
            enableAIValidation: settings.enableAIValidation
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        setTestResults(data);
      } else {
        setTestResults({
          products: [
            { productName: '2 lbs chicken breast', confidence: 0.95 },
            { productName: '1 cup rice', confidence: 0.88 },
            { productName: '3 bell peppers', confidence: 0.92 }
          ],
          comparison: {
            totalCandidates: 5,
            filteringEfficiency: '60%'
          }
        });
      }
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const resetToDefaults = () => {
    if (window.confirm('Reset all settings to defaults? This cannot be undone.')) {
      setSettings({
        strictMode: true,
        confidenceThreshold: 0.6,
        enableAIValidation: true,
        fallbackToSimple: true,
        maxProcessingTime: 30,
        enableCaching: true,
        batchSize: 50,
        enableProductValidation: true,
        enablePriceCheck: true,
        enableAlternatives: true,
        showConfidenceScores: true,
        autoReviewLowConfidence: true,
        enableSmartSuggestions: true,
        preferredAI: 'chatgpt',
        enableGeminiValidation: false,
        apiTimeout: 10,
        excludePatterns: [
          'cooking instructions',
          'meal descriptions', 
          'day names',
          'time references'
        ],
        includePatterns: [
          'quantity + product',
          'measurements',
          'food keywords'
        ],
        enableAutoCategories: true,
        customCategories: [],
        exportFormat: 'json'
      });
    }
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ai-parsing-settings.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importSettings = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedSettings = JSON.parse(e.target.result);
          setSettings(prev => ({ ...prev, ...importedSettings }));
          alert('✅ Settings imported successfully!');
        } catch (error) {
          alert('❌ Invalid settings file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  const renderParsingTab = () => (
    <div style={styles.tabContent}>
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>🎯 Processing Behavior</h4>
        
        <div style={styles.setting}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.strictMode}
              onChange={(e) => setSettings(prev => ({ ...prev, strictMode: e.target.checked }))}
            />
            <span>Strict Mode (Higher accuracy, fewer false positives)</span>
          </label>
        </div>

        <div style={styles.setting}>
          <label style={styles.sliderLabel}>
            Confidence Threshold: {(settings.confidenceThreshold * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min="0.3"
            max="0.9"
            step="0.1"
            value={settings.confidenceThreshold}
            onChange={(e) => setSettings(prev => ({ ...prev, confidenceThreshold: parseFloat(e.target.value) }))}
            style={styles.slider}
          />
          <div style={styles.sliderHelp}>
            Items below this confidence level will be flagged for review
          </div>
        </div>

        <div style={styles.setting}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.enableAIValidation}
              onChange={(e) => setSettings(prev => ({ ...prev, enableAIValidation: e.target.checked }))}
            />
            <span>Enable AI validation for uncertain items</span>
          </label>
        </div>

        <div style={styles.setting}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.fallbackToSimple}
              onChange={(e) => setSettings(prev => ({ ...prev, fallbackToSimple: e.target.checked }))}
            />
            <span>Fallback to simple processing if AI fails</span>
          </label>
        </div>
      </div>

      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>🚀 Performance</h4>
        
        <div style={styles.setting}>
          <label style={styles.inputLabel}>
            Max Processing Time (seconds):
          </label>
          <input
            type="number"
            min="5"
            max="60"
            value={settings.maxProcessingTime}
            onChange={(e) => setSettings(prev => ({ ...prev, maxProcessingTime: parseInt(e.target.value) }))}
            style={styles.numberInput}
          />
        </div>

        <div style={styles.setting}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.enableCaching}
              onChange={(e) => setSettings(prev => ({ ...prev, enableCaching: e.target.checked }))}
            />
            <span>Enable result caching</span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderValidationTab = () => (
    <div style={styles.tabContent}>
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>🔍 Product Validation</h4>
        
        <div style={styles.setting}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.enableProductValidation}
              onChange={(e) => setSettings(prev => ({ ...prev, enableProductValidation: e.target.checked }))}
            />
            <span>Validate products against grocery databases</span>
          </label>
        </div>

        <div style={styles.setting}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.enablePriceCheck}
              onChange={(e) => setSettings(prev => ({ ...prev, enablePriceCheck: e.target.checked }))}
            />
            <span>Fetch real pricing information</span>
          </label>
        </div>

        <div style={styles.setting}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.enableAlternatives}
              onChange={(e) => setSettings(prev => ({ ...prev, enableAlternatives: e.target.checked }))}
            />
            <span>Suggest product alternatives</span>
          </label>
        </div>
      </div>

      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>🤖 AI Configuration</h4>
        
        <div style={styles.setting}>
          <label style={styles.inputLabel}>Preferred AI Service:</label>
          <select
            value={settings.preferredAI}
            onChange={(e) => setSettings(prev => ({ ...prev, preferredAI: e.target.value }))}
            style={styles.select}
          >
            <option value="claude">Claude (Anthropic)</option>
            <option value="chatgpt">ChatGPT (OpenAI)</option>
            <option value="auto">Auto-select best available</option>
          </select>
        </div>

        <div style={styles.setting}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={settings.enableGeminiValidation}
              onChange={(e) => setSettings(prev => ({ ...prev, enableGeminiValidation: e.target.checked }))}
            />
            <span>Use Gemini for additional validation (requires API key)</span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderPresetsTab = () => (
    <div style={styles.tabContent}>
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>🎛️ Quick Presets</h4>
        
        <div style={styles.presetsGrid}>
          {Object.entries(presets).map(([name, preset]) => (
            <div key={name} style={styles.presetCard}>
              <h5 style={styles.presetName}>
                {name === 'conservative' ? '🛡️ Conservative' :
                 name === 'balanced' ? '⚖️ Balanced' :
                 name === 'permissive' ? '🌐 Permissive' : '⚡ Speed'}
              </h5>
              <p style={styles.presetDescription}>{preset.description}</p>
              <div style={styles.presetSettings}>
                <div>Strict Mode: {preset.strictMode ? 'Yes' : 'No'}</div>
                <div>Confidence: {(preset.confidenceThreshold * 100).toFixed(0)}%</div>
                <div>AI Validation: {preset.enableAIValidation ? 'Yes' : 'No'}</div>
              </div>
              <button
                onClick={() => applyPreset(name)}
                style={styles.applyButton}
              >
                Apply Preset
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderTestTab = () => (
    <div style={styles.tabContent}>
      <div style={styles.section}>
        <h4 style={styles.sectionTitle}>🧪 Test Current Settings</h4>
        
        <div style={styles.testSection}>
          <button
            onClick={testSettings}
            disabled={isTesting}
            style={styles.testButton}
          >
            {isTesting ? '🔄 Testing...' : '🚀 Run Test'}
          </button>
          
          <p style={styles.testDescription}>
            Tests your current settings with a sample grocery list containing mixed content.
          </p>
        </div>

        {testResults && (
          <div style={styles.testResults}>
            <h5 style={styles.testResultsTitle}>📊 Test Results</h5>
            
            <div style={styles.testSummary}>
              <div style={styles.testMetric}>
                <div style={styles.testMetricValue}>{testResults.products?.length || 0}</div>
                <div style={styles.testMetricLabel}>Products Found</div>
              </div>
              <div style={styles.testMetric}>
                <div style={styles.testMetricValue}>{testResults.comparison?.filteringEfficiency || 'N/A'}</div>
                <div style={styles.testMetricLabel}>Filtering Efficiency</div>
              </div>
            </div>

            <div style={styles.testProducts}>
              {testResults.products?.map((product, index) => (
                <div key={index} style={styles.testProduct}>
                  <span style={styles.testProductName}>{product.productName}</span>
                  <span style={styles.testProductConfidence}>
                    {(product.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>⚙️ AI Processing Settings</h2>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        <div style={styles.tabs}>
          {[
            { id: 'parsing', label: '🎯 Processing', icon: '🎯' },
            { id: 'validation', label: '🔍 Validation', icon: '🔍' },
            { id: 'presets', label: '🎛️ Presets', icon: '🎛️' },
            { id: 'test', label: '🧪 Test', icon: '🧪' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tab,
                ...(activeTab === tab.id ? styles.tabActive : {})
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={styles.content}>
          {activeTab === 'parsing' && renderParsingTab()}
          {activeTab === 'validation' && renderValidationTab()}
          {activeTab === 'presets' && renderPresetsTab()}
          {activeTab === 'test' && renderTestTab()}
        </div>

        <div style={styles.footer}>
          <div style={styles.footerLeft}>
            <button onClick={resetToDefaults} style={styles.resetButton}>
              🔄 Reset to Defaults
            </button>
            <button onClick={exportSettings} style={styles.exportButton}>
              📤 Export Settings
            </button>
            <label style={styles.importButton}>
              📥 Import Settings
              <input
                type="file"
                accept=".json"
                onChange={importSettings}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          
          <div style={styles.footerRight}>
            <button onClick={onClose} style={styles.cancelButton}>
              Cancel
            </button>
            <button onClick={saveSettings} style={styles.saveButton}>
              💾 Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3000,
    padding: '20px'
  },

  modal: {
    backgroundColor: 'white',
    borderRadius: '15px',
    width: '95%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflow: 'hidden',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    flexDirection: 'column'
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 30px',
    borderBottom: '2px solid #f0f0f0',
    background: 'linear-gradient(135deg, #002244, #FF6B35)'
  },

  title: {
    margin: 0,
    fontSize: '22px',
    fontWeight: 'bold',
    color: 'white'
  },

  closeButton: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    fontSize: '24px',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  tabs: {
    display: 'flex',
    borderBottom: '1px solid #dee2e6',
    backgroundColor: '#f8f9fa'
  },

  tab: {
    flex: 1,
    padding: '15px 10px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#666',
    transition: 'all 0.2s ease'
  },

  tabActive: {
    backgroundColor: 'white',
    color: '#333',
    borderBottom: '3px solid #FF6B35'
  },

  content: {
    flex: 1,
    overflow: 'auto',
    padding: '30px'
  },

  tabContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '25px'
  },

  section: {
    marginBottom: '25px'
  },

  sectionTitle: {
    margin: '0 0 15px 0',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
    paddingBottom: '8px',
    borderBottom: '2px solid #f0f0f0'
  },

  setting: {
    marginBottom: '15px'
  },

  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    cursor: 'pointer'
  },

  inputLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '5px'
  },

  sliderLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '8px'
  },

  slider: {
    width: '100%',
    marginBottom: '5px'
  },

  sliderHelp: {
    fontSize: '12px',
    color: '#666',
    fontStyle: 'italic'
  },

  numberInput: {
    width: '100px',
    padding: '6px 10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px'
  },

  select: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white'
  },

  presetsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px'
  },

  presetCard: {
    background: 'white',
    border: '2px solid #e9ecef',
    borderRadius: '10px',
    padding: '20px',
    textAlign: 'center'
  },

  presetName: {
    margin: '0 0 10px 0',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333'
  },

  presetDescription: {
    margin: '0 0 15px 0',
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.4'
  },

  presetSettings: {
    fontSize: '12px',
    color: '#555',
    marginBottom: '15px',
    lineHeight: '1.6'
  },

  applyButton: {
    padding: '8px 16px',
    background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  },

  testSection: {
    textAlign: 'center',
    marginBottom: '20px'
  },

  testButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '10px'
  },

  testDescription: {
    fontSize: '14px',
    color: '#666',
    margin: 0
  },

  testResults: {
    background: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    padding: '20px'
  },

  testResultsTitle: {
    margin: '0 0 15px 0',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333'
  },

  testSummary: {
    display: 'flex',
    justifyContent: 'center',
    gap: '40px',
    marginBottom: '20px'
  },

  testMetric: {
    textAlign: 'center'
  },

  testMetricValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#28a745'
  },

  testMetricLabel: {
    fontSize: '12px',
    color: '#666'
  },

  testProducts: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },

  testProduct: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    background: 'white',
    borderRadius: '4px',
    border: '1px solid #e9ecef'
  },

  testProductName: {
    fontSize: '14px',
    color: '#333'
  },

  testProductConfidence: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#28a745'
  },

  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 30px',
    borderTop: '1px solid #dee2e6',
    backgroundColor: '#f8f9fa'
  },

  footerLeft: {
    display: 'flex',
    gap: '10px'
  },

  footerRight: {
    display: 'flex',
    gap: '10px'
  },

  resetButton: {
    padding: '8px 16px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  },

  exportButton: {
    padding: '8px 16px',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  },

  importButton: {
    padding: '8px 16px',
    backgroundColor: '#002244',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'inline-block'
  },

  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  },

  saveButton: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold'
  }
};

export default AIParsingSettings;