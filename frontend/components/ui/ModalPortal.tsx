"use client";

import { useEffect, useState, ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalPortalProps {
  children: ReactNode;
  isOpen?: boolean;
}

/**
 * ModalPortal guarantees any modal or dialog is rendered directly under document.body.
 * This completely isolates the modal from any parent CSS transforms, filters,
 * or layout constraints, ensuring `fixed inset-0` attaches to the true 100vw x 100vh viewport
 * and flex centering places the modal dead center on any display size.
 */
export function ModalPortal({ children, isOpen = true }: ModalPortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(children, document.body);
}
