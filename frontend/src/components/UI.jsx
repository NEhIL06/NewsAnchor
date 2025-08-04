import { useRef, useState, useEffect } from "react";
import { Mic, Send, Globe, CreditCard, Train, HelpCircle, Volume2, DollarSign, FileText, Banknote, Receipt } from "lucide-react";
import { useChat } from "../hooks/useChat";

// Enhanced Firefly Animation Component
const FireflyAnimation = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {[...Array(15)].map((_, i) => (
        <div
          key={i}
          className="absolute w-0.5 h-0.5 bg-white rounded-full opacity-60"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 8}s`,
            animationDuration: `${12 + Math.random() * 15}s`,
            animation: 'firefly linear infinite'
          }}
        >
          <div className="w-full h-full bg-white rounded-full animate-pulse shadow-sm shadow-white" />
        </div>
      ))}
    </div>
  );
};

export const UI = ({ hidden, ...props }) => {
  const input = useRef();
  const { chat, loading, cameraZoomed, setCameraZoomed, message } = useChat();
  const [isRecording, setIsRecording] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const recognitionRef = useRef(null);

  const languages = [
    { code: 'en', name: 'English', short: 'EN' },
    { code: 'hi', name: 'हिंदी', short: 'हि' },
    { code: 'es', name: 'Español', short: 'ES' },
    { code: 'zh', name: '中文', short: '中' },
    { code: 'fr', name: 'Français', short: 'FR' },
    { code: 'ar', name: 'العربية', short: 'عر' }
  ];

 
  useEffect(() => {
    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      setupRecognition();
    }
  }, []);

  const setupRecognition = () => {
    if (!recognitionRef.current) return;

    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      
      if (input.current) {
        input.current.value = transcript;
      }

      if (event.results[0].isFinal) {
        sendMessage(transcript);
      }
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };
  };

  const sendMessage = (text) => {
    if (!loading && !message && text) {
      chat(text);
      if (input.current) {
        input.current.value = "";
      }
    }
  };

  const toggleRecording = async () => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Failed to start recording:', error);
      }
    }
  };

  if (hidden) {
    return null;
  }

  return (
    <>
      <style jsx>{`
        @keyframes firefly {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
          25% { transform: translate(80px, -60px) scale(1.2); opacity: 0.8; }
          50% { transform: translate(-100px, 80px) scale(0.8); opacity: 0.4; }
          75% { transform: translate(60px, 40px) scale(1.1); opacity: 0.7; }
        }
      `}</style>

      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      
      {/* Firefly animation */}
      <FireflyAnimation />

      <div className="fixed inset-0 z-10 flex flex-col pointer-events-none">
        
        {/* Header - Minimalist */}
        <div className="flex justify-between items-start p-6">
          <div className="flex items-center gap-3 pointer-events-auto">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            </div>
            <div>
              <h1 className="text-white font-light text-xl tracking-wide">AVANTI Assistant</h1>
              <p className="text-slate-400 text-xs">Your multilingual helper</p>
            </div>
          </div>

          {/* Language Selector - Minimalist */}
          <div className="flex gap-1 pointer-events-auto">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLanguage(lang.code)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-all duration-200 ${
                  selectedLanguage === lang.code
                    ? 'bg-emerald-500 text-white shadow-lg'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20 backdrop-blur-sm'
                }`}
              >
                {lang.short}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col justify-center items-center px-6">
          

          
        </div>

        {/* Input Area - Bottom */}
        <div className="p-6 pointer-events-auto">
          <div className="max-w-2xl mx-auto">
            
            {/* Status Indicator */}
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 text-sm text-slate-400">
                <Volume2 size={16} />
                <span>Speak clearly or type your question</span>
              </div>
            </div>

            {/* Input Container */}
            <div className="relative">
              <input
                ref={input}
                className="w-full h-14 pl-6 pr-24 rounded-full bg-white/10 backdrop-blur-md text-white placeholder:text-slate-400 border border-white/20 focus:border-emerald-400/50 focus:outline-none text-lg shadow-2xl"
                placeholder="How can I help you today?"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    sendMessage(input.current.value);
                  }
                }}
              />
              
              {/* Action Buttons */}
              <div className="absolute right-2 top-2 flex gap-2">
                <button
                  onClick={toggleRecording}
                  className={`w-10 h-10 rounded-full transition-all duration-200 flex items-center justify-center ${
                    isRecording 
                      ? 'bg-red-500 shadow-lg shadow-red-500/25 animate-pulse' 
                      : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'
                  }`}
                >
                  <Mic className="text-white" size={18} />
                </button>
                
                <button
                  disabled={loading || message}
                  onClick={() => sendMessage(input.current.value)}
                  className={`w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 transition-all duration-200 flex items-center justify-center shadow-lg shadow-emerald-500/25 ${
                    loading || message ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <Send className="text-white" size={18} />
                </button>
              </div>
            </div>

            {/* Help Text */}
            <div className="text-center mt-4">
              <p className="text-slate-500 text-sm">
                I can help with check deposits, balance inquiries, and more
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UI;