import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from './supabaseAdmin';

export type AssistantConversation = {
  id: string;
  user_id: string;
  title?: string | null;
  last_message?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type AssistantMessage = {
  id?: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at?: string;
};

const CONV_TABLE = 'assistant_conversations';
const MSG_TABLE = 'assistant_messages';

const ensureConversationOwnership = async (
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
) => {
  const { data, error } = await supabase
    .from(CONV_TABLE)
    .select('id, user_id, title, last_message, created_at, updated_at')
    .eq('id', conversationId)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    const err: any = new Error('Conversation not found');
    err.status = 404;
    throw err;
  }
  if (data.user_id !== userId) {
    const err: any = new Error('Forbidden');
    err.status = 403;
    throw err;
  }
  return data as AssistantConversation;
};

export const listAssistantConversations = async (userId: string) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(CONV_TABLE)
    .select('id, title, last_message, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as AssistantConversation[];
};

export const createAssistantConversation = async (userId: string, title?: string) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(CONV_TABLE)
    .insert({ user_id: userId, title })
    .select()
    .single();

  if (error) throw error;
  return data as AssistantConversation;
};

export const getAssistantMessages = async (conversationId: string, userId: string) => {
  const supabase = getSupabaseAdmin();
  await ensureConversationOwnership(supabase, conversationId, userId);

  const { data, error } = await supabase
    .from(MSG_TABLE)
    .select('id, role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as AssistantMessage[];
};

export const appendAssistantMessages = async (
  conversationId: string,
  userId: string,
  messages: AssistantMessage[],
  lastMessagePreview?: string,
) => {
  const supabase = getSupabaseAdmin();
  await ensureConversationOwnership(supabase, conversationId, userId);

  const { error } = await supabase.from(MSG_TABLE).insert(
    messages.map((m) => ({
      conversation_id: conversationId,
      role: m.role,
      content: m.content,
    })),
  );
  if (error) throw error;

  const { error: updateError } = await supabase
    .from(CONV_TABLE)
    .update({
      last_message: lastMessagePreview,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  if (updateError) throw updateError;
};

export const ensureConversation = async (
  userId: string,
  conversationId?: string,
  fallbackTitle?: string,
) => {
  if (conversationId) {
    const supabase = getSupabaseAdmin();
    return ensureConversationOwnership(supabase, conversationId, userId);
  }
  // Always use "New chat" as initial title - will be updated by AI after first message
  return createAssistantConversation(userId, 'New chat');
};

export const updateConversationTitle = async (conversationId: string, userId: string, title: string) => {
  const supabase = getSupabaseAdmin();
  await ensureConversationOwnership(supabase, conversationId, userId);
  const { error } = await supabase
    .from(CONV_TABLE)
    .update({ title: title.slice(0, 120), updated_at: new Date().toISOString() })
    .eq('id', conversationId);
  if (error) throw error;
};

export const deleteConversation = async (conversationId: string, userId: string) => {
  const supabase = getSupabaseAdmin();
  await ensureConversationOwnership(supabase, conversationId, userId);
  const { error } = await supabase.from(CONV_TABLE).delete().eq('id', conversationId);
  if (error) throw error;
};
