"use client";

import { useEffect, useRef } from "react";
import { useEditor } from "@/store/editor";

const DEBOUNCE_MS = 800;

export function useAutosave() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<Promise<void> | null>(null);

  useEffect(() => {
    async function save() {
      const st = useEditor.getState();
      if (!st.projectId || !st.isDirty || st.isSaving) return;
      st.markSaving(true);
      try {
        await fetch(`/api/projects/${st.projectId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: st.projectName, data: st.scene }),
        });
        useEditor.getState().markSaved();
      } catch {
        useEditor.getState().markSaving(false);
      }
    }

    const unsubscribe = useEditor.subscribe((state, prev) => {
      const dirtyChanged = state.isDirty !== prev.isDirty;
      const sceneChanged = state.scene !== prev.scene || state.projectName !== prev.projectName;
      if (!state.isDirty) return;
      if (!sceneChanged && !dirtyChanged) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (inflight.current) return;
        inflight.current = save().finally(() => {
          inflight.current = null;
        });
      }, DEBOUNCE_MS);
    });

    function onSaveNow() {
      if (timer.current) clearTimeout(timer.current);
      if (!inflight.current) {
        inflight.current = save().finally(() => {
          inflight.current = null;
        });
      }
    }
    window.addEventListener("editor:save-now", onSaveNow);

    return () => {
      unsubscribe();
      window.removeEventListener("editor:save-now", onSaveNow);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
}
