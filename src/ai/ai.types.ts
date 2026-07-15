export interface AiMessage {
  role: 'customer' | 'agent' | 'bot';
  text: string;
}

// Pluggable so a real model can be dropped in later without touching any
// caller. suggestReply() is used by the agent dashboard to draft a response
// after handover; summarize() condenses a thread for a complaint record.
export interface AiProvider {
  suggestReply(history: AiMessage[]): Promise<string>;
  summarize(history: AiMessage[]): Promise<string>;
}
