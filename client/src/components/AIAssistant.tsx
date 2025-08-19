import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Brain, 
  Send, 
  Paperclip, 
  FileText, 
  User, 
  Loader2,
  Plus,
  MessageCircle,
  Sparkles
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

interface ChatSession {
  id: string;
  caseId?: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AIAssistant() {
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [messageInput, setMessageInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: cases = [] } = useQuery({
    queryKey: ["/api/cases"],
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["/api/chat/sessions"],
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/chat/sessions", selectedSessionId, "messages"],
    enabled: !!selectedSessionId,
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data: { caseId?: string; title?: string }) => {
      const response = await apiRequest("/api/chat/sessions", "POST", data);
      return response.json();
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/sessions"] });
      setSelectedSessionId(session.id);
      toast({
        title: "Success",
        description: "New chat session created",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ sessionId, content }: { sessionId: string; content: string }) => {
      const response = await apiRequest(`/api/chat/sessions/${sessionId}/messages`, "POST", {
        content,
      });
      return response.json();
    },
    onMutate: () => {
      setIsTyping(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/chat/sessions", selectedSessionId, "messages"] 
      });
      setMessageInput("");
      setIsTyping(false);
    },
    onError: (error: Error) => {
      setIsTyping(false);
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedSessionId) return;
    
    sendMessageMutation.mutate({
      sessionId: selectedSessionId,
      content: messageInput.trim(),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCreateSession = () => {
    const title = selectedCaseId 
      ? `Chat for ${cases.find((c: any) => c.id === selectedCaseId)?.clientName || 'Case'}`
      : "General AI Assistant Chat";
    
    createSessionMutation.mutate({
      caseId: selectedCaseId || undefined,
      title,
    });
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-dark">AI Legal Assistant</h2>
          <p className="text-gray-600">Chat with AI to refine extracted content and generate documents</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className="bg-green-100 text-green-800">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
            Online
          </Badge>
        </div>
      </div>

      {/* Session Management */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Chat Sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Case Context (Optional)</label>
              <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a case" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific case</SelectItem>
                  {Array.isArray(cases) ? cases.map((caseItem: any) => (
                    <SelectItem key={caseItem.id} value={caseItem.id}>
                      {caseItem.clientName} - {caseItem.caseNumber}
                    </SelectItem>
                  )) : []}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleCreateSession} 
              className="w-full bg-primary hover:bg-primary-light"
              disabled={createSessionMutation.isPending}
            >
              <Plus className="w-4 h-4 mr-2" />
              {createSessionMutation.isPending ? "Creating..." : "New Chat Session"}
            </Button>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {sessions.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No chat sessions</p>
                </div>
              ) : (
                sessions.map((session: ChatSession) => (
                  <Button
                    key={session.id}
                    variant={selectedSessionId === session.id ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-start text-left p-3 h-auto"
                    onClick={() => setSelectedSessionId(session.id)}
                  >
                    <div className="truncate">
                      <div className="font-medium text-sm">
                        {session.title || "Untitled Chat"}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(session.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </Button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chat Interface */}
        <div className="lg:col-span-2">
          <Card className="h-[700px] flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  <span>AI Assistant Chat</span>
                </CardTitle>
                {selectedSessionId && (
                  <Badge variant="outline">
                    Session Active
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            {!selectedSessionId ? (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-400" />
                  <h3 className="text-lg font-semibold mb-2">Start a Conversation</h3>
                  <p className="text-gray-600 mb-4">
                    Create a new chat session to begin interacting with the AI assistant.
                  </p>
                  <Button onClick={handleCreateSession} className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Start New Chat
                  </Button>
                </div>
              </CardContent>
            ) : (
              <>
                {/* Messages Area */}
                <CardContent className="flex-1 p-0">
                  <ScrollArea className="h-full p-6">
                    {messagesLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-6 h-6 animate-spin" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-8">
                        <Brain className="w-12 h-12 mx-auto mb-4 text-purple-400" />
                        <h4 className="font-medium text-neutral-dark mb-2">No messages yet</h4>
                        <p className="text-sm text-gray-600">
                          Start the conversation by asking the AI assistant about document analysis,
                          content extraction, or demand letter generation.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message: ChatMessage) => (
                          <div
                            key={message.id}
                            className={`flex items-start space-x-3 ${
                              message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                            }`}
                          >
                            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                              message.role === 'assistant' 
                                ? 'bg-purple-600' 
                                : 'bg-primary'
                            }`}>
                              {message.role === 'assistant' ? (
                                <Brain className="w-4 h-4 text-white" />
                              ) : (
                                <User className="w-4 h-4 text-white" />
                              )}
                            </div>
                            <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                              <div className={`rounded-lg p-3 inline-block max-w-[80%] ${
                                message.role === 'user'
                                  ? 'bg-primary text-white'
                                  : 'bg-gray-100 text-neutral-dark'
                              }`}>
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(message.createdAt).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))}
                        
                        {/* Typing indicator */}
                        {isTyping && (
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                              <Brain className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="bg-gray-100 rounded-lg p-3 inline-block">
                                <div className="flex items-center space-x-2">
                                  <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                                  <p className="text-sm text-purple-600 font-medium">AI is thinking...</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>

                {/* Message Input */}
                <div className="p-6 border-t border-gray-200">
                  <div className="flex space-x-4">
                    <div className="flex-1">
                      <Textarea
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Ask the AI assistant to help with document analysis, content extraction, or demand letter generation..."
                        className="resize-none min-h-[60px] max-h-[120px]"
                        disabled={sendMessageMutation.isPending || isTyping}
                      />
                    </div>
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() || sendMessageMutation.isPending || isTyping}
                      className="bg-primary hover:bg-primary-light px-6"
                    >
                      {sendMessageMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center space-x-4">
                      <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-800">
                        <Paperclip className="w-4 h-4 mr-1" />
                        <span className="text-sm">Attach Document</span>
                      </Button>
                      <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-800">
                        <FileText className="w-4 h-4 mr-1" />
                        <span className="text-sm">Use Template</span>
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Press Enter to send, Shift+Enter for new line
                    </p>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
