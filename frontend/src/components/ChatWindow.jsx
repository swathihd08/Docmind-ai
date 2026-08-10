import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { uploadDocument, askQuestion, getDocuments, deleteDocument } from '../services/api';

const ChatWindow = () => {
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [documents, setDocuments] = useState([]);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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
    <div style={{ display: 'flex', height: '100vh', fontFamily: '"Inter", "Segoe UI", Roboto, sans-serif', backgroundColor: '#f4f7f9', color: '#334155' }}>
      
      {/* 📚 VIBRANT DARK SIDEBAR */}
      <div style={{ 
          width: isSidebarOpen ? '280px' : '0px', 
          backgroundColor: '#0f172a', 
          color: 'white', 
          display: 'flex', 
          flexDirection: 'column', 
          boxShadow: '4px 0 20px rgba(0,0,0,0.15)', 
          zIndex: 10,
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
          whiteSpace: 'nowrap'
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
                <li key={doc.id} style={{ padding: '12px 14px', backgroundColor: '#1e293b', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #334155', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', paddingRight: '10px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#f8fafc', overflow: 'hidden', textOverflow: 'ellipsis' }}>📄 {doc.filename}</div>
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minWidth: 0, backgroundColor: '#f8fafc' }}>
        
        {/* Header */}
        <div style={{ padding: '16px 40px', backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', cursor: 'pointer', fontSize: '18px', padding: '8px 12px', borderRadius: '8px', transition: 'all 0.2s' }}>
                ☰
              </button>
            )}
            <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a', fontWeight: '700' }}>Live Chat</h3>
          </div>
          {messages.length > 0 && (
            <button onClick={handleClearChat} style={{ background: '#fee2e2', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#ef4444', fontWeight: '700', transition: 'background 0.2s' }}>
              🧹 Clear Chat
            </button>
          )}
        </div>

        {/* Chat Messages / Colorful Welcome Screen */}
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
                <h1 style={{ fontSize: '36px', color: '#0f172a', fontWeight: '800', marginBottom: '16px', letterSpacing: '-0.5px' }}>
                  Welcome to <span style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>DocMind AI</span>
                </h1>
                <p style={{ color: '#64748b', fontSize: '17px', lineHeight: '1.6', maxWidth: '550px', margin: '0 auto' }}>
                  Upload your knowledge base to the sidebar and start extracting insights instantly with AI.
                </p>
              </div>

              {/* Colorful Feature Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                <div style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#dbeafe', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '16px' }}>🔍</div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '16px', fontWeight: '700' }}>Semantic Search</h4>
                  <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>Ask natural questions. DocMind understands meaning, not just keywords.</p>
                </div>
                <div style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '16px' }}>🎯</div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '16px', fontWeight: '700' }}>Source Citations</h4>
                  <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>Every answer includes exact file references so you can verify instantly.</p>
                </div>
                <div style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '16px' }}>🧠</div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '16px', fontWeight: '700' }}>Contextual Memory</h4>
                  <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>Chat naturally. DocMind remembers previous messages in your session.</p>
                </div>
                <div style={{ padding: '24px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ffedd5', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '16px' }}>📄</div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '16px', fontWeight: '700' }}>Multi-Format</h4>
                  <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>Upload PDF, DOCX, and XLSX. Text is extracted and indexed seamlessly.</p>
                </div>
              </div>
            </div>

          ) : (
            messages.map((msg, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '16px', flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                
                {/* Colorful Avatars */}
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', background: msg.sender === 'user' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'linear-gradient(135deg, #10b981, #34d399)', color: 'white', flexShrink: 0, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                  {msg.sender === 'user' ? '👤' : '🤖'}
                </div>

                <div style={{ 
                    padding: '16px 20px', 
                    borderRadius: msg.sender === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px', 
                    background: msg.sender === 'user' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#ffffff', 
                    color: msg.sender === 'user' ? '#ffffff' : '#1e293b', 
                    border: msg.sender === 'user' ? 'none' : '1px solid #e2e8f0',
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
                    <div style={{ marginTop: '12px', fontSize: '12px', color: '#64748b', borderTop: msg.sender === 'user' ? '1px solid rgba(255,255,255,0.2)' : '1px solid #e2e8f0', paddingTop: '10px' }}>
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
               <div style={{ padding: '14px 20px', borderRadius: '20px', background: '#ffffff', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '14px', fontStyle: 'italic', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
                 Searching knowledge base...
               </div>
             </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Floating Gradient Input Area */}
        <div style={{ padding: '0 40px 40px 40px', backgroundColor: 'transparent' }}>
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '12px', backgroundColor: '#ffffff', padding: '8px 8px 8px 16px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.08)' }}>
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask a question about your documents..."
              style={{ flex: 1, padding: '12px 0', border: 'none', outline: 'none', fontSize: '15px', backgroundColor: 'transparent', color: '#0f172a' }}
            />
            <button type="submit" disabled={loadingAnswer || !inputQuery.trim()} style={{ padding: '12px 28px', borderRadius: '12px', background: inputQuery.trim() ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#cbd5e1', color: 'white', border: 'none', cursor: inputQuery.trim() ? 'pointer' : 'not-allowed', fontWeight: '700', transition: 'all 0.3s', boxShadow: inputQuery.trim() ? '0 4px 10px rgba(99, 102, 241, 0.3)' : 'none' }}>
              Send
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default ChatWindow;