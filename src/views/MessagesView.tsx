import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCheck,
  Circle,
  Heart,
  Image as ImageIcon,
  MessageSquare,
  MoreVertical,
  Phone,
  RefreshCw,
  Search,
  Send,
  Smile,
  Sparkles,
  User,
  Zap,
} from 'lucide-react';
import { Conversation, Message, Profile } from '../types';
import { useAuth } from '../context/AuthContext';
import { getSupabaseClient, parseProfileRecord } from '../lib/supabase';
import { sanitizeErrorMessage } from '../utils/security';
import { soundService } from '../utils/sound';

interface MessagesViewProps {
  initialTargetUserId?: string | null;
}

const QUICK_REACTIONS = ['👋', '❤️', '✨', '😊', '👍', '☕', '🎉'];

export const MessagesView: React.FC<MessagesViewProps> = ({ initialTargetUserId }) => {
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [partnerTyping, setPartnerTyping] = useState<boolean>(false);

  const [loadingConversations, setLoadingConversations] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = getSupabaseClient();

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  /**
   * 1. Fetch Conversations for User
   */
  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (!error && data) {
        // Filter conversations involving user
        const userConvs = data.filter((c: any) => {
          if (Array.isArray(c.participant_ids)) {
            return c.participant_ids.includes(user.id);
          }
          return true;
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

        // Target user direct route handling
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
    } catch {
      // Graceful error handle
    } finally {
      setLoadingConversations(false);
    }
  }, [user, initialTargetUserId]);

  /**
   * 2. Fetch Messages for Active Conversation
   */
  const fetchMessages = useCallback(async (convId: string) => {
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data);
        setTimeout(() => scrollToBottom('auto'), 50);
      }
    } catch (err: any) {
      setErrorMessage(sanitizeErrorMessage(err, 'Unable to load chat messages.'));
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.id);
    } else {
      setMessages([]);
    }
  }, [activeConversation, fetchMessages]);

  /**
   * 3. Real-Time Supabase Channel for Messages & Typing Indicators
   */
  useEffect(() => {
    if (!activeConversation) return;

    const channel = supabase
      .channel(`chat_realtime_${activeConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // Play message chime
          if (newMsg.sender_id !== user?.id) {
            soundService.playMessageChime();
          }

          setTimeout(() => scrollToBottom('smooth'), 50);
        }
      )
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.senderId !== user?.id) {
          setPartnerTyping(true);
          setTimeout(() => setPartnerTyping(false), 2500);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversation, user]);

  /**
   * Handle user typing notification broadcast
   */
  const handleInputChange = (val: string) => {
    setNewMessageText(val);

    if (activeConversation && user) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        try {
          supabase.channel(`chat_realtime_${activeConversation.id}`).send({
            type: 'broadcast',
            event: 'typing',
            payload: { senderId: user.id },
          });
        } catch {
          // Ignored
        }
      }, 300);
    }
  };

  /**
   * Send Message Functionality (Instant Optimistic UI + Server Confirmation)
   */
  const handleSendMessage = async (e?: React.FormEvent, customContent?: string) => {
    if (e) e.preventDefault();
    const text = (customContent !== undefined ? customContent : newMessageText).trim();

    if (!user || !activeConversation || !text || sending) return;

    setSending(true);
    setNewMessageText('');
    if (inputRef.current) inputRef.current.focus();

    const tempId = 'temp-' + Date.now();
    const optimisticMessage: Message = {
      id: tempId,
      conversation_id: activeConversation.id,
      sender_id: user.id,
      content: text,
      created_at: new Date().toISOString(),
    };

    // 1. Optimistic instant render
    setMessages((prev) => [...prev, optimisticMessage]);
    setTimeout(() => scrollToBottom('smooth'), 50);

    // Update conversation sidebar preview immediately
    setConversations((prev) => {
      const updated = prev.map((c) =>
        c.id === activeConversation.id
          ? { ...c, last_message: text, last_message_at: optimisticMessage.created_at }
          : c
      );
      // Move active conversation to top
      const idx = updated.findIndex((c) => c.id === activeConversation.id);
      if (idx > 0) {
        const [curr] = updated.splice(idx, 1);
        return [curr, ...updated];
      }
      return updated;
    });

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
        throw error;
      }

      // Replace temp optimistic message with authoritative server message
      if (data) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? data : m)));
      }

      // Update conversation in database
      await supabase
        .from('conversations')
        .update({
          last_message: text,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', activeConversation.id);
    } catch (err: any) {
      setErrorMessage(sanitizeErrorMessage(err, 'Unable to send message. Please check your connection.'));
    } finally {
      setSending(false);
    }
  };

  const partner = activeConversation?.other_participant;
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const name = c.other_participant?.display_name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 lg:px-6 py-4 text-white">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <span>Direct Messages</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30 px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(255,45,141,0.3)]">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
              Live Sync
            </span>
          </h1>
          <p className="text-xs text-zinc-400">
            Real-time direct chat with companions and customers.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 mb-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Messaging Shell */}
      <div className="bg-[#121214] rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col md:flex-row h-[72vh] min-h-[520px] max-h-[750px]">
        {/* Left Side: Conversations List */}
        <div
          className={`w-full md:w-84 lg:w-96 border-r border-zinc-800 flex flex-col bg-[#0e0e10] ${
            activeConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header & Search */}
          <div className="p-3.5 border-b border-zinc-800 bg-[#121214] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white uppercase tracking-wider">
                Chats ({conversations.length})
              </span>
              <button
                onClick={fetchConversations}
                className="p-1.5 hover:bg-zinc-800 active:bg-zinc-700 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Refresh chat list"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingConversations ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:border-pink-500 rounded-xl focus:outline-hidden transition-all"
              />
            </div>
          </div>

          {/* Conversations Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60">
            {loadingConversations ? (
              <div className="p-8 text-center text-xs text-zinc-500 flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-pink-500" />
                <span>Syncing conversations...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                <p className="font-semibold text-zinc-300">No active chats</p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  When you request or accept a companionship booking, your live chat will appear here.
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = activeConversation?.id === conv.id;
                const other = conv.other_participant;
                const hasAvatar = !!other?.avatar_url;

                return (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConversation(conv)}
                    className={`w-full text-left p-3.5 transition-all flex items-center gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-pink-500/15 border-l-4 border-pink-500 text-white shadow-[0_0_12px_rgba(255,45,141,0.15)]'
                        : 'hover:bg-zinc-900/60 text-zinc-300'
                    }`}
                  >
                    {/* Avatar with Live Indicator */}
                    <div className="relative shrink-0">
                      {hasAvatar ? (
                        <img
                          src={other?.avatar_url!}
                          alt={other?.display_name || 'User'}
                          className="w-11 h-11 rounded-2xl object-cover ring-1 ring-zinc-700"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-2xl bg-zinc-800 border border-pink-500/30 text-pink-400 flex items-center justify-center font-bold text-xs shadow-xs">
                          {other?.display_name?.slice(0, 2).toUpperCase() || 'TM'}
                        </div>
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#121214] rounded-full shadow-[0_0_4px_#10b981]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-white truncate">
                          {other?.display_name || 'Booking User'}
                        </span>
                        <span className="text-[10px] text-zinc-500 shrink-0 font-mono">
                          {conv.last_message_at
                            ? new Date(conv.last_message_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5 flex items-center gap-1">
                        <span className="truncate">{conv.last_message || 'Say hello 👋'}</span>
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Real-Time Chat Thread */}
        <div
          className={`flex-1 flex flex-col bg-[#0a0a0c] ${
            !activeConversation ? 'hidden md:flex items-center justify-center' : 'flex'
          }`}
        >
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-3 sm:p-3.5 bg-[#121214] border-b border-zinc-800 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveConversation(null)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 md:hidden bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-200 font-bold text-xs rounded-full shadow-xs cursor-pointer"
                    aria-label="Back to conversations list"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Chats</span>
                  </button>

                  <div className="relative">
                    {partner?.avatar_url ? (
                      <img
                        src={partner.avatar_url}
                        alt={partner.display_name}
                        className="w-10 h-10 rounded-2xl object-cover ring-2 ring-pink-500/40"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-2xl bg-zinc-800 border border-pink-500/30 text-pink-400 flex items-center justify-center font-bold text-xs shadow-xs">
                        {partner?.display_name?.slice(0, 2).toUpperCase() || 'TM'}
                      </div>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#121214] rounded-full shadow-[0_0_4px_#10b981]" />
                  </div>

                  <div>
                    <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                      <span>{partner?.display_name || 'Companion'}</span>
                      <span className="text-[10px] bg-pink-500/15 text-pink-300 border border-pink-500/30 px-1.5 py-0.2 rounded-md font-semibold capitalize">
                        {partner?.role || 'Member'}
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{partnerTyping ? 'Typing...' : 'Active now'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchConversations()}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                    title="Live Refresh"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-[#0a0a0c]">
                {loadingMessages ? (
                  <div className="text-center py-12 text-xs text-zinc-500 flex flex-col items-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-pink-500" />
                    <span>Loading real-time chat...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-16 text-xs text-zinc-400 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-pink-500/15 border border-pink-500/30 text-pink-400 flex items-center justify-center mx-auto shadow-[0_0_12px_rgba(255,45,141,0.3)]">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-white text-sm">Start your conversation!</p>
                    <p className="text-zinc-400 max-w-xs mx-auto">
                      Send a friendly introduction or coordinate your meetup location and time.
                    </p>
                    <div className="flex justify-center gap-1.5 pt-2">
                      {QUICK_REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleSendMessage(undefined, emoji)}
                          className="w-9 h-9 text-lg rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-pink-500/40 transition-transform active:scale-95 cursor-pointer shadow-xs"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((m, idx) => {
                    const isMe = m.sender_id === user?.id;
                    const showAvatar =
                      !isMe && (idx === messages.length - 1 || messages[idx + 1]?.sender_id !== m.sender_id);

                    return (
                      <div
                        key={m.id}
                        className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isMe && (
                          <div className="w-7 h-7 shrink-0">
                            {showAvatar ? (
                              partner?.avatar_url ? (
                                <img
                                  src={partner.avatar_url}
                                  alt="Partner"
                                  className="w-7 h-7 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-zinc-800 border border-pink-500/30 text-pink-400 flex items-center justify-center font-bold text-[10px]">
                                  {partner?.display_name?.slice(0, 1) || 'U'}
                                </div>
                              )
                            ) : null}
                          </div>
                        )}

                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div
                            className={`max-w-[82%] sm:max-w-md px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed transition-all shadow-xs ${
                              isMe
                                ? 'bg-pink-600 text-white rounded-br-xs shadow-[0_0_12px_rgba(255,45,141,0.35)]'
                                : 'bg-zinc-900 text-zinc-100 border border-zinc-800 rounded-bl-xs'
                            }`}
                          >
                            {m.content}
                          </div>

                          <div className="flex items-center gap-1 mt-0.5 px-1 text-[9px] text-zinc-500">
                            <span>
                              {new Date(m.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {isMe && (
                              <CheckCheck className="w-3 h-3 text-pink-400 inline" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Partner Typing Indicator */}
                {partnerTyping && (
                  <div className="flex items-center gap-2 text-zinc-400 text-xs py-1">
                    <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-bounce" />
                    </div>
                    <span className="text-[11px] italic text-zinc-400">
                      {partner?.display_name || 'User'} is typing...
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Reactions Bar */}
              <div className="px-4 py-1.5 bg-[#121214] border-t border-zinc-800/80 flex items-center gap-2 overflow-x-auto">
                <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider shrink-0">
                  Quick:
                </span>
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSendMessage(undefined, emoji)}
                    className="text-sm px-2 py-0.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-pink-500/40 transition-transform active:scale-90 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Message Input Bar */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 sm:p-3.5 bg-[#121214] border-t border-zinc-800 flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={`Message ${partner?.display_name || 'user'}...`}
                  value={newMessageText}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 rounded-2xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500/40 focus:outline-hidden transition-all"
                />

                <button
                  type="submit"
                  disabled={!newMessageText.trim() || sending}
                  className="p-2.5 bg-pink-600 hover:bg-pink-500 active:opacity-90 disabled:opacity-40 text-white rounded-2xl shadow-[0_0_12px_rgba(255,45,141,0.35)] transition-all cursor-pointer shrink-0"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            /* Empty Desktop Chat State */
            <div className="p-8 text-center text-zinc-500 space-y-3 my-auto">
              <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 text-zinc-500 flex items-center justify-center mx-auto shadow-xs">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-white text-base">
                Your Direct Conversations
              </h3>
              <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                Select a conversation from the left to read messages and reply instantly.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
