// Per-project chat-session state for the AI sidebar. Loads the project's chat
// tabs from the PHP backend (creating "Chat 1" if none), tracks the active tab,
// lazy-loads each tab's transcript on first switch, and exposes mutators a turn
// uses to stream into the active transcript + persist it (transcript + the
// resumable Claude session id) after the turn. Mirrors cloud-ide's Chat.tsx
// session model, backed by content_chats instead of SQLite.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ChatMessage,
  type ChatProjectType,
  type ChatSessionMeta,
  createChat,
  deleteChat,
  getChat,
  listChats,
  persistableMessages,
  updateChat,
} from "@/lib/chatSessionsApi";

export interface ChatTab extends ChatSessionMeta {
  messages: ChatMessage[];
  loaded: boolean;
}

export function useProjectChats(userEmail: string, projectType: ChatProjectType, projectId: string) {
  const [tabs, setTabs] = useState<ChatTab[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [ready, setReady] = useState(false);

  // Refs so streaming callbacks always see the latest tabs / active id.
  const tabsRef = useRef<ChatTab[]>([]);
  tabsRef.current = tabs;
  const activeRef = useRef("");
  activeRef.current = activeId;

  // Load the project's session list; create "Chat 1" if none. Eager-load the
  // first tab's transcript; the rest load on switch.
  useEffect(() => {
    if (!userEmail || !projectId) return;
    let cancelled = false;
    setReady(false);
    setTabs([]);
    setActiveId("");
    (async () => {
      try {
        let metas = await listChats(userEmail, projectType, projectId);
        if (!metas.length) metas = [await createChat(userEmail, projectType, projectId, "Chat 1")];
        if (cancelled) return;
        const first = metas[0];
        const full = await getChat(userEmail, first.id).catch(() => null);
        if (cancelled) return;
        setTabs(
          metas.map((m) => ({
            ...m,
            claudeSessionId: m.id === first.id && full ? full.claudeSessionId : m.claudeSessionId,
            messages: m.id === first.id && full ? full.messages : [],
            loaded: m.id === first.id && !!full,
          })),
        );
        setActiveId(first.id);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [userEmail, projectType, projectId]);

  const ensureLoaded = useCallback(async (id: string) => {
    const tab = tabsRef.current.find((t) => t.id === id);
    if (!tab || tab.loaded) return;
    const full = await getChat(userEmail, id).catch(() => null);
    if (full) {
      setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, messages: full.messages, claudeSessionId: full.claudeSessionId, loaded: true } : t)));
    }
  }, [userEmail]);

  const switchTo = useCallback((id: string) => { setActiveId(id); void ensureLoaded(id); }, [ensureLoaded]);

  const addTab = useCallback(async () => {
    const title = `Chat ${tabsRef.current.length + 1}`;
    const created = await createChat(userEmail, projectType, projectId, title);
    setTabs((prev) => [...prev, { ...created, messages: [], loaded: true }]);
    setActiveId(created.id);
  }, [userEmail, projectType, projectId]);

  const renameTab = useCallback((id: string, title: string) => {
    const t = title.trim();
    if (!t) return;
    setTabs((prev) => prev.map((x) => (x.id === id ? { ...x, title: t } : x)));
    void updateChat(userEmail, id, { title: t }).catch(() => {});
  }, [userEmail]);

  const closeTab = useCallback((id: string) => {
    const remaining = tabsRef.current.filter((t) => t.id !== id);
    if (!remaining.length) return; // always keep at least one tab
    setTabs(remaining);
    if (activeRef.current === id) { setActiveId(remaining[0].id); void ensureLoaded(remaining[0].id); }
    void deleteChat(userEmail, id).catch(() => {});
  }, [userEmail, ensureLoaded]);

  // ----- active-tab transcript mutators (used during a turn) -----
  const setActiveMessages = useCallback((updater: (msgs: ChatMessage[]) => ChatMessage[]) => {
    setTabs((prev) => prev.map((t) => (t.id === activeRef.current ? { ...t, messages: updater(t.messages) } : t)));
  }, []);

  const setActiveSession = useCallback((sessionId: string) => {
    setTabs((prev) => prev.map((t) => (t.id === activeRef.current ? { ...t, claudeSessionId: sessionId } : t)));
  }, []);

  // Persist the active tab (transcript + resumable session id) after a turn.
  const persistActive = useCallback(() => {
    const t = tabsRef.current.find((x) => x.id === activeRef.current);
    if (!t) return;
    void updateChat(userEmail, t.id, {
      claudeSessionId: t.claudeSessionId,
      messages: persistableMessages(t.messages),
    }).catch(() => {});
  }, [userEmail]);

  const active = tabs.find((t) => t.id === activeId) ?? null;

  return { tabs, active, activeId, ready, switchTo, addTab, renameTab, closeTab, setActiveMessages, setActiveSession, persistActive };
}
