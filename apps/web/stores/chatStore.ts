import { create } from 'zustand';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface ChatContext {
  page: string | null;
  evaluasiId: string | null;
}

interface ChatState {
  messages: ChatMessage[];
  activeContext: ChatContext;
  isStreaming: boolean;
  streamingBuffer: string;
  addMessage: (message: Omit<ChatMessage, 'timestamp'>) => void;
  setStreamingBuffer: (content: string) => void;
  commitStreamingMessage: () => void;
  setStreaming: (isStreaming: boolean) => void;
  setContext: (context: Partial<ChatContext>) => void;
  resetChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  activeContext: {
    page: null,
    evaluasiId: null,
  },
  isStreaming: false,
  streamingBuffer: '',
  addMessage: (message) => set((state) => ({
    messages: [
      ...state.messages,
      {
        ...message,
        timestamp: new Date().toISOString(),
      },
    ],
  })),
  setStreamingBuffer: (content) => set({
    streamingBuffer: content,
  }),
  commitStreamingMessage: () => set((state) => {
    if (!state.streamingBuffer) return {};
    const newAssistantMessage: ChatMessage = {
      role: 'assistant',
      content: state.streamingBuffer,
      timestamp: new Date().toISOString(),
    };
    return {
      messages: [...state.messages, newAssistantMessage],
      streamingBuffer: '',
    };
  }),
  setStreaming: (isStreaming) => set({
    isStreaming,
  }),
  setContext: (context) => set((state) => ({
    activeContext: {
      ...state.activeContext,
      ...context,
    },
  })),
  resetChat: () => set({
    messages: [],
    streamingBuffer: '',
    isStreaming: false,
  }),
}));
