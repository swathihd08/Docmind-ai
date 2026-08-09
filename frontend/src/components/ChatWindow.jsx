import React, { useState } from 'react';
import { uploadDocument, askQuestion } from '../services/api';

const ChatWindow = () => {
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  // Handle File Upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadStatus(`Uploading & processing ${file.name}...`);

    try {
      const data = await uploadDocument(file);
      setUploadStatus(`✅ "${data.filename}" processed and indexed successfully!`);
    } catch (error) {
      console.error('Upload Error:', error);
      setUploadStatus('❌ Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Handle Question Submission
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputQuery.trim() || loadingAnswer) return;

    const userMessage = { sender: 'user', text: inputQuery };
    setMessages((prev) => [...prev, userMessage]);
    setInputQuery('');
    setLoadingAnswer(true);

    try {
      const result = await askQuestion(inputQuery);
      const aiMessage = {
        sender: 'ai',
        text: result.answer,
        citations: result.citations,
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('RAG Error:', error);
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
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>🚀 DocMind AI Assistant</h2>

      {/* Document Upload Section */}
      <div style={{ border: '1px dashed #ccc', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h4>📄 Upload Document (.pdf, .docx, .xlsx)</h4>
        <input type="file" onChange={handleFileUpload} disabled={uploading} accept=".pdf,.docx,.xlsx" />
        {uploadStatus && <p style={{ marginTop: '10px', fontSize: '14px' }}>{uploadStatus}</p>}
      </div>

      {/* Chat Messages Display */}
      <div style={{ height: '400px', overflowY: 'auto', border: '1px solid #ddd', padding: '15px', borderRadius: '8px', marginBottom: '15px', background: '#f9f9f9' }}>
        {messages.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center', marginTop: '150px' }}>Upload a document and ask a question to get started!</p>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} style={{ marginBottom: '15px', textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
              <div
                style={{
                  display: 'inline-block',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: msg.sender === 'user' ? '#007bff' : '#ffffff',
                  color: msg.sender === 'user' ? '#fff' : '#333',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  maxWidth: '75%',
                }}
              >
                <p style={{ margin: 0, fontSize: '15px' }}>{msg.text}</p>
                {msg.citations && msg.citations.length > 0 && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#666', borderTop: '1px solid #eee', paddingTop: '4px' }}>
                    <strong>Sources:</strong> {msg.citations.map((c) => c.filename).join(', ')}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {loadingAnswer && <p style={{ color: '#666', fontStyle: 'italic' }}>DocMind AI is searching documents and thinking...</p>}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="Ask a question about your uploaded documents..."
          style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #ccc' }}
        />
        <button type="submit" disabled={loadingAnswer || !inputQuery.trim()} style={{ padding: '12px 20px', borderRadius: '6px', background: '#007bff', color: '#fff', border: 'none', cursor: 'pointer' }}>
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;