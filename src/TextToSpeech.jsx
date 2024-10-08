// TextToSpeech.js
import React from "react";

const TextToSpeech = ({ text, onStart, onEnd }) => {
  const speak = () => {
    if (!text) return; // Check if text is provided

    const utterance = new SpeechSynthesisUtterance(text);

    // Trigger lip sync callback when speaking starts
    utterance.onstart = () => {
      if (onStart) onStart(); // Call the onStart callback to trigger talking animation
    };

    // Trigger lip sync callback when speaking ends
    utterance.onend = () => {
      if (onEnd) onEnd(); // Call the onEnd callback to trigger idle animation
    };

    // Start speaking the text
    speechSynthesis.speak(utterance);
  };

  return <button onClick={speak}>Speak</button>;
};

export default TextToSpeech;
