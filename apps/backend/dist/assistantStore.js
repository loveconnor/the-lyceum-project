"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteConversation = exports.updateConversationTitle = exports.ensureConversation = exports.appendAssistantMessages = exports.getAssistantMessages = exports.createAssistantConversation = exports.listAssistantConversations = void 0;
const supabaseAdmin_1 = require("./supabaseAdmin");
const CONV_TABLE = 'assistant_conversations';
const MSG_TABLE = 'assistant_messages';
const ensureConversationOwnership = async (supabase, conversationId, userId) => {
    const { data, error } = await supabase
        .from(CONV_TABLE)
        .select('id, user_id, title, last_message, created_at, updated_at')
        .eq('id', conversationId)
        .maybeSingle();
    if (error)
        throw error;
    if (!data) {
        const err = new Error('Conversation not found');
        err.status = 404;
        throw err;
    }
    if (data.user_id !== userId) {
        const err = new Error('Forbidden');
        err.status = 403;
        throw err;
    }
    return data;
};
const listAssistantConversations = async (userId) => {
    const supabase = (0, supabaseAdmin_1.getSupabaseAdmin)();
    const { data, error } = await supabase
        .from(CONV_TABLE)
        .select('id, title, last_message, created_at, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false });
    if (error)
        throw error;
    return (data || []);
};
exports.listAssistantConversations = listAssistantConversations;
const createAssistantConversation = async (userId, title) => {
    const supabase = (0, supabaseAdmin_1.getSupabaseAdmin)();
    const { data, error } = await supabase
        .from(CONV_TABLE)
        .insert({ user_id: userId, title })
        .select()
        .single();
    if (error)
        throw error;
    return data;
};
exports.createAssistantConversation = createAssistantConversation;
const getAssistantMessages = async (conversationId, userId) => {
    const supabase = (0, supabaseAdmin_1.getSupabaseAdmin)();
    await ensureConversationOwnership(supabase, conversationId, userId);
    const { data, error } = await supabase
        .from(MSG_TABLE)
        .select('id, role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
    if (error)
        throw error;
    return (data || []);
};
exports.getAssistantMessages = getAssistantMessages;
const appendAssistantMessages = async (conversationId, userId, messages, lastMessagePreview) => {
    const supabase = (0, supabaseAdmin_1.getSupabaseAdmin)();
    await ensureConversationOwnership(supabase, conversationId, userId);
    const { error } = await supabase.from(MSG_TABLE).insert(messages.map((m) => ({
        conversation_id: conversationId,
        role: m.role,
        content: m.content,
    })));
    if (error)
        throw error;
    const { error: updateError } = await supabase
        .from(CONV_TABLE)
        .update({
        last_message: lastMessagePreview,
        updated_at: new Date().toISOString(),
    })
        .eq('id', conversationId);
    if (updateError)
        throw updateError;
};
exports.appendAssistantMessages = appendAssistantMessages;
const ensureConversation = async (userId, conversationId, fallbackTitle) => {
    if (conversationId) {
        const supabase = (0, supabaseAdmin_1.getSupabaseAdmin)();
        return ensureConversationOwnership(supabase, conversationId, userId);
    }
    // Always use "New chat" as initial title - will be updated by AI after first message
    return (0, exports.createAssistantConversation)(userId, 'New chat');
};
exports.ensureConversation = ensureConversation;
const updateConversationTitle = async (conversationId, userId, title) => {
    const supabase = (0, supabaseAdmin_1.getSupabaseAdmin)();
    await ensureConversationOwnership(supabase, conversationId, userId);
    const { error } = await supabase
        .from(CONV_TABLE)
        .update({ title: title.slice(0, 120), updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    if (error)
        throw error;
};
exports.updateConversationTitle = updateConversationTitle;
const deleteConversation = async (conversationId, userId) => {
    const supabase = (0, supabaseAdmin_1.getSupabaseAdmin)();
    await ensureConversationOwnership(supabase, conversationId, userId);
    const { error } = await supabase.from(CONV_TABLE).delete().eq('id', conversationId);
    if (error)
        throw error;
};
exports.deleteConversation = deleteConversation;
