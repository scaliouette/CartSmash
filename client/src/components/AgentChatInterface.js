/**
 * Agent Chat Interface
 * Real-time communication system for interacting with AI agents
 * Provides Slack-style chat with channels, DMs, and rich features
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import agentMonitoringService from '../services/agentMonitoringService';
import debugService from '../services/debugService';

const AgentChatInterface = ({ currentUser }) => {
  // State management
  const [activeChannel, setActiveChannel] = useState('general');
  const [messages, setMessages] = useState({});
  const [inputMessage, setInputMessage] = useState('');
  const [agents, setAgents] = useState([]);
  const [typingAgents, setTypingAgents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Channels configuration
  const channels = [
    { id: 'general', name: 'General', icon: '💬', description: 'General discussion' },
    { id: 'development', name: 'Development', icon: '💻', description: 'Development updates' },
    { id: 'security', name: 'Security', icon: '🔐', description: 'Security alerts' },
    { id: 'performance', name: 'Performance', icon: '⚡', description: 'Performance metrics' },
    { id: 'dashboard', name: 'Dashboard', icon: '📊', description: 'Dashboard improvements' },
    { id: 'emergency', name: 'Emergency', icon: '🚨', description: 'Critical issues' }
  ];

  // Initialize
  useEffect(() => {
    loadAgents();
    loadMessages();
    setupWebSocket();

    return () => {
      cleanupWebSocket();
    };
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages, activeChannel]);

  const loadAgents = () => {
    const agentList = agentMonitoringService.getAllAgents();
    setAgents(agentList);
  };

  const loadMessages = () => {
    // Initialize with welcome messages
    const initialMessages = {
      general: [
        {
          id: 'welcome-1',
          channel: 'general',
          sender: 'system',
          senderAlias: 'System',
          content: 'Welcome to CartSmash Agent Communication Hub!',
          timestamp: new Date(Date.now() - 3600000),
          type: 'system'
        },
        {
          id: 'cao-1',
          channel: 'general',
          sender: 'chief-ai-officer',
          senderAlias: 'CAO',
          avatar: '👔',
          content: 'Good morning team! Ready to optimize CartSmash today. Current priorities: Dashboard improvements and security audits.',
          timestamp: new Date(Date.now() - 1800000),
          type: 'message',
          reactions: [{ emoji: '👍', users: ['Dash', 'SecOps'] }]
        },
        {
          id: 'dash-1',
          channel: 'general',
          sender: 'dashboard-improvement-agent',
          senderAlias: 'Dash',
          avatar: '📈',
          content: 'Working on the new real-time analytics widget. Expected completion: 2 hours.',
          timestamp: new Date(Date.now() - 900000),
          type: 'message',
          thread: [
            {
              sender: 'development-manager',
              senderAlias: 'DevLead',
              content: 'Great! Make sure it\'s mobile responsive.',
              timestamp: new Date(Date.now() - 600000)
            }
          ]
        }
      ],
      development: [],
      security: [],
      performance: [],
      dashboard: [],
      emergency: []
    };

    setMessages(initialMessages);
  };

  const setupWebSocket = () => {
    // WebSocket setup for real-time communication
    // In production, connect to actual WebSocket server
    console.log('WebSocket connection established');
  };

  const cleanupWebSocket = () => {
    console.log('WebSocket connection closed');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = () => {
    if (!inputMessage.trim()) return;

    const newMessage = {
      id: `msg-${Date.now()}`,
      channel: activeChannel,
      sender: 'admin',
      senderAlias: 'Admin',
      avatar: '👤',
      content: inputMessage,
      timestamp: new Date(),
      type: 'message'
    };

    // Check for @mentions
    const mentionPattern = /@(\w+)/g;
    const mentions = inputMessage.match(mentionPattern);
    if (mentions) {
      newMessage.mentions = mentions.map(m => m.substring(1));
    }

    // Check for commands
    if (inputMessage.startsWith('/')) {
      handleCommand(inputMessage);
      setInputMessage('');
      return;
    }

    // Add message to channel
    setMessages(prev => ({
      ...prev,
      [activeChannel]: [...(prev[activeChannel] || []), newMessage]
    }));

    // Simulate agent response
    if (mentions && mentions.includes('@Dash')) {
      setTimeout(() => {
        simulateAgentResponse('dashboard-improvement-agent', 'Dash', '📈',
          'On it! I\'ll analyze that component and provide optimization suggestions.');
      }, 1500);
    }

    setInputMessage('');
  };

  const handleCommand = (command) => {
    const parts = command.split(' ');
    const cmd = parts[0];

    switch (cmd) {
      case '/status':
        checkAgentStatus();
        break;
      case '/assign':
        assignTask(parts.slice(1).join(' '));
        break;
      case '/report':
        generateReport();
        break;
      case '/clear':
        clearChannel();
        break;
      default:
        addSystemMessage(`Unknown command: ${cmd}`);
    }
  };

  const simulateAgentResponse = (agentId, alias, avatar, content) => {
    const response = {
      id: `msg-${Date.now()}`,
      channel: activeChannel,
      sender: agentId,
      senderAlias: alias,
      avatar: avatar,
      content: content,
      timestamp: new Date(),
      type: 'message'
    };

    setMessages(prev => ({
      ...prev,
      [activeChannel]: [...(prev[activeChannel] || []), response]
    }));
  };

  const addSystemMessage = (content) => {
    const sysMessage = {
      id: `sys-${Date.now()}`,
      channel: activeChannel,
      sender: 'system',
      senderAlias: 'System',
      content: content,
      timestamp: new Date(),
      type: 'system'
    };

    setMessages(prev => ({
      ...prev,
      [activeChannel]: [...(prev[activeChannel] || []), sysMessage]
    }));
  };

  const checkAgentStatus = () => {
    const statuses = agents.map(agent =>
      `${agent.alias}: ${agent.status === 'active' ? '🟢' : '⭕'} ${agent.status}`
    ).join('\n');

    addSystemMessage(`Agent Status:\n${statuses}`);
  };

  const assignTask = (task) => {
    addSystemMessage(`Task assigned: ${task}`);
    // Trigger actual task assignment
  };

  const generateReport = () => {
    addSystemMessage('Generating daily report...');
    // Generate actual report
  };

  const clearChannel = () => {
    setMessages(prev => ({
      ...prev,
      [activeChannel]: []
    }));
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Handle file upload
      addSystemMessage(`File uploaded: ${file.name}`);
    }
  };

  const addReaction = (messageId, emoji) => {
    setMessages(prev => {
      const channelMessages = [...(prev[activeChannel] || [])];
      const messageIndex = channelMessages.findIndex(m => m.id === messageId);

      if (messageIndex !== -1) {
        const message = channelMessages[messageIndex];
        if (!message.reactions) {
          message.reactions = [];
        }

        const existingReaction = message.reactions.find(r => r.emoji === emoji);
        if (existingReaction) {
          if (!existingReaction.users.includes('Admin')) {
            existingReaction.users.push('Admin');
          }
        } else {
          message.reactions.push({ emoji, users: ['Admin'] });
        }

        channelMessages[messageIndex] = message;
      }

      return {
        ...prev,
        [activeChannel]: channelMessages
      };
    });
  };

  const insertCodeSnippet = () => {
    const codeTemplate = `\`\`\`${codeLanguage}\n// Your code here\n\`\`\``;
    setInputMessage(prev => prev + '\n' + codeTemplate);
    setShowCodeEditor(false);
  };

  const searchMessages = () => {
    if (!searchTerm) return [];

    const results = [];
    Object.entries(messages).forEach(([channel, channelMessages]) => {
      channelMessages.forEach(msg => {
        if (msg.content.toLowerCase().includes(searchTerm.toLowerCase())) {
          results.push({ ...msg, channel });
        }
      });
    });

    return results;
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h3 style={styles.workspaceName}>CartSmash AI Team</h3>
          <button
            onClick={() => setShowSearch(!showSearch)}
            style={styles.searchButton}
          >
            🔍
          </button>
        </div>

        {showSearch && (
          <div style={styles.searchContainer}>
            <input
              type="text"
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>
        )}

        {/* Channels */}
        <div style={styles.channelSection}>
          <div style={styles.sectionHeader}>Channels</div>
          {channels.map(channel => (
            <div
              key={channel.id}
              onClick={() => setActiveChannel(channel.id)}
              style={{
                ...styles.channelItem,
                ...(activeChannel === channel.id ? styles.activeChannel : {})
              }}
            >
              <span style={styles.channelIcon}>{channel.icon}</span>
              <span style={styles.channelName}>{channel.name}</span>
              {messages[channel.id]?.filter(m =>
                new Date(m.timestamp) > new Date(Date.now() - 300000)
              ).length > 0 && (
                <span style={styles.unreadIndicator}>
                  {messages[channel.id].filter(m =>
                    new Date(m.timestamp) > new Date(Date.now() - 300000)
                  ).length}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Direct Messages */}
        <div style={styles.channelSection}>
          <div style={styles.sectionHeader}>Direct Messages</div>
          {agents.slice(0, 5).map(agent => (
            <div
              key={agent.id}
              onClick={() => setActiveChannel(`dm-${agent.id}`)}
              style={styles.channelItem}
            >
              <span style={styles.agentStatus}>
                {agent.status === 'active' ? '🟢' : '⭕'}
              </span>
              <span style={styles.channelName}>{agent.alias}</span>
            </div>
          ))}
        </div>

        {/* Active Agents */}
        <div style={styles.channelSection}>
          <div style={styles.sectionHeader}>Active Now</div>
          {agents.filter(a => a.status === 'active').map(agent => (
            <div key={agent.id} style={styles.activeAgent}>
              <span>{agent.avatar}</span>
              <span style={styles.agentName}>{agent.alias}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={styles.chatArea}>
        {/* Chat Header */}
        <div style={styles.chatHeader}>
          <div style={styles.channelInfo}>
            <span style={styles.channelTitle}>
              {channels.find(c => c.id === activeChannel)?.icon} #{activeChannel}
            </span>
            <span style={styles.channelDescription}>
              {channels.find(c => c.id === activeChannel)?.description}
            </span>
          </div>
          <div style={styles.headerActions}>
            <button style={styles.headerButton} title="Channel Info">ℹ️</button>
            <button style={styles.headerButton} title="Pin Message">📌</button>
            <button style={styles.headerButton} title="Settings">⚙️</button>
          </div>
        </div>

        {/* Messages Area */}
        <div style={styles.messagesContainer}>
          {(messages[activeChannel] || []).map((message, index) => (
            <div key={message.id} style={styles.messageWrapper}>
              {message.type === 'system' ? (
                <div style={styles.systemMessage}>
                  <span style={styles.systemIcon}>ℹ️</span>
                  <span>{message.content}</span>
                  <span style={styles.timestamp}>
                    {formatTimestamp(message.timestamp)}
                  </span>
                </div>
              ) : (
                <div style={styles.message}>
                  <div style={styles.messageAvatar}>
                    {message.avatar || '👤'}
                  </div>
                  <div style={styles.messageContent}>
                    <div style={styles.messageHeader}>
                      <span style={styles.messageSender}>
                        {message.senderAlias}
                      </span>
                      <span style={styles.timestamp}>
                        {formatTimestamp(message.timestamp)}
                      </span>
                    </div>
                    <div style={styles.messageText}>
                      {message.content}
                    </div>
                    {message.reactions && message.reactions.length > 0 && (
                      <div style={styles.reactions}>
                        {message.reactions.map((reaction, idx) => (
                          <span
                            key={idx}
                            style={styles.reaction}
                            onClick={() => addReaction(message.id, reaction.emoji)}
                          >
                            {reaction.emoji} {reaction.users.length}
                          </span>
                        ))}
                      </div>
                    )}
                    {message.thread && message.thread.length > 0 && (
                      <div style={styles.thread}>
                        <div style={styles.threadHeader}>
                          💬 {message.thread.length} replies
                        </div>
                        {message.thread.map((reply, idx) => (
                          <div key={idx} style={styles.threadReply}>
                            <strong>{reply.senderAlias}:</strong> {reply.content}
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={styles.messageActions}>
                      <button
                        style={styles.actionButton}
                        onClick={() => addReaction(message.id, '👍')}
                      >
                        👍
                      </button>
                      <button
                        style={styles.actionButton}
                        onClick={() => setSelectedMessage(message)}
                      >
                        💬
                      </button>
                      <button
                        style={styles.actionButton}
                        onClick={() => navigator.clipboard.writeText(message.content)}
                        title="Copy message"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing Indicator */}
        {typingAgents.length > 0 && (
          <div style={styles.typingIndicator}>
            {typingAgents.join(', ')} {typingAgents.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}

        {/* Input Area */}
        <div style={styles.inputArea}>
          <div style={styles.inputToolbar}>
            <button
              style={styles.toolbarButton}
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
            >
              📎
            </button>
            <button
              style={styles.toolbarButton}
              onClick={() => setShowCodeEditor(!showCodeEditor)}
              title="Code snippet"
            >
              {'</>'}
            </button>
            <button
              style={styles.toolbarButton}
              onClick={() => setInputMessage(prev => prev + '@')}
              title="Mention"
            >
              @
            </button>
            <button
              style={styles.toolbarButton}
              onClick={() => setInputMessage(prev => prev + '/')}
              title="Command"
            >
              /
            </button>
          </div>

          {showCodeEditor && (
            <div style={styles.codeEditorPanel}>
              <select
                value={codeLanguage}
                onChange={(e) => setCodeLanguage(e.target.value)}
                style={styles.languageSelect}
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="json">JSON</option>
                <option value="sql">SQL</option>
                <option value="bash">Bash</option>
              </select>
              <button onClick={insertCodeSnippet} style={styles.insertButton}>
                Insert Code Block
              </button>
            </div>
          )}

          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={`Message #${activeChannel}...`}
            style={styles.messageInput}
            rows={3}
          />

          <div style={styles.inputFooter}>
            <div style={styles.inputHint}>
              Press Enter to send, Shift+Enter for new line
            </div>
            <button onClick={sendMessage} style={styles.sendButton}>
              Send 📤
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    height: '100%',
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },

  sidebar: {
    width: '260px',
    backgroundColor: '#2c2c2c',
    borderRight: '1px solid #3a3a3a',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto'
  },

  sidebarHeader: {
    padding: '16px',
    borderBottom: '1px solid #3a3a3a',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  workspaceName: {
    fontSize: '16px',
    fontWeight: 'bold',
    margin: 0
  },

  searchButton: {
    background: 'none',
    border: 'none',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '18px'
  },

  searchContainer: {
    padding: '8px 16px',
    borderBottom: '1px solid #3a3a3a'
  },

  searchInput: {
    width: '100%',
    padding: '6px 10px',
    backgroundColor: '#1a1a1a',
    border: '1px solid #3a3a3a',
    borderRadius: '4px',
    color: '#ffffff',
    fontSize: '14px'
  },

  channelSection: {
    marginTop: '16px'
  },

  sectionHeader: {
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#888888'
  },

  channelItem: {
    padding: '6px 16px',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },

  activeChannel: {
    backgroundColor: '#3a3a3a'
  },

  channelIcon: {
    marginRight: '8px',
    fontSize: '16px'
  },

  channelName: {
    flex: 1,
    fontSize: '14px'
  },

  unreadIndicator: {
    backgroundColor: '#ff4444',
    color: '#ffffff',
    borderRadius: '10px',
    padding: '2px 6px',
    fontSize: '11px',
    fontWeight: 'bold'
  },

  agentStatus: {
    marginRight: '8px',
    fontSize: '10px'
  },

  activeAgent: {
    padding: '4px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px'
  },

  agentName: {
    color: '#cccccc'
  },

  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column'
  },

  chatHeader: {
    padding: '16px',
    borderBottom: '1px solid #3a3a3a',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#2c2c2c'
  },

  channelInfo: {
    display: 'flex',
    flexDirection: 'column'
  },

  channelTitle: {
    fontSize: '18px',
    fontWeight: 'bold'
  },

  channelDescription: {
    fontSize: '12px',
    color: '#888888',
    marginTop: '2px'
  },

  headerActions: {
    display: 'flex',
    gap: '8px'
  },

  headerButton: {
    background: 'none',
    border: 'none',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '18px',
    padding: '4px'
  },

  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },

  messageWrapper: {
    display: 'flex',
    flexDirection: 'column'
  },

  systemMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: '#3a3a3a',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#aaaaaa'
  },

  systemIcon: {
    fontSize: '14px'
  },

  message: {
    display: 'flex',
    gap: '12px'
  },

  messageAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '6px',
    backgroundColor: '#3a3a3a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    flexShrink: 0
  },

  messageContent: {
    flex: 1
  },

  messageHeader: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
    marginBottom: '4px'
  },

  messageSender: {
    fontWeight: 'bold',
    fontSize: '14px'
  },

  timestamp: {
    fontSize: '11px',
    color: '#888888'
  },

  messageText: {
    fontSize: '14px',
    lineHeight: '1.4',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word'
  },

  reactions: {
    display: 'flex',
    gap: '4px',
    marginTop: '8px'
  },

  reaction: {
    padding: '2px 6px',
    backgroundColor: '#3a3a3a',
    borderRadius: '12px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },

  thread: {
    marginTop: '8px',
    paddingLeft: '16px',
    borderLeft: '2px solid #3a3a3a'
  },

  threadHeader: {
    fontSize: '12px',
    color: '#888888',
    marginBottom: '4px'
  },

  threadReply: {
    fontSize: '13px',
    marginBottom: '4px'
  },

  messageActions: {
    display: 'flex',
    gap: '4px',
    marginTop: '4px',
    opacity: 0.6,
    transition: 'opacity 0.2s'
  },

  actionButton: {
    background: 'none',
    border: 'none',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '2px 4px'
  },

  typingIndicator: {
    padding: '8px 16px',
    fontSize: '12px',
    color: '#888888',
    fontStyle: 'italic'
  },

  inputArea: {
    padding: '16px',
    borderTop: '1px solid #3a3a3a',
    backgroundColor: '#2c2c2c'
  },

  inputToolbar: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px'
  },

  toolbarButton: {
    padding: '6px 10px',
    backgroundColor: '#3a3a3a',
    border: 'none',
    borderRadius: '4px',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s'
  },

  codeEditorPanel: {
    padding: '8px',
    backgroundColor: '#3a3a3a',
    borderRadius: '4px',
    marginBottom: '8px',
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },

  languageSelect: {
    padding: '4px 8px',
    backgroundColor: '#2c2c2c',
    border: '1px solid #4a4a4a',
    borderRadius: '4px',
    color: '#ffffff',
    fontSize: '13px'
  },

  insertButton: {
    padding: '4px 12px',
    backgroundColor: '#4a9eff',
    border: 'none',
    borderRadius: '4px',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '13px'
  },

  messageInput: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#1a1a1a',
    border: '1px solid #3a3a3a',
    borderRadius: '6px',
    color: '#ffffff',
    fontSize: '14px',
    resize: 'none',
    fontFamily: 'inherit'
  },

  inputFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px'
  },

  inputHint: {
    fontSize: '11px',
    color: '#666666'
  },

  sendButton: {
    padding: '8px 16px',
    backgroundColor: '#4a9eff',
    border: 'none',
    borderRadius: '6px',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    transition: 'background-color 0.2s'
  }
};

export default AgentChatInterface;