import { useState, useEffect, useRef } from "react";
import axios from "axios";
import * as PIXI from "pixi.js";
import { Live2DModel } from "pixi-live2d-display";

const ChatbotWithLive2D = () => {
  const [chatHistory, setChatHistory] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [textInput, setTextInput] = useState("");
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const chatContainerRef = useRef(null);
  const modelRef = useRef(null); // Reference to the Live2D model

  useEffect(() => {
    // Load the Live2D model
    const loadLive2DModel = async () => {
      const app = new PIXI.Application({
        view: document.getElementById("canvas"),
        autoStart: true,
        backgroundColor: 0xffffff,
      });

      const model = await Live2DModel.from(
        "src/assets/kei_en/kei_vowels_pro/runtime/kei_vowels_pro.model3.json"
      );
      app.stage.addChild(model);
      model.scale.set(0.6);

      modelRef.current = model; // Store the model in ref
    };

    loadLive2DModel();
  }, []);

  useEffect(() => {
    // Speech synthesis voice selection
    const getVoices = () => {
      const voices = window.speechSynthesis
        .getVoices()
        .filter((voice) => voice.lang === "id-ID");
      if (voices.length > 1) setSelectedVoice(voices[1]);
    };

    getVoices();
    window.speechSynthesis.onvoiceschanged = getVoices;
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const sendMessage = async (message) => {
    if (message.trim()) {
      setChatHistory((prev) => [...prev, { sender: "user", message }]);
      setIsBotTyping(true);

      try {
        const { data } = await axios.post("http://127.0.0.1:8000/predict/", {
          message,
        });

        const botResponse = data.response;
        setChatHistory((prev) => [
          ...prev,
          { sender: "bot", message: botResponse },
        ]);
        speakText(botResponse);
      } catch {
        setChatHistory((prev) => [
          ...prev,
          { sender: "bot", message: "Maaf, terjadi kesalahan." },
        ]);
      } finally {
        setIsBotTyping(false);
      }
    }
  };

  const speakText = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.rate = 1.1;
    utterance.pitch = 1;

    // Mulai sinkronisasi bibir berdasarkan waktu bicara
    utterance.onstart = () => {
      setIsSpeaking(true);
      let mouthOpen = 0;

      // Atur interval untuk perubahan gerakan mulut berdasarkan durasi kata
      const durationPerWord = 200; // Sesuaikan durasi untuk gerakan mulut per kata
      const lipSyncInterval = setInterval(() => {
        // Variasi membuka tutup mulut untuk efek lip-sync
        mouthOpen = mouthOpen === 1 ? 0.5 : 1.0;

        if (modelRef.current && modelRef.current.internalModel) {
          modelRef.current.internalModel.coreModel.setParameterValueById(
            "ParamMouthOpenY",
            mouthOpen
          );
        }
      }, durationPerWord); // Sesuaikan sesuai kecepatan ucapan atau gunakan deteksi otomatis

      utterance.onend = () => {
        clearInterval(lipSyncInterval);
        setIsSpeaking(false);
        if (modelRef.current && modelRef.current.internalModel) {
          modelRef.current.internalModel.coreModel.setParameterValueById(
            "ParamMouthOpenY",
            0
          ); // Tutup mulut setelah selesai bicara
        }
      };
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleSendText = () => {
    sendMessage(textInput);
    setTextInput("");
  };

  return (
    <div className="flex items-center h-screen justify-center">
      <div>
        <canvas id="canvas"></canvas>
      </div>
      <div className="w-full max-w-md p-4 bg-gray-100 rounded-xl">
        <div
          ref={chatContainerRef}
          className="h-64 overflow-y-auto no-scrollbar mb-4 p-2 bg-white rounded-lg flex flex-col"
        >
          {chatHistory.map((chat, index) => (
            <div
              key={index}
              className={`mb-2 p-2 px-4 rounded-full inline-block max-w-full ${
                chat.sender === "user"
                  ? "bg-blue-500 text-white text-right self-end"
                  : "bg-gray-200 text-left self-start"
              }`}
            >
              {chat.message}
            </div>
          ))}
        </div>

        <div className="flex items-center mt-4">
          <input
            type="text"
            className="w-full p-2 px-4 rounded-full mr-2"
            placeholder="Ketik pesan..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSendText();
            }}
          />
          <button
            onClick={handleSendText}
            className="p-2 bg-blue-500 text-white rounded-lg"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatbotWithLive2D;
