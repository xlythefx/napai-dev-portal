import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send } from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender: "user" | "assistant";
  timestamp: number;
}

const AICompanion = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize position to bottom-right
  useEffect(() => {
    const updatePosition = () => {
      setPosition({
        x: window.innerWidth - 120,
        y: window.innerHeight - 120,
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, []);

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    setDragOffset({
      x: clientX - position.x,
      y: clientY - position.y,
    });
  };

  // Handle drag move
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 100, clientX - dragOffset.x)),
        y: Math.max(0, Math.min(window.innerHeight - 100, clientY - dragOffset.y)),
      });
    };

    const handleEnd = () => setIsDragging(false);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("touchmove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchend", handleEnd);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, dragOffset]);

  // Handle sending message
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      text: inputValue,
      sender: "user",
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    // Show thinking state
    setIsThinking(true);

    // Simulate assistant thinking and response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: `msg-${Date.now()}`,
        text: `I appreciate your message: "${userMessage.text}" — I'm here to help guide you through this amazing platform!`,
        sender: "assistant",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsThinking(false);

      // Auto-dismiss message after 5 seconds
      setTimeout(() => {
        setMessages((prev) => prev.filter((m) => m.id !== assistantMessage.id));
      }, 5000);
    }, 1200);

    // Auto-dismiss user message after 4 seconds
    setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    }, 4000);
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Get last few visible messages
  const visibleMessages = messages.slice(-5);

  return (
    <motion.div
      ref={containerRef}
      className="fixed z-50 pointer-events-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {/* Message bubbles container */}
      <div className="absolute bottom-24 right-0 flex flex-col gap-2 w-64 max-w-xs pointer-events-auto">
        <AnimatePresence mode="popLayout">
          {visibleMessages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{
                opacity: 0,
                y: msg.sender === "user" ? 20 : -20,
                scale: 0.8,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: msg.sender === "user" ? 20 : -20,
                scale: 0.8,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-3 py-2 rounded-lg text-sm ${
                  msg.sender === "user"
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : "bg-muted text-foreground rounded-bl-none border border-border"
                }`}
              >
                <p className="break-words">{msg.text}</p>
              </div>
            </motion.div>
          ))}

          {/* Thinking indicator */}
          {isThinking && (
            <motion.div
              key="thinking"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="flex justify-start"
            >
              <div className="px-3 py-2 rounded-lg bg-muted text-foreground border border-border rounded-bl-none">
                <div className="flex gap-1">
                  <motion.span
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                    className="w-1.5 h-1.5 bg-primary rounded-full"
                  />
                  <motion.span
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.1 }}
                    className="w-1.5 h-1.5 bg-primary rounded-full"
                  />
                  <motion.span
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                    className="w-1.5 h-1.5 bg-primary rounded-full"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input field */}
      {(messages.length > 0 || isThinking) && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="absolute bottom-24 right-0 w-64 pointer-events-auto"
        >
          <div className="flex gap-2 items-end bg-background/95 backdrop-blur-sm border border-border rounded-lg p-2 shadow-lg shadow-black/10">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message..."
              disabled={isThinking}
              className="flex-1 bg-transparent text-sm outline-none placeholder-muted-foreground disabled:opacity-50"
            />
            <motion.button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isThinking}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-1 text-primary hover:bg-muted rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Draggable Robot */}
      <motion.button
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        type="button"
        onClick={() => {
          if (!isDragging) {
            inputRef.current?.focus();
          }
        }}
        className="pointer-events-auto cursor-grab active:cursor-grabbing relative w-20 h-24 rounded-full group"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.96 }}
        drag={false}
      >
        {/* Glow effect */}
        <motion.div
          className="absolute -inset-2 rounded-full bg-gradient-to-br from-primary/40 via-transparent to-primary/20 blur-lg opacity-60 group-hover:opacity-100"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        />

        {/* Robot body */}
        <div className="relative w-full h-full">
          {/* Head */}
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1 left-1/2 transform -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 border-2 border-primary/60 shadow-lg"
          >
            {/* Eyes */}
            <div className="absolute top-3.5 left-2.5 w-1.5 h-1.5 rounded-full bg-white/90" />
            <div className="absolute top-3.5 right-2.5 w-1.5 h-1.5 rounded-full bg-white/90" />

            {/* Antenna */}
            <motion.div
              animate={{ rotate: [-5, 5, -5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-1 h-3 bg-gradient-to-t from-primary to-primary/60 rounded-full origin-bottom"
            />

            {/* Smile */}
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-2 border-b-2 border-white/70 rounded-full" />
          </motion.div>

          {/* Body */}
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-12 left-1/2 transform -translate-x-1/2 w-10 h-8 rounded-lg bg-gradient-to-b from-primary/90 to-primary/70 border-2 border-primary/60 shadow-lg"
          >
            {/* Chest plate */}
            <div className="absolute inset-2 rounded border-2 border-primary/40 opacity-60" />
          </motion.div>

          {/* Left arm */}
          <motion.div
            animate={{ rotateZ: [-15, 15, -15] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-12 -left-1 w-3 h-8 rounded-full bg-gradient-to-r from-primary/80 to-primary/60 shadow-md origin-top-right"
          />

          {/* Right arm */}
          <motion.div
            animate={{ rotateZ: [15, -15, 15] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-12 -right-1 w-3 h-8 rounded-full bg-gradient-to-l from-primary/80 to-primary/60 shadow-md origin-top-left"
          />

          {/* Status light (pulsing) */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-2 h-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50"
          />
        </div>

        {/* Drag hint */}
        {!isDragging && messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-[10px] text-muted-foreground whitespace-nowrap pointer-events-none"
          >
            Drag me around
          </motion.div>
        )}
      </motion.button>
    </motion.div>
  );
};

export default AICompanion;
