// Debug component to show basic info
import React from 'react';

function DebugInfo() {
  console.log('🔍 DebugInfo component rendering');
  
  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: '#000',
      color: '#00ff00',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <div><strong>🚀 CartSmash Debug</strong></div>
      <div>Env: {process.env.NODE_ENV || 'unknown'}</div>
      <div>API: {process.env.REACT_APP_API_URL || 'default'}</div>
      <div>URL: {window.location.hostname}</div>
      <div>Time: {new Date().toLocaleTimeString()}</div>
      <div>Status: ✅ React App Running</div>
    </div>
  );
}

export default DebugInfo;