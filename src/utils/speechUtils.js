// SpeechRecognitionSetup.js
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

export const SpeechRecognitionSetup = ({
  setInterimTranscript,
  sendMessage,
  setIsListening,
}) => {
  if (!recognition) {
    console.error("Speech Recognition tidak didukung di browser ini.");
    return;
  }

  recognition.interimResults = true;
  recognition.lang = "id-ID"; // Bahasa Indonesia

  recognition.onresult = (event) => {
    let interim = "";
    let finalTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interim += transcript;
      }
    }

    setInterimTranscript(interim);

    if (finalTranscript) {
      sendMessage(finalTranscript);
      setInterimTranscript("");
    }
  };

  recognition.onend = () => setIsListening(false);

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
  };

  return {
    startListening: () => {
      recognition.start();
      setIsListening(true);
    },
    stopListening: () => {
      recognition.stop();
      setIsListening(false);
    },
  };
};
