import React, { useState, useEffect, useRef } from "react";
import { 
  Play, 
  Pause, 
  Square, 
  Search, 
  Settings, 
  Volume2, 
  Sparkles, 
  ExternalLink, 
  ChevronRight, 
  ChevronLeft, 
  Menu, 
  X, 
  VolumeX, 
  Bookmark, 
  Globe, 
  AlertCircle,
  HelpCircle,
  CheckCircle,
  ArrowRight,
  Maximize2
} from "lucide-react";

interface Block {
  type: string;
  text: string;
  id: string;
}

export default function App() {
  // URLs and Loading States
  const [url, setUrl] = useState("www.matchin.com.br");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [corsFallbackActive, setCorsFallbackActive] = useState(false);
  
  // Document state
  const [documentTitle, setDocumentTitle] = useState("A Nova Era da Interação Digital através da Voz");
  const [blocks, setBlocks] = useState<Block[]>([
    {
      id: "b-1",
      type: "h1",
      text: "A Nova Era da Interação Digital através da Voz"
    },
    {
      id: "b-2",
      type: "p",
      text: "Inteligência artificial não é apenas sobre processamento de dados, mas sobre como humanizamos a tecnologia. O ato de ouvir um texto transforma a percepção do conteúdo, permitindo uma imersão profunda enquanto o usuário se move pelo mundo físico."
    },
    {
      id: "b-3",
      type: "p",
      text: "Neste contexto, a ferramenta Matchin surge como uma ponte entre o visual e o auditivo. Ao converter páginas complexas em narrativas fluidas, democratizamos o acesso à informação para quem prefere ou necessita do consumo via áudio."
    },
    {
      id: "b-4",
      type: "p",
      text: "A precisão da inteligência artificial em detectar nuances tonais garante que a leitura não seja mecânica, mas sim uma experiência editorial de alta qualidade."
    },
    {
      id: "b-5",
      type: "h2",
      text: "Benefícios do Consumo Auditivo de Conteúdo"
    },
    {
      id: "b-6",
      type: "p",
      text: "Ao transformar artigos e notícias em podcasts instantâneos, aumentamos a retenção de conteúdo em até 40% para pessoas com estilo de vida ativo ou que possuem preferências visuais reduzidas."
    }
  ]);

  // TTS Voice Synthesis States
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("");
  const [rate, setRate] = useState<number>(1.1);
  const [volume, setVolume] = useState<number>(0.9);
  const [isMuted, setIsMuted] = useState(false);
  
  // Reading state
  const [currentBlockIndex, setCurrentBlockIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Word highlighting state inside the current reading block (if browser supports boundary events)
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(-1);
  const [currentWordLength, setCurrentWordLength] = useState<number>(0);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOccurrences, setSearchOccurrences] = useState<number>(0);
  const [currentSearchMatchIndex, setCurrentSearchMatchIndex] = useState<number>(0);
  
  // UI Panel Toggle for mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Speech synthesis reference
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const activeBlockRef = useRef<HTMLDivElement | null>(null);

  // Initialize Speech Voices
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
      
      const updateVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
        
        // Auto select a Portuguese voice if available, else standard
        const ptVoice = availableVoices.find(v => v.lang.toLowerCase().includes("pt-br") || v.lang.toLowerCase().includes("pt-"));
        if (ptVoice) {
          setSelectedVoiceURI(ptVoice.voiceURI);
        } else if (availableVoices.length > 0) {
          setSelectedVoiceURI(availableVoices[0].voiceURI);
        }
      };

      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Show status toasts
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Perform phrase/word searches
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchOccurrences(0);
      setCurrentSearchMatchIndex(0);
      return;
    }

    let count = 0;
    const query = searchQuery.toLowerCase();
    blocks.forEach(block => {
      const text = block.text.toLowerCase();
      let pos = text.indexOf(query);
      while (pos !== -1) {
        count++;
        pos = text.indexOf(query, pos + 1);
      }
    });
    setSearchOccurrences(count);
    setCurrentSearchMatchIndex(count > 0 ? 1 : 0);
  }, [searchQuery, blocks]);

  // Handle Fetch Webpage (First tries Server, falls back to direct AllOrigins CORS fetch)
  const handleLoadPage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setCorsFallbackActive(false);
    stopReading();

    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = "https://" + targetUrl;
    }

    try {
      // 1st Attempt: Node server
      const res = await fetch(`/api/fetch-page?url=${encodeURIComponent(targetUrl)}`);
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      if (data.blocks && data.blocks.length > 0) {
        setDocumentTitle(data.title || "Página Carregada");
        const formattedBlocks = data.blocks.map((b: any, index: number) => ({
          id: `b-api-${index}`,
          type: b.type || "p",
          text: b.text
        }));
        setBlocks(formattedBlocks);
        setCurrentBlockIndex(-1);
        triggerToast("Página carregada via Servidor Matchin!");
      } else {
        throw new Error("Nenhum parágrafo legível encontrado.");
      }
    } catch (err: any) {
      console.warn("Server fetch failed, falling back to CORS proxy: ", err.message);
      setCorsFallbackActive(true);
      triggerToast("Buscando via proxy allorigins.win...");

      try {
        // 2nd Attempt: Secure CORS Proxy directly to browser
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
        const corsRes = await fetch(proxyUrl);
        if (!corsRes.ok) {
          throw new Error("Não foi possível carregar o conteúdo mesmo através do proxy seguro.");
        }
        
        const corsData = await corsRes.json();
        const htmlString = corsData.contents;

        if (!htmlString) {
          throw new Error("Resposta do proxy vazia.");
        }

        // Parse HTML client-side
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, "text/html");

        // Extract title
        const parsedTitle = doc.querySelector("title")?.textContent?.trim() || "Página da Web";
        
        // Exclude unwanted tags
        const scriptStyle = doc.querySelectorAll("script, style, head, header, footer, nav, aside, iframe, noscript");
        scriptStyle.forEach(el => el.remove());

        // Extract headings and paragraphs
        const elements = doc.querySelectorAll("h1, h2, h3, h4, h5, h6, p, li");
        const clientBlocks: Block[] = [];
        
        elements.forEach((el, index) => {
          const text = el.textContent?.trim() || "";
          if (text.length > 10) {
            clientBlocks.push({
              id: `b-cors-${index}`,
              type: el.tagName.toLowerCase(),
              text: text
            });
          }
        });

        if (clientBlocks.length === 0) {
          // Try backup text extraction
          const bodyText = doc.body?.textContent || "";
          const lines = bodyText.split(/\n+/).map(l => l.trim()).filter(l => l.length > 20);
          lines.slice(0, 100).forEach((line, index) => {
            clientBlocks.push({
              id: `b-cors-backup-${index}`,
              type: "p",
              text: line
            });
          });
        }

        if (clientBlocks.length > 0) {
          setDocumentTitle(parsedTitle);
          setBlocks(clientBlocks);
          setCurrentBlockIndex(-1);
          triggerToast("Página carregada com sucesso através de CORS seguro!");
        } else {
          throw new Error("Não foi possível extrair parágrafos de texto legíveis desta URL.");
        }
      } catch (corsErr: any) {
        console.error("CORS proxy failure:", corsErr);
        setError(`Incapaz de acessar o site indicado: ${corsErr.message || corsErr}`);
        triggerToast("Erro de leitura!");
      }
    } finally {
      setLoading(false);
    }
  };

  // Scroll to active block smoothly
  useEffect(() => {
    if (currentBlockIndex >= 0 && activeBlockRef.current) {
      activeBlockRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }
  }, [currentBlockIndex]);

  // Speech Synthesis Control functions
  const stopReading = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentWordIndex(-1);
  };

  const pauseReading = () => {
    if (synthRef.current && isPlaying && !isPaused) {
      synthRef.current.pause();
      setIsPaused(true);
    }
  };

  const resumeReading = () => {
    if (synthRef.current && isPaused) {
      synthRef.current.resume();
      setIsPaused(false);
    } else {
      // Start over or read current
      readBlock(currentBlockIndex >= 0 ? currentBlockIndex : 0);
    }
  };

  const readBlock = (index: number) => {
    if (!synthRef.current || blocks.length === 0) return;

    // Boundary check
    if (index < 0 || index >= blocks.length) {
      stopReading();
      setCurrentBlockIndex(-1);
      triggerToast("Leitura concluída!");
      return;
    }

    // Cancel ongoing
    synthRef.current.cancel();

    const block = blocks[index];
    setCurrentBlockIndex(index);
    setIsPlaying(true);
    setIsPaused(false);
    setCurrentWordIndex(-1);

    const utterance = new SpeechSynthesisUtterance(block.text);
    
    // Config voice
    if (selectedVoiceURI) {
      const selectedVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    utterance.rate = rate;
    utterance.volume = isMuted ? 0 : volume;

    // Track words
    utterance.onboundary = (event) => {
      if (event.name === "word") {
        const textUpToBoundary = block.text.substring(0, event.charIndex);
        const words = textUpToBoundary.trim().split(/\s+/);
        const wordIdx = textUpToBoundary.trim() === "" ? 0 : words.length;
        
        setCurrentWordIndex(wordIdx);
        // Estimate word length
        const remainingText = block.text.substring(event.charIndex);
        const nextSpace = remainingText.search(/\s/);
        const wordLen = nextSpace === -1 ? remainingText.length : nextSpace;
        setCurrentWordLength(wordLen);
      }
    };

    utterance.onend = () => {
      // Auto advance to next block
      if (isPlaying && !isPaused) {
        readBlock(index + 1);
      }
    };

    utterance.onerror = (e) => {
      console.error("SpeechSynthesis error:", e);
      if (e.error !== "interrupted") {
        setIsPlaying(false);
        setIsPaused(false);
      }
    };

    utteranceRef.current = utterance;
    synthRef.current.speak(utterance);
  };

  const playPrevious = () => {
    if (currentBlockIndex > 0) {
      readBlock(currentBlockIndex - 1);
    } else {
      readBlock(0);
    }
  };

  const playNext = () => {
    if (currentBlockIndex < blocks.length - 1) {
      readBlock(currentBlockIndex + 1);
    } else {
      stopReading();
    }
  };

  // Adjust live parameter changes
  useEffect(() => {
    if (isPlaying && !isPaused && currentBlockIndex >= 0) {
      // Re-read current block with updated rate/volume/voice configurations
      readBlock(currentBlockIndex);
    }
  }, [rate, volume, selectedVoiceURI, isMuted]);

  // Formatter to highlight search matches inside text blocks
  const highlightText = (text: string, query: string, blockId: string, isCurrentReadBlock: boolean) => {
    if (!query.trim()) {
      // If no query, and this is the active speaking block, highlight word by word if supported
      if (isCurrentReadBlock && currentWordIndex >= 0) {
        const words = text.split(/(\s+)/);
        let wordCounter = 0;
        return words.map((w, idx) => {
          const isSpace = /^\s+$/.test(w);
          if (!isSpace) {
            const currentWIdx = wordCounter;
            wordCounter++;
            if (currentWIdx === currentWordIndex) {
              return (
                <span key={idx} className="bg-[#c49b66] text-[#0c0c0e] px-1 rounded font-semibold transition-all">
                  {w}
                </span>
              );
            }
          }
          return <span key={idx}>{w}</span>;
        });
      }
      return text;
    }

    const parts = text.split(new RegExp(`(${query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")})`, "gi"));
    return parts.map((part, index) => {
      const matches = part.toLowerCase() === query.toLowerCase();
      return matches ? (
        <mark key={index} className="bg-[#c49b6645] text-white border-b-2 border-[#c49b66] px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      );
    });
  };

  // Setup sample URL shortcuts
  const selectSampleUrl = (sampleUrl: string) => {
    setUrl(sampleUrl);
    triggerToast(`URL alterada para: ${sampleUrl}`);
  };

  // Quick helper to categorize voices
  const ptVoices = voices.filter(v => v.lang.toLowerCase().includes("pt-"));
  const otherVoices = voices.filter(v => !v.lang.toLowerCase().includes("pt-"));

  return (
    <div className="min-h-screen bg-[#0c0c0e] text-[#e0dcd0] font-sans flex flex-col justify-between overflow-x-hidden antialiased">
      
      {/* Toast Alert banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#1e1e24] border border-[#c49b6640] rounded-lg py-3 px-5 text-xs text-white flex items-center gap-3 shadow-2xl animate-fade-in">
          <div className="w-2 h-2 bg-[#c49b66] rounded-full animate-ping"></div>
          <p className="font-mono tracking-wide">{toastMessage}</p>
        </div>
      )}

      {/* Main Header Navigation */}
      <header className="h-20 border-b border-[#ffffff10] flex items-center justify-between px-4 sm:px-8 bg-[#0c0c0e]/95 backdrop-blur sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#c49b66] rounded-full flex items-center justify-center shadow-lg shadow-[#c49b66]/10">
            <Sparkles className="w-4 h-4 text-[#0c0c0e]" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-serif tracking-[0.25em] uppercase text-[#c49b66] font-semibold">Matchin</span>
            <span className="text-[9px] uppercase tracking-widest text-[#a0a0a2] hidden sm:inline">Voz Inteligente</span>
          </div>
        </div>

        {/* Load URL Form */}
        <form onSubmit={handleLoadPage} className="flex-1 max-w-xl mx-4 sm:mx-12">
          <div className="relative flex items-center">
            <input 
              type="text" 
              placeholder="Digite o site ou URL (ex: www.matchin.com.br)..." 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-[#161619] border border-[#ffffff10] focus:border-[#c49b66]/60 rounded-full py-2.5 pl-5 pr-28 text-xs sm:text-sm text-[#e0dcd0] placeholder:text-[#ffffff40] focus:outline-none transition-all shadow-inner"
            />
            <button 
              type="submit" 
              disabled={loading}
              className="absolute right-1.5 bg-[#c49b66] hover:bg-[#b08752] active:scale-95 text-[#0c0c0e] px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-40"
              id="btn-carregar"
            >
              {loading ? "Carregando..." : "Carregar"}
            </button>
          </div>
        </form>

        {/* Header Right Widgets */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 border border-[#ffffff10] rounded-lg bg-[#161619] text-[#c49b66] lg:hidden flex items-center justify-center hover:bg-[#ffffff05] transition-all"
            title="Menu de Voz"
            id="btn-toggle-sidebar"
          >
            {isSidebarOpen ? <X className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
          </button>
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-[#1a1a1e] border border-[#ffffff08] rounded-full text-[10px] font-mono text-[#a0a0a2]">
            <Globe className="w-3 h-3 text-[#c49b66]" />
            <span>matchin.com.br</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row relative">
        
        {/* Sidebar Configuration (Desktop & Mobile Drawer) */}
        <aside className={`
          fixed lg:static inset-y-20 right-0 z-30
          w-76 sm:w-80 lg:w-76 bg-[#0e0e10] border-l lg:border-l-0 lg:border-r border-[#ffffff10] 
          p-6 flex flex-col gap-6 overflow-y-auto transition-transform duration-300
          ${isSidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
        `}>
          
          {/* Section 1: Voice Setup */}
          <section className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#ffffff08]">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#c49b66] font-bold">Ajustes da Voz</h3>
              <span className="text-[9px] px-1.5 py-0.5 bg-[#c49b66]/10 text-[#c49b66] rounded font-mono uppercase">TTS</span>
            </div>

            <div className="space-y-4">
              {/* Persona Select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-[#ffffff50] uppercase tracking-wider">Persona / Idioma</label>
                <div className="relative">
                  <select 
                    value={selectedVoiceURI} 
                    onChange={(e) => setSelectedVoiceURI(e.target.value)}
                    className="w-full bg-[#161619] border border-[#ffffff10] rounded px-3 py-2 text-xs text-[#e0dcd0] focus:outline-none focus:border-[#c49b66] appearance-none cursor-pointer"
                    id="select-voice"
                  >
                    {ptVoices.length > 0 && (
                      <optgroup label="Português (Recomendado)">
                        {ptVoices.map(voice => (
                          <option key={voice.voiceURI} value={voice.voiceURI}>
                            {voice.name.replace("Microsoft", "").replace("Google", "").trim()} ({voice.lang})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {otherVoices.length > 0 && (
                      <optgroup label="Outros Idiomas">
                        {otherVoices.slice(0, 40).map(voice => (
                          <option key={voice.voiceURI} value={voice.voiceURI}>
                            {voice.name.replace("Microsoft", "").replace("Google", "").trim()} ({voice.lang})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {voices.length === 0 && (
                      <option>Voz Padrão do Navegador</option>
                    )}
                  </select>
                </div>
                <p className="text-[9px] text-[#ffffff30] italic">
                  Selecione uma persona local para uma leitura expressiva.
                </p>
              </div>

              {/* Speed Controller */}
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] text-[#ffffff50] uppercase tracking-wider">Velocidade</label>
                  <span className="text-xs font-mono text-[#c49b66] font-semibold">{rate.toFixed(2)}x</span>
                </div>
                <input 
                  type="range" 
                  min="0.5" 
                  max="2.5" 
                  step="0.1" 
                  value={rate} 
                  onChange={(e) => setRate(parseFloat(e.target.value))}
                  className="w-full h-1 bg-[#222226] rounded-lg appearance-none cursor-pointer accent-[#c49b66]"
                  id="range-rate"
                />
                <div className="flex justify-between text-[9px] text-[#ffffff30] font-mono">
                  <span>0.5x (Lento)</span>
                  <span>1.0x (Normal)</span>
                  <span>2.5x (Rápido)</span>
                </div>
              </div>

              {/* Volume Controller */}
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] text-[#ffffff50] uppercase tracking-wider">Volume</label>
                  <div className="flex items-center gap-1.5">
                    <button 
                      type="button"
                      onClick={() => setIsMuted(!isMuted)} 
                      className="text-[#c49b66] hover:text-white transition-colors"
                    >
                      {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                    <span className="text-xs font-mono text-[#c49b66] font-semibold">{isMuted ? "Mutado" : `${Math.round(volume * 100)}%`}</span>
                  </div>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05" 
                  value={volume} 
                  onChange={(e) => {
                    setVolume(parseFloat(e.target.value));
                    if (isMuted) setIsMuted(false);
                  }}
                  className="w-full h-1 bg-[#222226] rounded-lg appearance-none cursor-pointer accent-[#c49b66]"
                  id="range-volume"
                />
              </div>
            </div>
          </section>

          {/* Section 2: Search Within Content */}
          <section className="space-y-4 pt-4 border-t border-[#ffffff08]">
            <div className="flex justify-between items-center pb-2">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#c49b66] font-bold">Localizar no texto</h3>
              <Search className="w-3 h-3 text-[#c49b66]/60" />
            </div>

            <div className="relative">
              <input 
                type="text" 
                placeholder="Buscar palavra ou frase..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#161619] border border-[#ffffff10] focus:border-[#c49b66]/50 rounded-lg py-2.5 px-3.5 text-xs text-[#e0dcd0] placeholder:text-[#ffffff30] focus:outline-none"
                id="input-search"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-3 text-[10px] text-[#ffffff30] hover:text-[#c49b66]"
                >
                  Limpar
                </button>
              )}
            </div>

            {searchQuery.trim() && (
              <div className="p-3 rounded bg-[#161619] border border-[#ffffff05] space-y-2">
                <div className="flex justify-between items-center text-[10px] text-[#ffffff50]">
                  <span>Ocorrências:</span>
                  <span className="font-mono text-[#c49b66] font-bold">
                    {searchOccurrences} {searchOccurrences === 1 ? "encontrada" : "encontradas"}
                  </span>
                </div>
                <p className="text-[9px] text-[#ffffff30] italic leading-relaxed">
                  Os resultados compatíveis estão destacados em amarelo no texto de leitura.
                </p>
              </div>
            )}
          </section>

          {/* Section 3: Preset Websites to test */}
          <section className="space-y-3 pt-4 border-t border-[#ffffff08]">
            <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#c49b66] font-bold">Sugestões de Páginas</h3>
            <div className="space-y-1.5">
              {[
                { label: "Matchin Digital", url: "www.matchin.com.br" },
                { label: "G1 Notícias", url: "g1.globo.com" },
                { label: "Wikipédia Brasil", url: "pt.wikipedia.org" }
              ].map((site, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectSampleUrl(site.url)}
                  className="w-full text-left text-xs p-2 rounded bg-[#161619] border border-[#ffffff04] hover:border-[#c49b66]/30 hover:bg-[#ffffff02] transition-all flex items-center justify-between group"
                >
                  <span className="text-[#ffffff70] group-hover:text-white font-serif">{site.label}</span>
                  <ExternalLink className="w-3 h-3 text-[#c49b66] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </section>

          {/* Server Connection status details */}
          <div className="mt-auto pt-4 border-t border-[#ffffff08]">
            <div className="p-3.5 rounded-xl bg-[#c49b6606] border border-[#c49b6615] space-y-1.5 text-center">
              <div className="flex items-center justify-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${corsFallbackActive ? "bg-amber-400" : "bg-emerald-400"}`}></div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#ffffff70]">
                  {corsFallbackActive ? "CORS Proxy Ativo" : "Servidor Matchin"}
                </span>
              </div>
              <p className="text-[9px] text-[#ffffff40] leading-relaxed">
                {corsFallbackActive 
                  ? "allorigins.win conectado diretamente pelo navegador" 
                  : "API segura ativa com renderizador de parágrafos"}
              </p>
            </div>
          </div>
        </aside>

        {/* Floating backdrop for mobile sidebar */}
        {isSidebarOpen && (
          <div 
            onClick={() => setIsSidebarOpen(false)} 
            className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          ></div>
        )}

        {/* Main Text Render Area */}
        <main className="flex-1 p-5 sm:p-10 lg:p-16 pb-36 overflow-y-auto max-w-4xl mx-auto w-full">
          {error && (
            <div className="mb-8 p-5 rounded-xl bg-red-950/20 border border-red-900/30 text-xs sm:text-sm text-red-200 flex gap-3.5 items-start">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold uppercase tracking-wider text-red-300">Erro de Carregamento</p>
                <p className="opacity-80 leading-relaxed">{error}</p>
                <div className="pt-2">
                  <button 
                    onClick={() => handleLoadPage()} 
                    className="bg-red-900/40 hover:bg-red-900/60 text-white px-3 py-1 rounded text-xs transition-colors font-mono"
                  >
                    Tentar Novamente
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Webpage Reading Card Container */}
          <article className="space-y-8 animate-fade-in">
            {/* Title Metadata */}
            <div className="space-y-3 pb-6 border-b border-[#ffffff10]">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.25em] text-[#c49b66] bg-[#c49b66]/10 px-2 py-0.5 rounded font-mono">
                  {isPlaying ? "Leitura Ativa" : "Pronto para Ouvir"}
                </span>
                {corsFallbackActive && (
                  <span className="text-[10px] uppercase tracking-[0.2em] text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded font-mono">
                    Fallback CORS
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-5xl font-serif text-white tracking-tight leading-[1.15]">
                {documentTitle}
              </h1>
              <p className="text-xs text-[#ffffff40] font-mono flex items-center gap-2">
                <span>Leitor de Páginas Web</span>
                <span>•</span>
                <span className="truncate max-w-xs sm:max-w-md">{url}</span>
              </p>
            </div>

            {/* Block Text Content list */}
            <div className="space-y-6 pt-4 text-sm sm:text-base md:text-lg leading-relaxed font-serif text-[#e0dcd0]/90">
              {blocks.map((block, index) => {
                const isCurrent = index === currentBlockIndex;
                const isHeading = block.type.startsWith("h");
                
                // Styles based on heading type
                let styleClass = "relative rounded-lg px-4 py-3 transition-all duration-300 hover:bg-white/[0.02]";
                if (isCurrent) {
                  styleClass += " bg-[#c49b660a] border-l-4 border-[#c49b66] text-white shadow-md shadow-[#c49b66]/5";
                } else {
                  styleClass += " border-l-4 border-transparent";
                }

                if (block.type === "h1") {
                  styleClass += " text-2xl sm:text-3xl font-bold tracking-tight mt-8 mb-4 text-white";
                } else if (block.type === "h2") {
                  styleClass += " text-xl sm:text-2xl font-semibold mt-7 mb-3 text-white";
                } else if (block.type === "h3") {
                  styleClass += " text-lg sm:text-xl font-semibold mt-6 mb-2 text-white";
                } else if (block.type === "li") {
                  styleClass += " list-disc ml-5 pl-1 py-1.5 text-sm sm:text-base";
                } else {
                  styleClass += " opacity-85 text-sm sm:text-base leading-relaxed";
                }

                return (
                  <div 
                    key={block.id} 
                    ref={isCurrent ? activeBlockRef : null}
                    onClick={() => readBlock(index)}
                    className={`${styleClass} cursor-pointer group`}
                    title="Clique para iniciar a leitura deste parágrafo"
                  >
                    {/* Play block overlay indicator on hover */}
                    <button className="absolute -left-10 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#161619] border border-[#c49b66]/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex hover:bg-[#c49b66] hover:text-[#0c0c0e]">
                      <Play className="w-3 h-3 ml-0.5" />
                    </button>

                    <div className="flex items-start gap-2.5">
                      {/* Read indicator dots */}
                      {isCurrent && (
                        <span className="w-2 h-2 rounded-full bg-[#c49b66] mt-2.5 animate-pulse shrink-0"></span>
                      )}
                      
                      <div className="flex-1">
                        {highlightText(block.text, searchQuery, block.id, isCurrent)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        </main>

        {/* Sticky Audio Playback Control Panel */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#121215]/95 border-t border-[#ffffff10] backdrop-blur-md py-4 sm:py-6 px-4 sm:px-8 shadow-2xl">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-4 justify-between">
            
            {/* Audio Buttons Controls */}
            <div className="flex items-center gap-4 sm:gap-6 justify-center w-full md:w-auto">
              {/* Prev Block */}
              <button 
                onClick={playPrevious}
                disabled={blocks.length === 0}
                className="p-2 text-[#ffffff60] hover:text-white disabled:opacity-30 active:scale-90 transition-all"
                title="Parágrafo Anterior"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Main Play/Pause Button */}
              {isPlaying && !isPaused ? (
                <button 
                  onClick={pauseReading}
                  className="w-12 h-12 bg-white hover:bg-neutral-200 active:scale-95 text-[#0c0c0e] rounded-full flex items-center justify-center shadow-lg transition-all"
                  title="Pausar Leitura"
                >
                  <Pause className="w-5 h-5" />
                </button>
              ) : (
                <button 
                  onClick={resumeReading}
                  className="w-12 h-12 bg-[#c49b66] hover:bg-[#b08752] active:scale-95 text-[#0c0c0e] rounded-full flex items-center justify-center shadow-lg transition-all"
                  title="Iniciar/Retomar Leitura"
                >
                  <Play className="w-5 h-5 ml-0.5" />
                </button>
              )}

              {/* Stop Button */}
              <button 
                onClick={stopReading}
                disabled={!isPlaying}
                className="p-2 text-[#ffffff60] hover:text-[#c49b66] disabled:opacity-30 active:scale-90 transition-all"
                title="Parar Leitura"
              >
                <Square className="w-5 h-5" />
              </button>

              {/* Next Block */}
              <button 
                onClick={playNext}
                disabled={blocks.length === 0}
                className="p-2 text-[#ffffff60] hover:text-white disabled:opacity-30 active:scale-90 transition-all"
                title="Próximo Parágrafo"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Reading Status & Audio Progress Timeline Bar */}
            <div className="flex-1 w-full flex flex-col gap-1.5">
              <div className="flex justify-between text-[10px] uppercase tracking-widest text-[#ffffff40] font-mono">
                <span className="truncate max-w-[200px]">
                  {currentBlockIndex >= 0 
                    ? `Lendo Parágrafo ${currentBlockIndex + 1} de ${blocks.length}` 
                    : "Seleção para leitura pendente"}
                </span>
                <span>
                  {currentBlockIndex >= 0 
                    ? `${Math.round(((currentBlockIndex + 1) / blocks.length) * 100)}% concluído` 
                    : "0%"}
                </span>
              </div>
              <div className="h-1.5 bg-[#ffffff10] rounded-full relative overflow-hidden">
                <div 
                  className="absolute h-full bg-[#c49b66] rounded-full transition-all duration-300"
                  style={{ 
                    width: `${blocks.length > 0 ? Math.max(0, ((currentBlockIndex + 1) / blocks.length) * 100) : 0}%` 
                  }}
                ></div>
              </div>
            </div>

            {/* Sidebar quick indicators and view details */}
            <div className="hidden md:flex items-center gap-4 text-xs font-mono text-[#ffffff50]">
              <div className="flex items-center gap-1.5 bg-[#ffffff05] px-3 py-1.5 rounded-lg border border-[#ffffff08]">
                <Volume2 className="w-3.5 h-3.5 text-[#c49b66]" />
                <span>Velocidade: {rate.toFixed(1)}x</span>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="px-3 py-1.5 rounded-lg bg-[#c49b66]/10 text-[#c49b66] border border-[#c49b66]/20 flex items-center gap-1.5 hover:bg-[#c49b66]/20 transition-all"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Voz</span>
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* Elegant Professional Brand Footer */}
      <footer className="h-12 border-t border-[#ffffff10] px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between text-[9px] text-[#ffffff30] tracking-wider bg-[#09090b] relative z-40 gap-2 py-2 sm:py-0">
        <span className="font-mono">HOST: www.matchin.com.br</span>
        <span className="uppercase font-serif tracking-[0.1em] text-[#c49b66]/60">MATCHIN © 2026 • LEITOR DE VOZ EDITORIAL</span>
        <div className="flex gap-4 font-mono">
          <span>ALLORIGINS CORRES PROXY: OK</span>
          <span>LANGUAGES: MULTILINGUAL</span>
        </div>
      </footer>

    </div>
  );
}
