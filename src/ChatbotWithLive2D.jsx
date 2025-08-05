import { useState, useEffect, useRef } from "react";
import axios from "axios";
import * as PIXI from "pixi.js";
import { Live2DModel } from "pixi-live2d-display";
import Typewriter from "./Typewriter";
import FaceDetection from "./FaceDetection";

// Inisialisasi SpeechRecognition (Web Speech API)
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

const ChatbotWithLive2D = () => {
  const [chatHistory, setChatHistory] = useState([]);
  const [textInput, setTextInput] = useState("");
  const [modelResponse, setModelResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const chatContainerRef = useRef(null);
  const modelRef = useRef(null);

  // Load Live2D Model
  useEffect(() => {
    const loadLive2DModel = async () => {
      const app = new PIXI.Application({
        view: document.getElementById("canvas"),
        autoStart: true,
        backgroundAlpha: 0,
      });
      const model = await Live2DModel.from(
        //"src/assets/catgirl/sixteenthes.model3.json",
        "src/assets/Mark/Mark.model3.json",
        { autoInteract: true }
      );

      model.scale.set(0.3);
      app.stage.addChild(model);
      modelRef.current = model;
      console.log("Motion Groups:", model.internalModel.motionManager.motionGroups);
      model.internalModel.motionManager.stopAllMotions();
    };
    loadLive2DModel();

  }, []);

  // Speech recognition configuration
  useEffect(() => {
    if (recognition) {
      // recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "id-ID";

      recognition.onresult = (event) => {
        let interim = "";
        let finalTranscript = "";

        // Mengolah result dari SpeechRecognition
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interim += transcript;
          }
        }

        // Set interim transcript untuk ditampilkan secara bertahap
        setInterimTranscript(interim);

        // Jika ada hasil final, kirim sebagai pesan
        if (finalTranscript) {
          sendMessage(finalTranscript);
          setInterimTranscript(""); // Hapus interim transcript
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
      };
    }
  }, []);

  // Function to start and stop speech recognition
  const toggleListening = () => {
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
    setIsListening(!isListening);
  };

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
      console.log("MODEL", modelRef.current);
      console.log("MOTION", modelRef.current.internalModel.motionManager);

      PIXI.Ticker.shared.add(() => {
        if (
          modelRef.current &&
          modelRef.current.internalModel &&
          modelRef.current.internalModel.coreModel && 
          modelRef.current.internalModel.motionManager
        ) {
          modelRef.current.internalModel.motionManager.stopAllMotions();
          console.log(modelRef.current.internalModel.motionManager);
          modelRef.current.internalModel.coreModel.setParameterValueById(
            "ParamMouthOpenY",
            1.0 // Use float between 0.0 and 1.0
          );
        }
      });
      

      if (!audio.paused) {
        requestAnimationFrame(animateLipSync);
      }
    };

    audio.play();
    animateLipSync();
    audio.onended = () => {
      setTimeout(() => setModelResponse(""), 3000);
      setIsLoading(false);
    };
  };

  const sendMessage = async (message) => {
    const sampleAudioBase64 = "UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YRAAAAAgAAAAHgAAAB4AAAAeAAAAHgAAAB4AAAAeAAAAHgAAAB4AAAAeAAAAHgAAAB4AAAAeAAAAHgAAAB4AAAAeAAAAHgAAAB4AAAAeAAAAHgAAAB4AAAAeAAAAHgAAAB4AAAAeAAAAHgAAAB4AAAAeAAAAHgAAAB4AAAAeAAAAHgAAAB4AAAAeAAAAHgAAAB4AAAAeAAAAHgAAAB4AAAAeAAAAHgAAAB4AAAAeAAAAHgAAAB4AAAAeAAAAHgAAAB4AAAAeAAAAHgAAAB4AAAAeAAAAHgAAAB4AAAAeAAAAHgAAAB4AAAAeAAAAHgAAAA==";
    playAudioWithLipSync(sampleAudioBase64);
    // if (!message.trim()) return;

    // setChatHistory((prev) => [...prev, { sender: "user", message }]);
    // setIsLoading(true);

    // try {
    //   const { data } = await axios.post("http://127.0.0.1:8000/generate", {
    //     text: message,
    //   });

    //   const botResponse = data.data.response;
    //   const audioData = data.data.audio;

    //   setChatHistory((prev) => [
    //     ...prev,
    //     { sender: "bot", message: botResponse },
    //   ]);

    //   setModelResponse(botResponse);
    //   setIsLoading(false);

    //   if (audioData) {
    //     playAudioWithLipSync(audioData);
    //   } else {
    //     setTimeout(() => setModelResponse(""), 3000);
    //   }
    // } catch {
    //   setChatHistory((prev) => [
    //     ...prev,
    //     { sender: "bot", message: "Maaf, terjadi kesalahan." },
    //   ]);
    //   setModelResponse("Maaf, terjadi kesalahan.");
    //   setIsLoading(false);
    //   setTimeout(() => setModelResponse(""), 5000);
    // }
  };

  return (
    <div className="bg-indigo-200 w-full h-screen flex items-center justify-center font-sniglet">
      <div className="bg-indigo-100 w-[900px] h-[500px] rounded-3xl shadow p-4 relative flex">
        <div className="flex flex-col w-5/6">
          <div className="bg-[url('https://sozaino.site/wp-content/uploads/2024/07/okumono_animalb20.png')] bg-cover bg-center bg-no-repeat h-full mb-3 rounded-3xl p-4 relative border">
            <canvas
              id="canvas"
              className="w-[90%] translate-y-4 translate-x-20"
            ></canvas>

            {isLoading ? (
              <div className="absolute bottom-3 w-fit py-2 bg-white shadow text-bengkod px-3 rounded-xl text-sm mx-auto text-start">
                <div className="flex items-center space-x-1 h-4">
                  <div className="h-1.5 w-1.5 bg-bengkod rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="h-1.5 w-1.5 bg-bengkod rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="h-1.5 w-1.5 bg-bengkod rounded-full animate-bounce"></div>
                </div>
              </div>
            ) : (
              modelResponse && (
                <div className="absolute bottom-3 w-fit max-w-[90%] py-2 bg-white shadow text-bengkod px-3 rounded-xl text-sm mx-auto text-start rounded-tl-none">
                  <Typewriter text={modelResponse} />
                </div>
              )
            )}
          </div>

          <div className="relative flex items-center">
            <input
              type="text"
              className="w-[92%] p-2 pr-10 pl-4 rounded-2xl shadow focus:outline-none text-[#221972]"
              placeholder="Ketik pesan..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  sendMessage(textInput);
                  setTextInput("");
                }
              }}
            />
            <button
              onClick={() => sendMessage(textInput)}
              className="absolute right-[3.2rem] flex items-center p-1 text-bengkod focus:outline-none"
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
                  d="M6 12L3.269 3.125A59.769 59.769 0 0 1 21.485 12A59.768 59.768 0 0 1 3.27 20.875L6 12Zm0 0h7.5"
                />
              </svg>
            </button>

            <button
              onClick={toggleListening}
              className="absolute right-1 flex items-center p-1 text-bengkod focus:outline-none bg-white rounded-full shadow"
            >
              <div className="mic-container">
                {isListening && <div className="wave-animation"></div>}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-7 p-1"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
                  />
                </svg>
              </div>
            </button>
          </div>
        </div>

        <div className="flex flex-col w-1/3 h-full ml-4">
          <FaceDetection />

          <div className="bg-indigo-200 h-2/3 rounded-xl mt-4 p-2 relative">
            <span className="absolute top-2 left-2 text-white text-sm">
              chat
            </span>
            <div
              className="bg-indigo-100 w-full h-[91%] rounded-xl mt-6 p-2 overflow-y-auto no-scrollbar"
              ref={chatContainerRef}
            >
              {/* Render chat history */}
              {chatHistory.map((chat, index) => (
                <div
                  key={index}
                  className={`text-xs ${
                    chat.sender === "user"
                      ? "text-bengkod bg-white"
                      : "text-white bg-indigo-400"
                  } p-2 px-3 rounded-2xl w-fit mb-2 ${
                    chat.sender === "user"
                      ? "rounded-br-none ml-auto"
                      : "rounded-bl-none mr-auto"
                  }`}
                >
                  {chat.message}
                </div>
              ))}
              {/* Render interim transcript */}
              {interimTranscript && (
                <div className="text-xs text-bengkod bg-white p-2 px-3 rounded-2xl w-fit mb-2 rounded-br-none ml-auto">
                  {interimTranscript}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatbotWithLive2D;
