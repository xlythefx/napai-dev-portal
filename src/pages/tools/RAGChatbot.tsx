import { useState, useCallback, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft,
  MessageSquare,
  Upload,
  FileText,
  X,
  Send,
  Loader2,
  Bot,
  User,
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  MessageCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { extractTextFromFile } from "@/lib/fileUtils";
import {
  ragUpload,
  ragGetDocuments,
  ragDeleteDocument,
  ragChat,
  ragListChats,
  ragCreateChat,
  ragGetChat,
  ragUpdateChat,
  ragDeleteChat,
  type RagDocument,
  type RagChat,
} from "@/lib/ragApi";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const RAGChatbot = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const userEmail = user?.email ?? "";
  const scrollRef = useRef<HTMLDivElement>(null);

  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [chats, setChats] = useState<RagChat[]>([]);
  const [currentChat, setCurrentChat] = useState<RagChat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const fetchDocuments = useCallback(async () => {
    if (!userEmail || !currentChat) {
      setDocuments([]);
      return;
    }
    setIsLoadingDocs(true);
    try {
      const docs = await ragGetDocuments({ user_email: userEmail, chat_id: currentChat.id });
      setDocuments(docs);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load documents";
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsLoadingDocs(false);
    }
  }, [userEmail, currentChat, toast]);

  const fetchChats = useCallback(async () => {
    if (!userEmail) return;
    setIsLoadingChats(true);
    try {
      const list = await ragListChats(userEmail);
      setChats(list);
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load chats",
        variant: "destructive",
      });
    } finally {
      setIsLoadingChats(false);
    }
  }, [userEmail, toast]);

  useEffect(() => {
    if (!currentChat) {
      setDocuments([]);
      setIsLoadingDocs(false);
      return;
    }
    fetchDocuments();
  }, [currentChat?.id, fetchDocuments]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  const selectChat = useCallback(
    async (chat: RagChat) => {
      if (currentChat?.id === chat.id) return;
      setCurrentChat(chat);
      setEditingChatId(null);
      try {
        const data = await ragGetChat({ user_email: userEmail, chat_id: chat.id });
        setMessages(
          (data.messages ?? []).map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }))
        );
      } catch {
        setMessages([]);
      }
    },
    [userEmail, currentChat?.id]
  );

  const createNewChat = useCallback(async () => {
    if (!userEmail) return;
    try {
      const { chat } = await ragCreateChat({ user_email: userEmail, name: "New Chat" });
      setChats((prev) => [{ ...chat, created_at: "", updated_at: "" }, ...prev]);
      setCurrentChat(chat);
      setMessages([]);
      setEditingChatId(chat.id);
      setEditingName("New Chat");
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create chat",
        variant: "destructive",
      });
    }
  }, [userEmail, toast]);

  const updateChatName = useCallback(
    async (chatId: number, name: string) => {
      if (!userEmail || !name.trim()) return;
      try {
        await ragUpdateChat({ user_email: userEmail, chat_id: chatId, name: name.trim() });
        setChats((prev) =>
          prev.map((c) => (c.id === chatId ? { ...c, name: name.trim() } : c))
        );
        if (currentChat?.id === chatId) {
          setCurrentChat((prev) => (prev ? { ...prev, name: name.trim() } : null));
        }
        setEditingChatId(null);
      } catch (err) {
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to rename",
          variant: "destructive",
        });
      }
    },
    [userEmail, currentChat, toast]
  );

  const deleteChat = useCallback(
    async (chatId: number) => {
      if (!userEmail) return;
      try {
        await ragDeleteChat({ user_email: userEmail, chat_id: chatId });
        setChats((prev) => prev.filter((c) => c.id !== chatId));
        if (currentChat?.id === chatId) {
          setCurrentChat(null);
          setMessages([]);
          setDocuments([]);
        }
        setEditingChatId(null);
        toast({ title: "Chat deleted" });
      } catch (err) {
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to delete",
          variant: "destructive",
        });
      }
    },
    [userEmail, currentChat, toast]
  );

  const processFiles = useCallback(
    async (newFiles: File[]) => {
      if (newFiles.length === 0 || !userEmail || !currentChat) {
        if (!currentChat) {
          toast({
            title: "Select a chat",
            description: "Create or select a chat to upload documents.",
            variant: "destructive",
          });
        }
        return;
      }
      setIsEmbedding(true);
      setError(null);
      try {
        for (const file of newFiles) {
          const text = await extractTextFromFile(file);
          if (!text.trim()) {
            toast({
              title: "Empty file",
              description: `${file.name} appears to be empty.`,
              variant: "destructive",
            });
            continue;
          }
          await ragUpload({
            text,
            filename: file.name,
            user_email: userEmail,
            chat_id: currentChat.id,
          });
        }
        await fetchDocuments();
        toast({ title: "Knowledge base updated", description: `Uploaded ${newFiles.length} file(s).` });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to upload files";
        setError(msg);
        toast({ title: "Error", description: msg, variant: "destructive" });
      } finally {
        setIsEmbedding(false);
      }
    },
    [userEmail, currentChat, toast, fetchDocuments]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    const valid = selected.filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      return ext === "txt" || ext === "pdf";
    });
    if (valid.length > 0) processFiles(valid);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    const valid = dropped.filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      return ext === "txt" || ext === "pdf";
    });
    if (valid.length > 0) processFiles(valid);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const removeDocument = async (doc: RagDocument) => {
    try {
      await ragDeleteDocument({ user_email: userEmail, document_id: doc.id });
      await fetchDocuments();
      toast({ title: "Document removed" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to remove document";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  };

  const totalChunks = documents.reduce(
    (sum, d) => sum + parseInt(String(d.chunks_count || 0), 10),
    0
  );

  const handleSend = async () => {
    const q = input.trim();
    if (!q || isLoading || !userEmail) return;

    let chatId = currentChat?.id;
    if (!chatId) {
      try {
        const { chat } = await ragCreateChat({ user_email: userEmail, name: "New Chat" });
        setChats((prev) => [{ ...chat, created_at: "", updated_at: "" }, ...prev]);
        setCurrentChat(chat);
        chatId = chat.id;
      } catch {
        toast({ title: "Error", description: "Could not create chat", variant: "destructive" });
        return;
      }
    }

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setIsLoading(true);
    setError(null);

    try {
      const { response } = await ragChat({
        question: q,
        user_email: userEmail,
        messages,
        chat_id: chatId,
        top_k: 5,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
      await fetchChats();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to get response";
      setError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const viewport = scrollRef.current?.closest("[data-radix-scroll-area-viewport]") as HTMLElement | null;
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent, chatId: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      updateChatName(chatId, editingName);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-28 pb-8 px-4">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Link
              to="/tools"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Tools
            </Link>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-primary">RAG Chatbot</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tighter">
              RAG Chatbot
            </h1>
            <p className="text-muted-foreground mt-1">
              Learn faster. Upload your docs, create chats, and get instant, accurate answers from your own knowledge base.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-[280px_1fr_260px] gap-6">
            {/* Left: Knowledge Base */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Knowledge Base
                  </CardTitle>
                  <CardDescription>
                    Upload .txt or .pdf files.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <label
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className={`flex flex-col items-center justify-center w-full min-h-[100px] border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                      !currentChat
                        ? "border-muted-foreground/20 bg-muted/30 cursor-not-allowed opacity-60"
                        : isEmbedding
                          ? "border-primary/50 bg-primary/5 opacity-70"
                          : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    {isEmbedding ? (
                      <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                    ) : (
                      <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                    )}
                    <span className="text-sm text-muted-foreground">
                      {!currentChat
                        ? "Select a chat first"
                        : isEmbedding
                          ? "Processing..."
                          : "Drop or click"}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".txt,.pdf"
                      multiple
                      onChange={handleFileChange}
                      disabled={isEmbedding || !currentChat}
                    />
                  </label>

                  {!currentChat ? (
                    <p className="text-sm text-muted-foreground">Select a chat to view its knowledge base.</p>
                  ) : isLoadingDocs ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </div>
                  ) : documents.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Documents ({totalChunks} chunks)</p>
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/50 text-sm"
                        >
                          <span className="truncate" title={doc.file_name}>
                            {doc.file_name}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 flex-shrink-0"
                            onClick={() => removeDocument(doc)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No documents in this chat yet.</p>
                  )}
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </CardContent>
              </Card>
            </div>

            {/* Center: Chat */}
            <div>
              <Card className="flex flex-col h-[560px]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="w-5 h-5" />
                    {currentChat ? currentChat.name : "Chat"}
                  </CardTitle>
                  <CardDescription>
                    {currentChat
                      ? `Ask about ${documents.length} doc(s) in this chat's knowledge base`
                      : "Create or select a chat to start"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col min-h-0 p-0">
                  <ScrollArea className="flex-1 px-6">
                    <div className="space-y-4 pb-4">
                      {messages.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                          <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p className="text-sm">No messages yet.</p>
                          <p className="text-xs mt-1">
                            {documents.length > 0
                              ? "Ask a question about your documents."
                              : "Upload files first, or ask a general question."}
                          </p>
                        </div>
                      )}
                      {messages.map((m, i) => (
                        <div
                          key={i}
                          className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}
                        >
                          {m.role === "assistant" && (
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Bot className="w-4 h-4 text-primary" />
                            </div>
                          )}
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                              m.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                          </div>
                          {m.role === "user" && (
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bot className="w-4 h-4 text-primary" />
                          </div>
                          <div className="rounded-2xl px-4 py-2 bg-muted">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          </div>
                        </div>
                      )}
                      <div ref={scrollRef} />
                    </div>
                  </ScrollArea>
                  <div className="p-4 border-t flex gap-2">
                    <Textarea
                      placeholder="Ask a question..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())
                      }
                      rows={2}
                      className="min-h-0 resize-none"
                      disabled={isLoading}
                    />
                    <Button
                      size="icon"
                      className="h-10 w-10 flex-shrink-0 self-end"
                      onClick={handleSend}
                      disabled={isLoading || !input.trim()}
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Chats Sidebar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Chats
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  <ChevronRight className={`w-4 h-4 transition-transform ${sidebarOpen ? "rotate-180" : ""}`} />
                </Button>
              </div>
              <Card className={sidebarOpen ? "" : "hidden lg:block"}>
                <CardContent className="p-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 mb-3"
                    onClick={createNewChat}
                  >
                    <Plus className="w-4 h-4" />
                    New Chat
                  </Button>
                  {isLoadingChats ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading chats...
                    </div>
                  ) : chats.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No chats yet
                    </p>
                  ) : (
                    <ScrollArea className="h-[480px]">
                      <div className="space-y-1 pr-2">
                        {chats.map((chat) => (
                          <div
                            key={chat.id}
                            className={`group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                              currentChat?.id === chat.id
                                ? "bg-primary/10 text-primary"
                                : "hover:bg-muted/50"
                            }`}
                            onClick={() => selectChat(chat)}
                          >
                            {editingChatId === chat.id ? (
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onBlur={() => updateChatName(chat.id, editingName)}
                                onKeyDown={(e) => handleKeyDown(e, chat.id)}
                                className="h-8 text-sm"
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                              />
                            ) : (
                              <>
                                <MessageCircle className="w-4 h-4 flex-shrink-0" />
                                <span className="flex-1 truncate text-sm font-medium">
                                  {chat.name}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingChatId(chat.id);
                                      setEditingName(chat.name);
                                    }}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteChat(chat.id);
                                    }}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default RAGChatbot;
