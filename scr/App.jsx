import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, Settings, Trash2 } from 'lucide-react';

export default function App() {
  const [conversations, setConversations] = useState([]);
  const [currentConvId, setCurrentConvId] = useState(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef(null);

  const currentConv = conversations.find(c => c.id === currentConvId);

  useEffect(() => {
    const savedConvs = localStorage.getItem('conversations');
    const savedApiKey = localStorage.getItem('claude-api-key');

    if (savedConvs) {
      const parsed = JSON.parse(savedConvs);
      setConversations(parsed);
      if (parsed.length > 0) {
        setCurrentConvId(parsed[0].id);
      }
    }

    if (savedApiKey) {
      setApiKey(savedApiKey);
    } else {
      setShowSettings(true);
    }
  }, []);

  useEffect(() => {
    if (conversations.length > 0) {
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
      setCurrentConvId(conversations[0]?.id || null);
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
        messages: [],
        createdAt: Date.now()
      };
      setConversations(prev => [newConv, ...prev]);
      convId = newConv.id;
      setCurrentConvId(convId);
    }

    setConversations(prev => prev.map(c =>
      c.id === convId
        ? { ...c, messages: [...c.messages, userMessage] }
        : c
    ));

    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-opus-4-7',
          max_tokens: 16000,
          thinking: { type: 'adaptive' },
          output_config: { effort: 'high' },
          messages: [
            ...conversations.find(c => c.id === convId)?.messages.map(m => ({
              role: m.role,
              content: m.content
            })) || [],
            { role: 'user', content: userMessage.content }
          ],
          system: `You are Claude, an advanced AI assistant created by Anthropic. You have extensive knowledge across:
- Information Technology: Programming in all major languages (Python, JavaScript, TypeScript, Java, C++, Rust, Go, etc.), software architecture, databases, DevOps, cloud computing, cybersecurity
- Computer Science: Algorithms, data structures, artificial intelligence, machine learning, computational theory
- Sciences: Physics, Chemistry, Biology and their various branches
- Mathematics: Algebra, Calculus, Statistics, Discrete Math, and more

You provide thoughtful, accurate, and well-reasoned responses. You can write code, solve complex problems, explain scientific concepts, and assist with a wide range of technical and scientific questions. You are loyal to helping the user achieve their goals while maintaining high standards of accuracy and helpfulness.`
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const assistantContent = data.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n');

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent,
        timestamp: Date.now()
      };

      setConversations(prev => prev.map(c =>
        c.id === convId
          ? {
              ...c,
              messages: [...c.messages, assistantMessage],
              title: c.title === 'New Chat' ? input.trim().slice(0, 50) : c.title
            }
          : c
      ));
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        timestamp: Date.now()
      };
      setConversations(prev => prev.map(c =>
        c.id === convId
          ? { ...c, messages: [...c.messages, errorMessage] }
          : c
      ));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="size-full flex bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl text-slate-800">Claude AI</h1>
              <p className="text-xs text-slate-500">Advanced Intelligence</p>
            </div>
          </div>
          <button
            onClick={createNewConversation}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-lg transition-all"
          >
            + New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {conversations.map(conv => (
            <div
              key={conv.id}
              onClick={() => setCurrentConvId(conv.id)}
              className={`p-3 rounded-lg cursor-pointer transition-all group flex items-center justify-between ${
                currentConvId === conv.id
                  ? 'bg-purple-50 border border-purple-200'
                  : 'hover:bg-slate-50 border border-transparent'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {conv.title}
                </p>
                <p className="text-xs text-slate-500">
                  {conv.messages.length} messages
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conv.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 rounded transition-all"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-200">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium flex items-center justify-center gap-2 transition-all"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {showSettings && (
          <div className="p-6 bg-yellow-50 border-b border-yellow-200">
            <h3 className="font-semibold text-slate-800 mb-3">API Configuration</h3>
            <div className="flex gap-3">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Anthropic API key"
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={saveApiKey}
                className="px-6 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-all"
              >
                Save
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-2">
              Get your API key from{' '}
              <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-purple-600 underline">
                console.anthropic.com
              </a>
            </p>
          </div>
        )}

        {!currentConv ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Bot className="w-14 h-14 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-slate-800 mb-2">
                Welcome to Claude AI
              </h2>
              <p className="text-slate-600 mb-6 max-w-md">
                An advanced AI assistant with comprehensive knowledge across IT, Science, Programming, and more.
              </p>
              <button
                onClick={createNewConversation}
                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:shadow-xl transition-all"
              >
                Start Chatting
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {currentConv.messages.map(message => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-3xl px-5 py-3 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        : 'bg-white border border-slate-200 text-slate-800'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words leading-relaxed">
                      {message.content}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div className="bg-white border border-slate-200 px-5 py-3 rounded-2xl">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-6 bg-white border-t border-slate-200">
              <div className="max-w-4xl mx-auto flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Ask me anything about coding, science, or technology..."
                  disabled={isLoading || !apiKey}
                  className="flex-1 px-5 py-3.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !input.trim() || !apiKey}
                  className="px-6 py-3.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Send
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}  
    
