"use client";

import { useEffect } from "react";
import { useEditor } from "@/store/editor";

/**
 * Vrai si l'évènement vient d'un champ de saisie (input, textarea,
 * contenteditable, select). Évite de supprimer un meuble quand l'utilisateur
 * tape dans un formulaire.
 */
function isEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Suppression de l'élément sélectionné
      if (e.key === "Delete" || e.key === "Backspace") {
        if (isEditingTarget(e.target)) return;
        const st = useEditor.getState();
        const sel = st.selection;
        if (!sel) return;
        if (sel.kind === "furniture") {
          e.preventDefault();
          st.removeFurniture(sel.id);
        } else if (sel.kind === "shelf") {
          e.preventDefault();
          st.removeShelf(sel.id);
        } else if (sel.kind === "opening") {
          e.preventDefault();
          st.removeOpening(sel.id);
        }
        // wall et room ne sont pas supprimables
        return;
      }

      // Échap : désélectionne
      if (e.key === "Escape") {
        if (isEditingTarget(e.target)) return;
        useEditor.getState().setSelection(null);
        return;
      }

      // T / R : bascule du gizmo (translate / rotate)
      if (e.key === "t" || e.key === "T") {
        if (isEditingTarget(e.target)) return;
        useEditor.getState().setTransformMode("translate");
        return;
      }
      if (e.key === "r" || e.key === "R") {
        if (isEditingTarget(e.target)) return;
        useEditor.getState().setTransformMode("rotate");
        return;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
