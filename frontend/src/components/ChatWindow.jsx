import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { uploadDocument, askQuestion, getDocuments, deleteDocument } from '../services/api';

// 🎨 THEME ENGINE CONFIGURATION
const themes = {
  light: {
    name: '☀️ Light (Vibrant)',
    appBg: '#f8fafc',
    appText: '#334155',
    sidebarBg: '#0f172a',
    sidebarText: 'white',
    headerBg: '#ffffff',
    borderColor: '#e2e8f0',
    aiBubbleBg: '#ffffff',
    aiBubbleText: '#0f172a',
    userBubbleBg: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    userBubbleText: '#ffffff',
    inputBg: '#ffffff',
    inputBoxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)'
  },
  dark: {
    name: '🌙 Dark Mode',
    appBg: '#0f172a',
    appText: '#94a3b8',
    sidebarBg: '#020617',
    sidebarText: '#f8fafc',
    headerBg: '#1e293b',
    borderColor: '#334155',
    aiBubbleBg: '#1e293b',
    aiBubbleText: '#f8fafc',
    userBubbleBg: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    userBubbleText: '#ffffff',
    inputBg: '#1e293b',
    inputBoxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)'
  },
  midnight: {
    name: '🌌 Midnight Blue',
    appBg: '#0b1120',
    appText: '#94a3b8',
    sidebarBg: '#050b14',
    sidebarText: '#e2e8f0',
    headerBg: '#0f172a',
    borderColor: '#1e293b',
    aiBubbleBg: '#1e293b',
    aiBubbleText: '#e2e8f0',
    userBubbleBg: 'linear-gradient(135deg, #0284c7, #2563eb)',
    userBubbleText: '#ffffff',
    inputBg: '#0f172a',
    inputBoxShadow: '0 10px 25px -5px rgba(0,0,0,0.4)'
  }
};

const ChatWindow = () => {
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [documents, setDocuments] = useState([]);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // NEW: Theme State
  const [activeThemeKey, setActiveThemeKey] = useState('light');
  const currentTheme = themes[activeThemeKey];

  const chatEndRef = useRef(null);

  const fetchDocuments = async () => {
    try {
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error("Failed to load documents", error);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingAnswer]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus(`Uploading ${file.name}...`);

    try {
      const data = await uploadDocument(file);
      setUploadStatus(`✅ Indexed successfully!`);
      fetchDocuments(); 
      setTimeout(() => setUploadStatus(''), 3000); 
    } catch (error) {
      console.error('Upload Error:', error);
      setUploadStatus('❌ Upload failed.');
    } finally {
      setUploading(false);
      event.target.value = null;
    }
  };

  const handleDeleteDocument = async (id, filename) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) return;
    try {
      await deleteDocument(id);
      fetchDocuments(); 
    } catch (error) {
      console.error("Failed to delete document", error);
    }
  };

  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear the chat history?")) {
      setMessages([]);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputQuery.trim() || loadingAnswer) return;

    const apiHistory = messages.map((msg) => ({
      role: msg.sender,
      content: msg.text
    }));

    const userMessage = { sender: 'user', text: inputQuery };
    setMessages((prev) => [...prev, userMessage]);
    setInputQuery('');
    setLoadingAnswer(true);

    try {
      const result = await askQuestion(inputQuery, apiHistory);
      const aiMessage = {
        sender: 'ai',
        text: result.answer,
        citations: result.citations,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage = {
        sender: 'ai',
        text: 'Sorry, I encountered an error retrieving an answer from your documents.',
        citations: [],
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoadingAnswer(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: '"Inter", "Segoe UI", Roboto, sans-serif', backgroundColor: currentTheme.appBg, color: currentTheme.appText, transition: 'background-color 0.3s' }}>
      
      {/* 📚 SIDEBAR */}
      <div style={{ 
          width: isSidebarOpen ? '280px' : '0px', 
          backgroundColor: currentTheme.sidebarBg, 
          color: currentTheme.sidebarText, 
          display: 'flex', 
          flexDirection: 'column', 
          boxShadow: '4px 0 20px rgba(0,0,0,0.15)', 
          zIndex: 10,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          borderRight: `1px solid ${currentTheme.borderColor}`
        }}>
        <div style={{ padding: '24px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '22px', fontWeight: '800', background: 'linear-gradient(135deg, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              DocMind AI
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>Enterprise RAG Assistant</p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '14px', padding: '6px 10px', borderRadius: '8px', transition: 'background 0.2s' }}>
            ◀
          </button>
        </div>

        <div style={{ padding: '0 20px 20px 20px' }}>
          <label style={{ display: 'block', width: '100%', padding: '14px', background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.1), rgba(129, 140, 248, 0.1))', border: '1px dashed #818cf8', borderRadius: '12px', textAlign: 'center', cursor: uploading ? 'not-allowed' : 'pointer', color: '#e0e7ff', fontSize: '14px', fontWeight: '600', boxSizing: 'border-box', transition: 'all 0.2s' }}>
            {uploading ? '⏳ Processing...' : '✨ Upload Document'}
            <input type="file" onChange={handleFileUpload} disabled={uploading} accept=".pdf,.docx,.xlsx" style={{ display: 'none' }} />
          </label>
          {uploadStatus && <div style={{ marginTop: '10px', fontSize: '13px', color: '#34d399', textAlign: 'center', fontWeight: '500' }}>{uploadStatus}</div>}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
          <h4 style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', fontWeight: '700' }}>My Knowledge Base</h4>
          {documents.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#475569', fontStyle: 'italic' }}>No files indexed yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {documents.map((doc) => (
                <li key={doc.id} style={{ padding: '12px 14px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', paddingRight: '10px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: currentTheme.sidebarText, overflow: 'hidden', textOverflow: 'ellipsis' }}>📄 {doc.filename}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', fontWeight: '500' }}>{doc.file_type.toUpperCase()}</div>
                  </div>
                  <button onClick={() => handleDeleteDocument(doc.id, doc.filename)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', padding: '6px', borderRadius: '6px', transition: 'background 0.2s' }} title="Delete">
                    🗑️
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 💬 MAIN CHAT AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minWidth: 0 }}>
        
        {/* Header with Theme Selector */}
        <div style={{ padding: '16px 40px', backgroundColor: currentTheme.headerBg, borderBottom: `1px solid ${currentTheme.borderColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.3s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} style={{ background: currentTheme.appBg, border: `1px solid ${currentTheme.borderColor}`, color: currentTheme.appText, cursor: 'pointer', fontSize: '18px', padding: '8px 12px', borderRadius: '8px' }}>
                ☰
              </button>
            )}
            <h3 style={{ margin: 0, fontSize: '18px', color: currentTheme.aiBubbleText, fontWeight: '700' }}>Live Chat</h3>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {/* Theme Dropdown */}
            <select 
              value={activeThemeKey} 
              onChange={(e) => setActiveThemeKey(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', background: currentTheme.appBg, color: currentTheme.appText, border: `1px solid ${currentTheme.borderColor}`, outline: 'none', cursor: 'pointer', fontWeight: '500' }}
            >
              {Object.keys(themes).map(key => (
                <option key={key} value={key}>{themes[key].name}</option>
              ))}
            </select>

            {messages.length > 0 && (
              <button onClick={handleClearChat} style={{ background: '#fee2e2', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#ef4444', fontWeight: '700' }}>
                🧹 Clear Chat
              </button>
            )}
          </div>
        </div>

        {/* Chat Messages / Welcome Screen */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {messages.length === 0 ? (
            
            <div style={{ margin: 'auto', maxWidth: '750px', width: '100%', padding: '20px' }}>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <div style={{ 
                  width: '72px', height: '72px', borderRadius: '20px', margin: '0 auto 24px',
                  background: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px',
                  boxShadow: '0 10px 25px -5px rgba(168, 85, 247, 0.4)'
                }}>
                  ✨
                </div>
                <h1 style={{ fontSize: '36px', color: currentTheme.aiBubbleText, fontWeight: '800', marginBottom: '16px', letterSpacing: '-0.5px' }}>
                  Welcome to <span style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>DocMind AI</span>
                </h1>
                <p style={{ color: currentTheme.appText, fontSize: '17px', lineHeight: '1.6', maxWidth: '550px', margin: '0 auto' }}>
                  Upload your knowledge base to the sidebar and start extracting insights instantly with AI.
                </p>
              </div>

              {/* Colorful Feature Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                <div style={{ padding: '24px', backgroundColor: currentTheme.aiBubbleBg, borderRadius: '16px', border: `1px solid ${currentTheme.borderColor}`, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '16px' }}>🔍</div>
                  <h4 style={{ margin: '0 0 8px 0', color: currentTheme.aiBubbleText, fontSize: '16px', fontWeight: '700' }}>Semantic Search</h4>
                  <p style={{ margin: 0, fontSize: '14px', color: currentTheme.appText, lineHeight: '1.5' }}>Ask natural questions. DocMind understands meaning, not just keywords.</p>
                </div>
                <div style={{ padding: '24px', backgroundColor: currentTheme.aiBubbleBg, borderRadius: '16px', border: `1px solid ${currentTheme.borderColor}`, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '16px' }}>🎯</div>
                  <h4 style={{ margin: '0 0 8px 0', color: currentTheme.aiBubbleText, fontSize: '16px', fontWeight: '700' }}>Source Citations</h4>
                  <p style={{ margin: 0, fontSize: '14px', color: currentTheme.appText, lineHeight: '1.5' }}>Every answer includes exact file references so you can verify instantly.</p>
                </div>
                <div style={{ padding: '24px', backgroundColor: currentTheme.aiBubbleBg, borderRadius: '16px', border: `1px solid ${currentTheme.borderColor}`, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '16px' }}>🧠</div>
                  <h4 style={{ margin: '0 0 8px 0', color: currentTheme.aiBubbleText, fontSize: '16px', fontWeight: '700' }}>Contextual Memory</h4>
                  <p style={{ margin: 0, fontSize: '14px', color: currentTheme.appText, lineHeight: '1.5' }}>Chat naturally. DocMind remembers previous messages in your session.</p>
                </div>
                <div style={{ padding: '24px', backgroundColor: currentTheme.aiBubbleBg, borderRadius: '16px', border: `1px solid ${currentTheme.borderColor}`, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ffedd5', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '16px' }}>📄</div>
                  <h4 style={{ margin: '0 0 8px 0', color: currentTheme.aiBubbleText, fontSize: '16px', fontWeight: '700' }}>Multi-Format</h4>
                  <p style={{ margin: 0, fontSize: '14px', color: currentTheme.appText, lineHeight: '1.5' }}>Upload PDF, DOCX, and XLSX. Text is extracted and indexed seamlessly.</p>
                </div>
              </div>
            </div>

          ) : (
            messages.map((msg, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '16px', flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', background: msg.sender === 'user' ? currentTheme.userBubbleBg : 'linear-gradient(135deg, #10b981, #34d399)', color: 'white', flexShrink: 0, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                  {msg.sender === 'user' ? '👤' : '🤖'}
                </div>

                <div style={{ 
                    padding: '16px 20px', 
                    borderRadius: msg.sender === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px', 
                    background: msg.sender === 'user' ? currentTheme.userBubbleBg : currentTheme.aiBubbleBg, 
                    color: msg.sender === 'user' ? currentTheme.userBubbleText : currentTheme.aiBubbleText, 
                    border: msg.sender === 'user' ? 'none' : `1px solid ${currentTheme.borderColor}`,
                    maxWidth: '75%', 
                    lineHeight: '1.6',
                    fontSize: '15px',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.03)'
                  }}>
                  
                  {msg.sender === 'ai' ? (
                    <ReactMarkdown style={{ margin: 0 }}>{msg.text}</ReactMarkdown>
                  ) : (
                    <p style={{ margin: 0 }}>{msg.text}</p>
                  )}
                  
                  {msg.citations && msg.citations.length > 0 && (
                    <div style={{ marginTop: '12px', fontSize: '12px', color: currentTheme.appText, borderTop: `1px solid ${currentTheme.borderColor}`, paddingTop: '10px' }}>
                      <span style={{ fontWeight: '700' }}>Sources:</span> {msg.citations.map((c) => c.filename).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {loadingAnswer && (
             <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
               <div style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', background: 'linear-gradient(135deg, #10b981, #34d399)', color: 'white', flexShrink: 0, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>🤖</div>
               <div style={{ padding: '14px 20px', borderRadius: '20px', background: currentTheme.aiBubbleBg, border: `1px solid ${currentTheme.borderColor}`, color: currentTheme.appText, fontSize: '14px', fontStyle: 'italic', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
                 Searching knowledge base...
               </div>
             </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Floating Input Area */}
        <div style={{ padding: '0 40px 40px 40px', backgroundColor: 'transparent' }}>
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '12px', backgroundColor: currentTheme.inputBg, padding: '8px 8px 8px 16px', borderRadius: '16px', border: `1px solid ${currentTheme.borderColor}`, boxShadow: currentTheme.inputBoxShadow }}>
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask a question about your documents..."
              style={{ flex: 1, padding: '12px 0', border: 'none', outline: 'none', fontSize: '15px', backgroundColor: 'transparent', color: currentTheme.aiBubbleText }}
            />
            <button type="submit" disabled={loadingAnswer || !inputQuery.trim()} style={{ padding: '12px 28px', borderRadius: '12px', background: inputQuery.trim() ? currentTheme.userBubbleBg : currentTheme.borderColor, color: 'white', border: 'none', cursor: inputQuery.trim() ? 'pointer' : 'not-allowed', fontWeight: '700', transition: 'all 0.3s', boxShadow: inputQuery.trim() ? '0 4px 10px rgba(99, 102, 241, 0.3)' : 'none' }}>
              Send
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default ChatWindow;