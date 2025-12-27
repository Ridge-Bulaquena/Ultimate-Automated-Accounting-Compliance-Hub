import React, { useState, useEffect, useRef } from 'react';
import { AGENTS, INITIAL_TRANSACTIONS } from './constants';
import { AgentRole, Transaction, FinancialState, Agent, ViewType, ChatMessage } from './types';
import AgentAvatar from './components/AgentAvatar';
import FinancialDashboard from './components/FinancialDashboard';
import { 
  processFinancialInquiry, 
  generateSpeech, 
  decodeAudio, 
  decodeAudioData, 
  Attachment, 
  connectLive, 
  createPcmBlob,
  transcribeAudio
} from './services/geminiService';

const VOICE_OPTIONS = ['Kore', 'Puck', 'Charon', 'Zephyr', 'Fenrir'];

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('setup');
  const [selectedAgentId, setSelectedAgentId] = useState<AgentRole | null>(null);
  const [agents, setAgents] = useState<Agent[]>(AGENTS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isSystemInitialized, setIsSystemInitialized] = useState(false);
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [kpis, setKpis] = useState<FinancialState>({ cash: 0, unpaidTax: 0, payrollLiability: 0, riskScore: 0, runwayMonths: 0 });

  // Live API States
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState('');
  const sessionRef = useRef<any>(null);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const currentTtsSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, liveTranscription]);

  // Initial greeting
  useEffect(() => {
    if (isSystemInitialized && chatHistory.length === 1) { // Just after "Wake the Swarm"
      const greeting = "Hello. I am RuleKeeper. The swarm nodes are synchronized. I am ready to process your enterprise data. How can I assist you today?";
      speakText(greeting);
    }
  }, [isSystemInitialized]);

  const stopAllAiSpeech = () => {
    // Stop TTS
    if (currentTtsSourceRef.current) {
      try {
        currentTtsSourceRef.current.stop();
      } catch (e) {}
      currentTtsSourceRef.current = null;
    }
    // Stop Live Audio Queue
    activeSourcesRef.current.forEach(s => {
      try {
        s.stop();
      } catch (e) {}
    });
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  };

  const handleAgentClick = async (agentId: AgentRole) => {
    stopAllAiSpeech();
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;
    
    setSelectedAgentId(agentId);
    setActiveView('agent-detail');

    const greeting = `Hello. I am the ${agent.name}. I specialize in ${agent.specialization}. ${agent.role} How can I assist you today?`;
    
    if (isLiveActive) {
      sessionRef.current?.then((session: any) => {
        session.send({ text: `Focus session on agent node: ${agent.name}` });
      });
    } else {
      speakText(greeting);
    }
  };

  const speakText = async (text: string) => {
    if (isLiveActive) return; 
    
    stopAllAiSpeech();

    const audioBase64 = await generateSpeech(text, selectedVoice);
    if (audioBase64) {
      if (!audioContextOutRef.current) {
        audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextOutRef.current;
      const audioBytes = decodeAudio(audioBase64);
      const audioBuffer = await decodeAudioData(audioBytes, ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      currentTtsSourceRef.current = source;
      source.start();
      source.onended = () => {
        if (currentTtsSourceRef.current === source) {
          currentTtsSourceRef.current = null;
        }
      };
    }
  };

  const startLiveSession = async () => {
    if (isLiveActive) {
      stopLiveSession();
      return;
    }

    stopAllAiSpeech();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const sessionPromise = connectLive({
        onopen: () => {
          setIsLiveActive(true);
          const source = audioContextInRef.current!.createMediaStreamSource(stream);
          const scriptProcessor = audioContextInRef.current!.createScriptProcessor(4096, 1, 1);
          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmBlob = createPcmBlob(inputData);
            sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
          };
          source.connect(scriptProcessor);
          scriptProcessor.connect(audioContextInRef.current!.destination);
        },
        onmessage: async (message) => {
          if (message.serverContent?.outputTranscription) {
            setLiveTranscription(prev => prev + message.serverContent!.outputTranscription!.text);
          }
          if (message.serverContent?.turnComplete) {
            setChatHistory(prev => {
              if (liveTranscription) {
                return [...prev, {
                  id: Math.random().toString(),
                  role: 'assistant',
                  content: liveTranscription,
                  timestamp: new Date().toLocaleTimeString()
                }];
              }
              return prev;
            });
            setLiveTranscription('');
          }

          const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64Audio && audioContextOutRef.current) {
            const ctx = audioContextOutRef.current;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
            const audioBuffer = await decodeAudioData(decodeAudio(base64Audio), ctx, 24000, 1);
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            activeSourcesRef.current.add(source);
            source.onended = () => activeSourcesRef.current.delete(source);
          }

          if (message.serverContent?.interrupted) {
            // Live interruption handled here: model detected user speaking
            activeSourcesRef.current.forEach(s => {
              try { s.stop(); } catch(e) {}
            });
            activeSourcesRef.current.clear();
            nextStartTimeRef.current = 0;
          }
        },
        onerror: (e) => console.error("Live Error:", e),
        onclose: () => setIsLiveActive(false)
      });

      sessionRef.current = sessionPromise;
    } catch (err) {
      console.error("Failed to start live session:", err);
    }
  };

  const stopLiveSession = () => {
    sessionRef.current?.then((session: any) => session.close());
    sessionRef.current = null;
    setIsLiveActive(false);
    audioContextInRef.current?.close();
    audioContextOutRef.current?.close();
  };

  const runRecursiveCheck = async (userQuery: string, currentAttachments: Attachment[] = []) => {
    stopAllAiSpeech();
    setIsProcessing(true);
    
    const userMsg: ChatMessage = { 
      id: Math.random().toString(36).substr(2, 9),
      role: 'user', 
      content: userQuery, 
      timestamp: new Date().toLocaleTimeString() 
    };
    setChatHistory(prev => [...prev, userMsg]);
    setAgents(prev => prev.map(a => ({ ...a, status: 'processing' })));
    
    const context = { transactions: transactions.slice(-10), kpis, view: activeView, selectedAgent: selectedAgentId };
    
    const result = await processFinancialInquiry(userQuery, context, currentAttachments);
    
    if (result) {
      if (result.kpis) {
        setKpis({
          cash: result.kpis.cash,
          unpaidTax: result.kpis.taxLiability,
          payrollLiability: kpis.payrollLiability,
          riskScore: result.kpis.riskScore,
          runwayMonths: result.kpis.runway
        });
        setIsSystemInitialized(true);
        if (activeView === 'setup') setActiveView('hub');
      }

      const agentDataLogs = result.agentDetails?.map((d: any) => ({
        agentId: d.agent as AgentRole,
        recursiveLog: d.recursiveLog,
        refinementLog: d.refinementLog
      }));

      const aiMsg: ChatMessage = { 
        id: Math.random().toString(36).substr(2, 9),
        role: 'assistant', 
        content: result.summary, 
        timestamp: new Date().toLocaleTimeString(),
        agentDetails: agentDataLogs
      };
      setChatHistory(prev => [...prev, aiMsg]);

      if (result.agentDetails) {
        setAgents(prev => prev.map(agent => {
          const detail = result.agentDetails.find((d: any) => d.agent === agent.id);
          if (detail) {
            return {
              ...agent,
              status: detail.status === 'alert' ? 'alerting' : 'idle',
              subAgents: [
                { ...agent.subAgents[0], status: 'complete', output: detail.recursiveLog },
                { ...agent.subAgents[1], status: 'complete', output: detail.refinementLog }
              ]
            };
          }
          return { ...agent, status: 'idle' };
        }));
      }

      speakText(result.summary);
    }

    setIsProcessing(false);
    setAttachments([]);
  };

  const handleQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() && attachments.length === 0) return;
    runRecursiveCheck(query, attachments);
    setQuery('');
  };

  const toggleVoiceRecording = async () => {
    if (isRecording) {
      // Stop recording and process
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        setIsTranscribing(true);
      }
    } else {
      // Interruption: if user starts recording, AI stops speaking immediately
      stopAllAiSpeech();

      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        
        mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
        
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            const transcribedText = await transcribeAudio(base64Audio);
            if (transcribedText) {
              setQuery(transcribedText);
              runRecursiveCheck(transcribedText);
            }
            setIsTranscribing(false);
          };
          mediaRecorder.stream.getTracks().forEach(t => t.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Audio capture failed:", err);
      }
    }
  };

  const renderSetupView = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-12 bg-alabaster animate-reveal stagger-1">
      <div className="w-24 h-24 bg-navy rounded-pill flex items-center justify-center mb-10 shadow-xl shadow-navy/20 animate-reveal stagger-2">
        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
      </div>
      <h2 className="text-5xl font-black text-navy mb-4 animate-reveal stagger-3 tracking-tighter uppercase">Swarm Mesh Ready</h2>
      <p className="text-slateBlue text-center max-w-lg mb-12 font-medium text-lg leading-relaxed animate-reveal stagger-4">RuleKeeper 12-Agent swarm protocol is online. Initializing recursive logic loops for enterprise truth verification.</p>
      <button 
        onClick={() => { setTransactions(INITIAL_TRANSACTIONS); runRecursiveCheck("Sync and verify records."); }} 
        className="premium-button px-16 py-6 uppercase tracking-[0.3em] text-sm animate-reveal stagger-5"
      >
        Authorize Collective Intelligence
      </button>
    </div>
  );

  const renderAgentDetail = () => {
    const agent = agents.find(a => a.id === selectedAgentId);
    if (!agent) return null;
    return (
      <div className="flex-1 flex flex-col p-10 bg-white animate-reveal h-full overflow-hidden">
        <div className="flex justify-between items-center mb-12 animate-reveal stagger-1">
          <div className="flex items-center gap-8">
            <AgentAvatar agent={agent} size="md" />
            <div>
              <h2 className="text-4xl font-black text-navy uppercase tracking-tighter">{agent.name}</h2>
              <p className="text-slateBlue text-[13px] font-black uppercase tracking-[0.5em] mt-2 opacity-60">{agent.specialization}</p>
            </div>
          </div>
          <button 
            onClick={() => { stopAllAiSpeech(); setActiveView('hub'); }} 
            className="premium-button px-10 py-4 text-[11px] font-black uppercase"
          >
            Close Terminal
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 h-full pb-20 overflow-y-auto custom-scrollbar pr-2">
          {agent.subAgents.map((sub, i) => (
            <div key={i} className={`flex flex-col bg-alabaster border border-slate-200 rounded-[48px] p-12 business-shadow animate-reveal stagger-${i+2}`}>
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h3 className={`text-[14px] font-black uppercase tracking-[0.2em] ${sub.type === 'recursive' ? 'text-navy' : 'text-slateBlue'}`}>
                    {sub.type === 'recursive' ? 'Logic Synthesis' : 'Domain Output'}
                  </h3>
                  <p className="text-[11px] text-slateBlue/50 font-mono mt-2">AGENT_ID: {sub.name.toUpperCase()}</p>
                </div>
                {(sub.status === 'processing' || isProcessing) && (
                   <div className="flex gap-2">
                     <div className="w-2.5 h-2.5 bg-navy rounded-full animate-bounce" />
                     <div className="w-2.5 h-2.5 bg-navy rounded-full animate-bounce [animation-delay:0.2s]" />
                     <div className="w-2.5 h-2.5 bg-navy rounded-full animate-bounce [animation-delay:0.4s]" />
                   </div>
                )}
              </div>
              <div className="flex-1 font-mono text-[13px] text-gray-600 overflow-y-auto leading-relaxed p-8 bg-white border border-slate-100 rounded-[32px] whitespace-pre-wrap">
                {sub.output || "Establishing secure logic connection... syncing with master ledger..."}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderHubView = () => (
    <div className="flex-1 flex flex-col h-full bg-alabaster overflow-hidden animate-reveal">
      <div className="p-10 border-b border-slate-200 bg-white animate-reveal stagger-1">
        <FinancialDashboard />
      </div>
      <div className="flex-1 overflow-y-auto p-12 custom-scrollbar space-y-12 animate-reveal stagger-2">
        {chatHistory.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-reveal`}>
            <div className={`max-w-[70%] p-10 rounded-[48px] ${msg.role === 'user' ? 'bg-navy text-white shadow-2xl' : 'bg-white border border-slate-200 text-navy business-shadow'} transition-all`}>
              <div className="flex justify-between items-center mb-6 gap-8">
                <span className={`text-[10px] font-black uppercase tracking-[0.4em] ${msg.role === 'user' ? 'text-slate-400' : 'text-slateBlue'}`}>
                  {msg.role === 'assistant' ? 'Autonomous Report' : 'Executive Input'}
                </span>
                <span className="text-[9px] font-mono opacity-30">{msg.timestamp}</span>
              </div>
              <p className="text-[16px] leading-relaxed font-normal whitespace-pre-wrap">{msg.content}</p>
              
              {msg.agentDetails && (
                <div className="mt-10 pt-10 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {msg.agentDetails.slice(0, 4).map((detail, dIdx) => (
                    <div 
                      key={dIdx} 
                      onClick={() => handleAgentClick(detail.agentId)} 
                      className="bg-alabaster p-6 rounded-[32px] border border-slate-200 cursor-pointer hover:border-navy hover:bg-white transition-all group"
                    >
                      <p className="text-[10px] font-black text-navy uppercase tracking-[0.2em] mb-4 flex items-center justify-between">
                        {detail.agentId}
                        <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7-7 7" /></svg>
                      </p>
                      <div className="text-[12px] text-slate-500 font-medium leading-relaxed italic line-clamp-3">
                        {detail.refinementLog}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {liveTranscription && (
           <div className="flex justify-start animate-reveal">
             <div className="max-w-[70%] p-10 rounded-[48px] bg-white border border-slate-200 text-navy italic shadow-sm">
               <span className="text-[9px] font-black uppercase tracking-widest text-slateBlue block mb-2 opacity-50">Live Syncing...</span>
               {liveTranscription}
             </div>
           </div>
        )}
        {isProcessing && (
          <div className="flex justify-start animate-reveal">
            <div className="bg-white border border-slate-200 p-8 rounded-pill text-[12px] font-black uppercase tracking-[0.5em] text-navy flex items-center gap-6 business-shadow">
              <div className="w-3 h-3 bg-navy rounded-full animate-ping" />
              Swarm Processing Recursive Loops
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-alabaster text-navy font-sans overflow-hidden">
      <header className="border-b border-slate-200 h-24 flex items-center justify-between px-12 bg-white z-50 shrink-0">
        <div className="flex items-center gap-6">
          <div onClick={() => { stopAllAiSpeech(); setActiveView('hub'); }} className="w-14 h-14 rounded-[24px] bg-navy flex items-center justify-center font-black text-white hover:scale-105 transition-all cursor-pointer shadow-lg shadow-navy/10">RK</div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-navy uppercase">RuleKeeper Swarm</h1>
            <p className="text-[11px] text-slateBlue/50 font-bold uppercase tracking-[0.5em] mt-1">Autonomous Multi-Agent Mesh</p>
          </div>
        </div>
        
        {isSystemInitialized && (
          <nav className="flex gap-16">
            {(['hub', 'ledger', 'compliance', 'strategy'] as ViewType[]).map((v) => (
              <button 
                key={v} 
                onClick={() => { stopAllAiSpeech(); setActiveView(v); }} 
                className={`text-[12px] font-black uppercase tracking-[0.4em] transition-all pb-2 border-b-3 ${activeView === v ? 'text-navy border-navy' : 'text-slate-400 border-transparent hover:text-navy'}`}
              >
                {v}
              </button>
            ))}
          </nav>
        )}

        <div className="flex gap-12 items-center">
          <button 
            onClick={startLiveSession}
            className={`flex items-center gap-3 px-8 py-3.5 rounded-pill transition-all ${isLiveActive ? 'bg-navy text-white animate-pulse' : 'bg-white border border-slate-300 text-slateBlue hover:bg-slate-50'}`}
          >
            <div className={`w-2.5 h-2.5 rounded-full ${isLiveActive ? 'bg-white' : 'bg-navy'}`} />
            <span className="text-[11px] font-black uppercase tracking-widest">{isLiveActive ? 'Live Audio' : 'Start Live AI'}</span>
          </button>
          
          <div className="hidden xl:flex items-center gap-5 pr-12 border-r border-slate-200">
             <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">Voice:</p>
             <select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)} className="bg-alabaster text-[11px] font-bold px-6 py-2.5 rounded-pill border border-slate-200 outline-none">
               {VOICE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
             </select>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black font-mono tracking-tighter text-navy">${kpis.cash.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Enterprise Assets</p>
          </div>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <section className="w-80 border-r border-slate-200 p-10 flex flex-col gap-12 bg-white shrink-0 z-40 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-2 animate-reveal stagger-1">
             <h2 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.5em]">Mesh Integrity</h2>
             <div className={`w-3 h-3 rounded-full ${isProcessing || isLiveActive ? 'bg-navy animate-ping' : 'bg-slate-200'}`} />
          </div>
          <div className="grid grid-cols-3 gap-x-6 gap-y-14">
            {agents.map((agent, i) => (
              <div key={agent.id} onClick={() => handleAgentClick(agent.id)} className={`cursor-pointer animate-reveal stagger-${i % 5 + 1}`}>
                <AgentAvatar agent={agent} size="sm" />
              </div>
            ))}
          </div>
          <div className="mt-auto bg-alabaster p-8 rounded-[40px] border border-slate-200 business-shadow animate-reveal stagger-3">
             <p className="text-[11px] font-black text-navy uppercase tracking-widest mb-5">Recursive Sync</p>
             <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-4">
               <div className={`h-full bg-navy transition-all duration-2000 ${isSystemInitialized ? 'w-full' : 'w-0'}`} />
             </div>
             <p className="text-[10px] text-slate-400 font-mono italic">24/24 Autonomous Loops Solid</p>
          </div>
        </section>

        <section className="flex-1 flex flex-col relative bg-alabaster">
          <div className="flex-1 overflow-hidden relative">
            {activeView === 'setup' && renderSetupView()}
            {activeView === 'hub' && renderHubView()}
            {activeView === 'agent-detail' && renderAgentDetail()}
            {(activeView === 'ledger' || activeView === 'compliance' || activeView === 'strategy') && (
               <div className="flex-1 flex flex-col items-center justify-center bg-white gap-8 animate-reveal">
                 <div className="w-16 h-16 border-4 border-navy border-t-transparent rounded-full animate-spin" />
                 <p className="text-[14px] font-black uppercase tracking-[0.8em] text-navy">Syncing Mesh Nodes...</p>
               </div>
            )}
          </div>

          <div className="p-12 bg-white border-t border-slate-200 z-50 animate-reveal stagger-5">
            <form onSubmit={handleQuerySubmit} className="max-w-4xl mx-auto flex items-center gap-8">
              <div className="relative flex-1">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 z-10 flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()} 
                    className="p-3.5 rounded-pill bg-white border border-slate-200 text-slate-400 hover:text-navy hover:border-navy transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                  </button>
                </div>
                <input 
                  type="text" 
                  value={query} 
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={isProcessing ? "Convergence in progress..." : isTranscribing ? "Transcribing audio..." : "Consult the collective swarm intelligence..."}
                  disabled={isProcessing || isTranscribing}
                  className="w-full bg-alabaster border border-slate-200 rounded-pill pl-16 pr-20 py-6 text-[16px] font-medium focus:outline-none focus:border-navy transition-all text-navy placeholder:text-slate-300"
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 z-10 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={toggleVoiceRecording}
                    className={`p-4 rounded-full transition-all flex items-center justify-center ${isRecording ? 'bg-navy text-white animate-pulse shadow-xl' : 'text-slate-300 hover:text-navy'}`}
                  >
                    {isRecording ? (
                      <div className="waveform">
                        <div className="waveform-bar"></div>
                        <div className="waveform-bar"></div>
                        <div className="waveform-bar"></div>
                        <div className="waveform-bar"></div>
                        <div className="waveform-bar"></div>
                      </div>
                    ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    )}
                  </button>
                </div>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" multiple />
              <button 
                type="submit" 
                disabled={isProcessing || isTranscribing || (!query.trim() && attachments.length === 0)} 
                className="premium-button h-[72px] px-14 text-[14px] shadow-2xl disabled:opacity-30 uppercase whitespace-nowrap"
              >
                {isProcessing ? 'Thinking...' : 'Consult Swarm'}
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
