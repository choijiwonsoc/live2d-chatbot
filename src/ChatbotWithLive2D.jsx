import { useState, useEffect, useRef } from "react";
import axios from "axios";
import * as PIXI from "pixi.js";
import { Live2DModel } from "pixi-live2d-display";

const ChatbotWithLive2D = () => {
  const [chatHistory, setChatHistory] = useState([]);
  const [textInput, setTextInput] = useState("");
  const chatContainerRef = useRef(null);
  const modelRef = useRef(null);

  const videoRef = useRef(null);

  useEffect(() => {
    // Meminta akses ke webcam
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        // Menghubungkan stream ke elemen video
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((error) => {
        console.error("Error accessing webcam: ", error);
      });
  }, []);

  // Load Live2D Model
  useEffect(() => {
    const loadLive2DModel = async () => {
      const app = new PIXI.Application({
        view: document.getElementById("canvas"),
        autoStart: true,
        backgroundAlpha: 0,
      });
      const model = await Live2DModel.from(
        "src/assets/catgirl/sixteenthes.model3.json",
        {
          autoInteract: false, // Nonaktifkan interaksi mouse
        }
      );

      model.scale.set(0.3);
      app.stage.addChild(model);
      modelRef.current = model;
    };
    loadLive2DModel();
  }, []);

  // Scroll to the bottom when chatHistory updates
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Function to play audio with lip-sync
  const playAudioWithLipSync = (audioBase64) => {
    const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    const source = audioContext.createMediaElementSource(audio);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const animateLipSync = () => {
      analyser.getByteFrequencyData(dataArray);
      let volume = dataArray.reduce((a, b) => a + b) / dataArray.length;

      const scaleFactor = 5.5;
      const mouthOpenY = Math.min((volume / 256) * scaleFactor, 1.0);

      if (
        modelRef.current &&
        modelRef.current.internalModel &&
        modelRef.current.internalModel.coreModel
      ) {
        modelRef.current.internalModel.coreModel.setParameterValueById(
          "ParamMouthOpenY",
          mouthOpenY
        );
      }

      if (!audio.paused) {
        requestAnimationFrame(animateLipSync);
      }
    };

    audio.play();
    animateLipSync();
  };

  // Send message to API and handle response
  const sendMessage = async (message) => {
    if (!message.trim()) return;

    setChatHistory((prev) => [...prev, { sender: "user", message }]);
    try {
      const { data } = await axios.post("http://127.0.0.1:8000/generate", {
        text: message,
      });

      const botResponse = data.data.response;
      const audioData = data.data.audio;

      setChatHistory((prev) => [
        ...prev,
        { sender: "bot", message: botResponse },
      ]);

      // Play audio with lip-sync if available
      if (audioData) {
        playAudioWithLipSync(audioData);
      }
    } catch {
      setChatHistory((prev) => [
        ...prev,
        { sender: "bot", message: "Maaf, terjadi kesalahan." },
      ]);
    }
  };

  const handleSendText = () => {
    sendMessage(textInput);
    setTextInput("");
  };

  return (
    <div className="bg-indigo-200 w-full h-screen flex items-center justify-center font-sniglet">
      <div className="bg-indigo-100 w-[900px] h-[500px] rounded-3xl shadow p-4 relative flex">
        {/* Video Section */}
        <div className="flex flex-col w-5/6">
          <div className="bg-[url('https://sozaino.site/wp-content/uploads/2024/07/okumono_animalb20.png')] bg-cover bg-center bg-no-repeat h-full mb-3 rounded-3xl p-4 relative border">
            {/* live2d */}
            <canvas
              id="canvas"
              className="w-[90%] translate-y-4 translate-x-20"
            ></canvas>
          </div>

          {/* input message */}
          <div className="relative">
            <input
              type="text"
              className="w-full p-2 pr-10 pl-4 rounded-2xl shadow focus:outline-none text-[#221972]"
              placeholder="Ketik pesan..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendText();
              }}
            />
            {/* Tombol Kirim Ikon */}
            <button
              onClick={handleSendText}
              className="absolute inset-y-0 right-1 flex items-center p-1 text-bengkod focus:outline-none "
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-7 bg-indigo-100 rounded-full p-1"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Sidebar (Webcam and Chat Section) */}
        <div className="flex flex-col w-1/3 h-full ml-4">
          <div className="bg-indigo-200 rounded-xl h-1/3 p-2 relative">
            <div className="absolute top-2 left-2 text-white  text-sm">
              webcam
            </div>

            <div className="bg-indigo-100 w-full h-5/6 rounded-xl mt-6">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover rounded-xl transform scale-x-[-1]"
              />
            </div>
          </div>

          {/* Chat */}
          <div className="bg-indigo-200 h-2/3 rounded-xl mt-4 p-2 relative">
            <span className="absolute top-2 left-2 text-white text-sm">
              chat
            </span>

            <div className="bg-indigo-100 w-full h-[91%] rounded-xl mt-6 p-2">
              {chatHistory
                .filter((chat) => chat.sender === "user")
                .map((chat, index) => (
                  <div
                    key={index}
                    className="text-sm text-indigo-300 bg-white p-2 px-3 rounded-2xl w-fit mb-2 rounded-br-none ml-auto"
                  >
                    {chat.message}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatbotWithLive2D;
