import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, Settings, Trash2, Loader2 } from 'lucide-react';

export default function App() {
  const [conversations, setConversations] = useState([]);
  const [currentConvId, setCurrentConvId] = useState(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef(null);

  const currentConv = conversations.find(c => c.id === currentConvId);

  // Load initial data
  useEffect(() => {
    const savedConvs = typeof window !== 'undefined' ? localStorage.getItem('conversations') : null;
    const savedApiKey = typeof window !== 'undefined' ? localStorage.getItem('claude-api-key') : null;
    
    if (savedConvs) {
      const parsed = JSON.parse(savedConvs);
      setConversations(parsed);
      if (parsed.length > 0) setCurrentConvId(parsed[0].id);
    }
    
    if (savedApiKey) {
      setApiKey(savedApiKey);
    } else {
      setShowSettings(true);
    }
  }, []);

  // Sync to LocalStorage
  useEffect(() => {
    if (conversations.length > 0 && typeof window !== 'undefined') {
      localStorage.setItem('conversations', JSON.stringify(conversations));
    }
  }, [conversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConv?.messages]);

  const saveApiKey = () => {
    localStorage.setItem('claude-api-key', apiKey);
    setShowSettings(false);
  };

  const createNewConversation = () => {
    const newConv = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: Date.now()
    };
    setConversations(prev => [newConv, ...prev]);
    setCurrentConvId(newConv.id);
  };

  const deleteConversation = (id) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (currentConvId === id) {
      setCurrentConvId(null);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !apiKey || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    };

    let convId = currentConvId;
    if (!convId) {
      const newConv = {
        id: Date.now().toString(),
        title: input.trim().slice(0, 50),
        messages: [userMessage],
        createdAt: Date.now()
      };
      setConversations(prev => [newConv, ...prev]);
      setCurrentConvId(newConv.id);
      convId = newConv.id;
    } else {
      setConversations(prev => prev.map(c =>
        c.id === convId ? { ...c, messages: [...c.messages, userMessage] } : c
      ));
    }

    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('https://anthropic.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'dangerously-allow-browser': 'true' // Required for client-side testing, but NOT recommended for production
        },
        body: JSON.stringify({
          model: 'claude-3-opus-20240229',
          max_tokens: 4096,
          messages: [
            { role: 'user', content: userMessage.content }
          ]
        })
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      
      const data = await response.json();
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content[0].text,
        timestamp: Date.now()
      };

      setConversations(prev => prev.map(c =>
        c.id === convId ? { ...c, messages: [...c.messages, assistantMessage] } : c
      ));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="font-bold text-xl text-slate-800">Claude AI</h1>
          </div>
          <button
            onClick={createNewConversation}
            className="w-full px-4 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-all"
          >
            + New Chat
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => setCurrentConvId(conv.id)}
              className={`p-3 rounded-lg cursor-pointer flex items-center justify-between group ${
                currentConvId === conv.id ? 'bg-purple-50 border-purple-200 border' : 'hover:bg-slate-50 border-transparent border'
              }`}
            >
              <p className="text-sm font-medium text-slate-700 truncate">{conv.title}</p>
              <button onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}>
                <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 border-t">
          <button onClick={() => setShowSettings(true)} className="w-full flex items-center justify-center gap-2 p-2 hover:bg-slate-100 rounded-lg">
            <Settings className="w-4 h-4" /> Settings
          </button>
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col relative bg-white">
        {showSettings && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 w-96">
              <h2 className="text-xl font-bold mb-4">API Settings</h2>
              <input 
                type="password" 
                value={apiKey} 
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter Anthropic API Key"
                className="w-full p-2 border rounded mb-4"
              />
              <button onClick={saveApiKey} className="w-full bg-purple-600 text-white p-2 rounded-lg">Save Key</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {currentConv?.messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-4 rounded-2xl ${m.role === 'user' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                {m.content}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 border-t">
          <div className="flex gap-4 max-w-4xl mx-auto">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask Claude anything..."
              className="flex-1 p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading}
              className="p-3 bg-purple-600 text-white rounded-xl disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
