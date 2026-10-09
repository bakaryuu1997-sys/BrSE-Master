"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// Local helper to detect language based on character ranges
function detectLanguage(text: string): "ja-JP" | "vi-VN" | "en-US" {
  // Japanese characters: Hiragana (3040-309F), Katakana (30A0-30FF), Kanji (4E00-9FBF)
  const jpRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FBF]/;
  // Vietnamese accented characters
  const viRegex = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/;
  
  if (jpRegex.test(text)) {
    return "ja-JP";
  }
  if (viRegex.test(text)) {
    return "vi-VN";
  }
  return "en-US";
}

export function useSpeechSynthesis() {
  const [isSpeaking, setSpeaking] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // Resolve all system voices
  const resolveVoices = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const voices = window.speechSynthesis.getVoices();
    voicesRef.current = voices;
    if (voices.length > 0) setVoiceReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    resolveVoices();

    const handleVoicesChanged = () => resolveVoices();
    window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
      window.speechSynthesis.cancel();
    };
  }, [resolveVoices]);

  // Find standard voice for a language
  const findVoiceForLang = useCallback((lang: string): SpeechSynthesisVoice | null => {
    const voices = voicesRef.current;
    return (
      voices.find((v) => v.lang === lang) ??
      voices.find((v) => v.lang.startsWith(lang.split("-")[0])) ??
      null
    );
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    
    // Cancel any current speaking
    window.speechSynthesis.cancel();

    // Remove markdown symbols to read cleanly
    const cleanText = text.replace(/[*_`#]/g, "").trim();
    if (!cleanText) return;

    const detectedLang = detectLanguage(cleanText);
    const utt = new SpeechSynthesisUtterance(cleanText);
    utt.lang = detectedLang;
    
    // Premium speed adjustment
    utt.rate = detectedLang === "ja-JP" ? 0.85 : 1.0;
    utt.pitch = 1.0;

    const matchedVoice = findVoiceForLang(detectedLang);
    if (matchedVoice) utt.voice = matchedVoice;

    utt.onstart = () => setSpeaking(true);
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);

    window.speechSynthesis.speak(utt);
  }, [findVoiceForLang]);

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking, voiceReady };
}
