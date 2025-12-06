import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageCircle, 
  Send, 
  Bot,
  User,
  Sparkles,
  Loader2,
  X
} from "lucide-react";

interface TutorMessage {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  createdAt: string;
}

interface TutorSession {
  id: string;
  userId: string;
  topicId: string;
  principleId: string | null;
  title: string | null;
  createdAt: string;
}

interface TutorChatProps {
  topicId: string;
  topicTitle: string;
  principleId?: string;
  principleTitle?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function TutorChat({ 
  topicId, 
  topicTitle, 
  principleId, 
  principleTitle,
  isOpen,
  onClose
}: TutorChatProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: sessionData, isLoading: sessionLoading } = useQuery<{ session: TutorSession; messages: TutorMessage[] }>({
    queryKey: ['/api/tutor/session', topicId, principleId],
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/tutor/session', { topicId, principleId });
      return response.json();
    },
    enabled: isOpen,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!sessionData?.session?.id) throw new Error("No session");
      const response = await apiRequest('POST', `/api/tutor/session/${sessionData.session.id}/message`, { content });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tutor/session', topicId, principleId] });
      setInput("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [sessionData?.messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessageMutation.mutate(input.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  const messages = sessionData?.messages || [];

  return (
    <Card className="fixed bottom-4 right-4 w-[400px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-2rem)] z-50 shadow-2xl border-card-border flex flex-col" data-testid="card-tutor-chat">
      <CardHeader className="pb-2 border-b shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">AI Tutor</p>
              <p className="text-xs text-muted-foreground font-normal truncate">
                {principleTitle || topicTitle}
              </p>
            </div>
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-chat">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4">
          {sessionLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-3/4" />
              <Skeleton className="h-12 w-2/3 ml-auto" />
              <Skeleton className="h-16 w-3/4" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm font-medium mb-2">Ask me anything!</p>
              <p className="text-xs text-muted-foreground max-w-[280px] mx-auto">
                I'm here to help you understand {principleTitle ? `"${principleTitle}"` : `the topic "${topicTitle}"`} using first principles.
              </p>
              <div className="mt-4 space-y-2">
                {[
                  "Explain this in simpler terms",
                  "Give me a real-world example",
                  "Why is this important?",
                ].map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setInput(suggestion)}
                    data-testid={`button-suggestion-${suggestion.slice(0, 10).toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  data-testid={`message-${message.role}-${message.id}`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2 max-w-[85%] ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.role === 'user' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              {sendMessageMutation.isPending && (
                <div className="flex gap-3 justify-start">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="rounded-2xl px-4 py-2 bg-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t shrink-0">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question..."
              className="min-h-[44px] max-h-[120px] resize-none"
              disabled={sendMessageMutation.isPending || sessionLoading}
              data-testid="input-tutor-message"
            />
            <Button 
              size="icon" 
              onClick={handleSend} 
              disabled={!input.trim() || sendMessageMutation.isPending || sessionLoading}
              data-testid="button-send-message"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TutorChatButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      size="lg"
      className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg z-40"
      onClick={onClick}
      data-testid="button-open-tutor-chat"
    >
      <MessageCircle className="h-6 w-6" />
    </Button>
  );
}
