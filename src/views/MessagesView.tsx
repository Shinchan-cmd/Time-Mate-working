import React, { useEffect, useState, useRef } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  MessageSquare,
  RefreshCw,
  Send,
  User,
} from 'lucide-react';
import { Conversation, Message, Profile } from '../types';
import { useAuth } from '../context/AuthContext';
import { getSupabaseClient, parseProfileRecord } from '../lib/supabase';

interface MessagesViewProps {
  initialTargetUserId?: string | null;
}

export const MessagesView: React.FC<MessagesViewProps> = ({ initialTargetUserId }) => {
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState<string>('');
  const [loadingConversations, setLoadingConversations] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = getSupabaseClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Fetch conversations for current user
  const fetchConversations = async () => {
    if (!user) return;
    setLoadingConversations(true);
    setErrorMessage(null);

    try {
      // Find conversations where user.id is in participant_ids or created
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setErrorMessage(error.message);
        setConversations([]);
      } else {
        const convs = data || [];
        // Filter conversations involving user
        const userConvs = convs.filter((c: any) => {
          if (Array.isArray(c.participant_ids)) {
            return c.participant_ids.includes(user.id);
          }
          return true; // if no array column, show available
        });

        // Enrich with partner profile
        const enriched: Conversation[] = await Promise.all(
          userConvs.map(async (c: any) => {
            const partnerId = (c.participant_ids || []).find((id: string) => id !== user.id);
            let otherProf: Profile | undefined;
            if (partnerId) {
              const { data: pData } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', partnerId)
                .maybeSingle();
              if (pData) otherProf = parseProfileRecord(pData);
            }
            return {
              ...c,
              other_participant: otherProf,
            };
          })
        );

        setConversations(enriched);

        // If initialTargetUserId was passed, find or create conversation
        if (initialTargetUserId && initialTargetUserId !== user.id) {
          const existing = enriched.find((c) =>
            (c.participant_ids || []).includes(initialTargetUserId)
          );
          if (existing) {
            setActiveConversation(existing);
          } else {
            // Create new conversation
            const { data: created, error: cErr } = await supabase
              .from('conversations')
              .insert({
                participant_ids: [user.id, initialTargetUserId],
                last_message: 'Started new conversation',
                last_message_at: new Date().toISOString(),
              })
              .select()
              .single();

            if (!cErr && created) {
              const { data: pData } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', initialTargetUserId)
                .maybeSingle();

              const newConv: Conversation = {
                ...created,
                other_participant: pData ? parseProfileRecord(pData) : undefined,
              };
              setConversations((prev) => [newConv, ...prev]);
              setActiveConversation(newConv);
            }
          }
        } else if (enriched.length > 0 && !activeConversation) {
          setActiveConversation(enriched[0]);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error loading conversations.');
      setConversations([]);
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [user, initialTargetUserId]);

  // 2. Fetch messages for active conversation & subscribe to realtime
  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    setLoadingMessages(true);

    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', activeConversation.id)
          .order('created_at', { ascending: true });

        if (error) {
          console.warn('Error fetching messages:', error.message);
        } else if (isMounted) {
          setMessages(data || []);
          setTimeout(scrollToBottom, 100);
        }
      } catch (err) {
        console.error('Messages load error:', err);
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    };

    loadMessages();

    // Realtime subscription for incoming messages
    const channel = supabase
      .channel(`chat_${activeConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversation.id}`,
        },
        (payload: any) => {
          if (!isMounted) return;
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [activeConversation, supabase]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeConversation || !newMessageText.trim()) return;

    const text = newMessageText.trim();
    setNewMessageText('');

    const optimisticMessage: Message = {
      id: 'msg-' + Date.now(),
      conversation_id: activeConversation.id,
      sender_id: user.id,
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setTimeout(scrollToBottom, 50);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeConversation.id,
          sender_id: user.id,
          content: text,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      // Update conversation last message
      await supabase
        .from('conversations')
        .update({
          last_message: text,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', activeConversation.id);
    } catch (err: any) {
      alert(`Message failed to send: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Messages &amp; Direct Chat</h1>
        <p className="text-xs text-gray-500">
          Secure, private communication between confirmed companionship booking participants.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Messaging Container */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden flex flex-col md:flex-row h-[600px]">
        {/* Left Side: Conversations List */}
        <div
          className={`w-full md:w-80 border-r border-gray-200 flex flex-col ${
            activeConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-3.5 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Conversations ({conversations.length})
            </span>
            <button
              onClick={fetchConversations}
              className="p-1 hover:bg-gray-100 rounded text-gray-500"
              title="Refresh conversations"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingConversations ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {loadingConversations ? (
              <div className="p-8 text-center text-xs text-gray-400">Loading conversations...</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                No conversations yet. When you book a companion or accept a booking, chat will appear here.
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = activeConversation?.id === conv.id;
                const partner = conv.other_participant;

                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConversation(conv)}
                    className={`w-full text-left p-3.5 transition-colors flex items-center gap-3 ${
                      isSelected ? 'bg-indigo-50/80 border-l-4 border-indigo-600' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      {partner?.display_name?.slice(0, 2).toUpperCase() || 'TM'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-gray-900 truncate">
                          {partner?.display_name || 'Participant'}
                        </span>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {conv.last_message_at
                            ? new Date(conv.last_message_at).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                              })
                            : ''}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">
                        {conv.last_message || 'New conversation'}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Active Chat Box */}
        <div
          className={`flex-1 flex flex-col bg-gray-50/50 ${
            !activeConversation ? 'hidden md:flex items-center justify-center' : 'flex'
          }`}
        >
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-3.5 bg-white border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveConversation(null)}
                    className="p-1.5 md:hidden text-gray-500 hover:bg-gray-100 rounded-lg"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {activeConversation.other_participant?.display_name?.slice(0, 2).toUpperCase() || 'TM'}
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-gray-900">
                      {activeConversation.other_participant?.display_name || 'Booking Participant'}
                    </div>
                    <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active Chat Channel
                    </div>
                  </div>
                </div>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="text-center py-10 text-xs text-gray-400">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-16 text-xs text-gray-400">
                    Send your first message to introduce yourself and coordinate meetup details!
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.sender_id === user?.id;

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[80%] sm:max-w-md px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                            isMe
                              ? 'bg-indigo-600 text-white rounded-br-xs shadow-xs'
                              : 'bg-white text-gray-900 border border-gray-200 rounded-bl-xs shadow-xs'
                          }`}
                        >
                          {m.content}
                        </div>
                        <span className="text-[9px] text-gray-400 mt-0.5 px-1">
                          {new Date(m.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Bar */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-white border-t border-gray-200 flex items-center gap-2"
              >
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <button
                  type="submit"
                  disabled={!newMessageText.trim()}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="text-center p-8 text-gray-400 text-xs">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              Select a conversation from the left to start messaging.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
