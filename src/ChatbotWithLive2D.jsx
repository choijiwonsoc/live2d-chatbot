import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Live2DModelDisplay from "./components/Live2DModelDisplay";

//  SpeechRecognition (Web Speech API)
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

const ChatbotWithLive2D = () => {
  const [chatHistory, setChatHistory] = useState([]);
  const [textInput, setTextInput] = useState("");
  const [modelResponse, setModelResponse] = useState("");
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");

  const [hasDetected, setHasDetected] = useState(false);
  const [detections, setDetections] = useState([]);
  const detectedNames = useRef(new Set());
  const chatContainerRef = useRef(null);
  const modelRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // webcam stream for face detection
  useEffect(() => {
    const getVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    };
    getVideo();

    // Set interval to capture image for face detection
    const intervalId = setInterval(() => {
      if (!hasDetected) {
        captureImage();
      }
    }, 100);

    return () => {
      clearInterval(intervalId);
    };
  }, [hasDetected]);

  // Function to capture image for face detection
  const captureImage = async () => {
    if (hasDetected) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas) {
      const context = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(async (blob) => {
        if (blob) {
          const formData = new FormData();
          formData.append("file", blob, "webcam_frame.jpg");

          try {
            const response = await axios.post(
              "http://127.0.0.1:8000/detect/",
              formData,
              {
                headers: {
                  "Content-Type": "multipart/form-data",
                },
              }
            );

            if (
              response.data &&
              response.data.data &&
              response.data.data.results
            ) {
              setHasDetected(true);
              setDetections(response.data.data.results);

              const detectedName = response.data.data.results[0]?.name;

              // Jika nama baru belum ada dalam detectedNames, proses deteksi
              if (detectedName && !detectedNames.current.has(detectedName)) {
                detectedNames.current.add(detectedName);
                setHasDetected(true);
                setDetections(response.data.data.results);

                const responseGreetings = response.data.data.response;
                if (detectedName === "Unknown") {
                  setModelResponse("Hai, siapa namamu?");
                  generateGreetings("Hai, siapa namamu?");
                } else {
                  generateGreetings(responseGreetings);
                }

                console.log(detectedNames);
              }
            }
          } catch (error) {
            console.error(
              "Error detecting faces:",
              error.response ? error.response.data : error.message
            );
          }
        }
      }, "image/jpeg");
    }
  };

  // Function to generate greetings based on face detection
  const generateGreetings = async (responseGreetings) => {
    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/generate_audio",
        {
          text: responseGreetings,
        }
      );

      if (response.data && response.data.data && response.data.data.audio) {
        const audioBase64 = response.data.data.audio;
        setModelResponse(responseGreetings);
        playAudioWithLipSync(audioBase64);
        console.log("Greetings audio generated");
      } else {
        console.error("Audio data not found in response");
      }
    } catch (error) {
      console.error(
        "Error generating audio:",
        error.response ? error.response.data : error.message
      );
    }
  };

  // speech recognition configuration
  useEffect(() => {
    if (recognition) {
      recognition.interimResults = true;
      recognition.lang = "id-ID";

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
      recognition.onerror = (event) =>
        console.error("Speech recognition error:", event.error);
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
    setIsListening(!isListening);
  };

  // play audio with lip sync
  const playAudioWithLipSync = (audioBase64) => {
    if (isAudioPlaying) return;

    const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();

    //  source dari objek audio yg akan dianalisis
    const source = audioContext.createMediaElementSource(audio);
    const analyser = audioContext.createAnalyser(); // menganalisis audio
    analyser.fftSize = 2048;
    source.connect(analyser); // menghubungkan source ke analyser
    analyser.connect(audioContext.destination); // analyser ke output

    // nyimpen frekuensi sudio
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const animateLipSync = () => {
      // isi data dgn frek audio
      analyser.getByteFrequencyData(dataArray);
      let volume = dataArray.reduce((a, b) => a + b) / dataArray.length;

      // seberapa lebar mulut terbuka
      const scaleFactor = 2.5;
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

    // play audio dan animasi lip sync
    audio.play();
    setIsAudioPlaying(true);
    animateLipSync();

    // setelah audio selesai, reset modelResponse
    audio.onended = () => {
      setModelResponse("");
      setIsLoading(false);
      setIsAudioPlaying(false);
      setHasDetected(false);
    };
  };

  // send message to chatbot
  const sendMessage = async (message) => {
    if (!message.trim()) return;

    setChatHistory((prev) => [...prev, { sender: "user", message }]);
    setIsLoading(true);

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

      setModelResponse(botResponse);
      setIsLoading(false);

      if (audioData) {
        playAudioWithLipSync(audioData);
      } else {
        setModelResponse("");
      }
    } catch {
      setChatHistory((prev) => [
        ...prev,
        { sender: "bot", message: "Maaf, terjadi kesalahan." },
      ]);
      setModelResponse("Maaf, terjadi kesalahan.");
      setIsLoading(false);
      setModelResponse("");
    }
  };

  // scroll chat container to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  return (
    <div className="bg-indigo-200 w-full h-screen flex items-center justify-center font-sniglet">
      <div className="bg-indigo-100 w-[1200px] h-[750px] rounded-3xl shadow p-4 relative flex">
        <div className="flex flex-col w-5/6">
          <div className="bg-[url('https://sozaino.site/wp-content/uploads/2024/07/okumono_animalb20.png')] bg-cover bg-center bg-no-repeat h-full mb-3 rounded-3xl p-4 relative border">
            <Live2DModelDisplay
              modelRef={modelRef}
              modelResponse={modelResponse}
              isLoading={isLoading}
            />
          </div>

          <div className="relative flex items-center">
            <input
              type="text"
              className="w-[93%] p-3 pr-10 pl-5 rounded-3xl shadow focus:outline-none text-[#221972]"
              placeholder="Ketik pesan ke Bengbot"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isLoading && !isAudioPlaying) {
                  sendMessage(textInput);
                  setTextInput("");
                }
              }}
            />
            <button
              onClick={() => {
                if (!isLoading && !isAudioPlaying) {
                  sendMessage(textInput);
                  setTextInput("");
                }
              }}
              className="absolute right-[3.6rem] flex items-center p-2 focus:outline-none"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className={`size-8 rounded-full p-1 bg-indigo-100 text-bengkod ${
                  !isLoading && !isAudioPlaying ? "opacity-100" : "opacity-50"
                }`}
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
              className={`absolute right-0 flex items-center p-2 text-bengkod focus:outline-none bg-white rounded-full shadow ${
                !isLoading && !isAudioPlaying
                  ? "text-opacity-100"
                  : "text-opacity-50"
              }`}
            >
              <div className="mic-container">
                {isListening && !isAudioPlaying && !isLoading && (
                  <div className="wave-animation"></div>
                )}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-8 p-1"
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
          <div className="bg-indigo-200 rounded-xl h-1/3 p-2 relative">
            <div className="absolute top-2 left-2 text-white text-sm">
              {/* {detections.length > 0 ? detections[0].name : "webcam"} */}
              webcam📸
            </div>
            <div className="bg-indigo-100 w-full h-5/6 rounded-xl mt-6">
              <div className="relative w-full h-full">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  className="absolute w-full h-full object-cover rounded-xl"
                />
                <canvas ref={canvasRef} style={{ display: "none" }} />
                {detections.map((det, index) => {
                  const [x1, y1, x2, y2] = det.bounding_box;
                  const scaleX = videoRef.current
                    ? videoRef.current.clientWidth / videoRef.current.videoWidth
                    : 1;
                  const scaleY = videoRef.current
                    ? videoRef.current.clientHeight /
                      videoRef.current.videoHeight
                    : 1;

                  return (
                    <div
                      key={index}
                      style={{
                        position: "absolute",
                        border: "2px solid #C7D2FD",
                        left: `${x1 * scaleX}px`,
                        top: `${y1 * scaleY}px`,
                        width: `${(x2 - x1) * scaleX}px`,
                        height: `${(y2 - y1) * scaleY}px`,
                        pointerEvents: "none",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          top: "-20px",
                          backgroundColor: "#03026B",
                          backgroundOpacity: "0.8",
                          color: "white",
                          padding: "2px 5px",
                          borderRadius: "3px",
                          fontSize: "8px",
                        }}
                      >
                        {det.name.split(" ")[0]} - {det.emotion}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-indigo-200 h-2/3 rounded-xl mt-4 p-2 relative">
            <span className="absolute top-2 left-2 text-white text-sm">
              chat💬
            </span>
            <div
              className="bg-indigo-100 w-full h-[91%] rounded-xl mt-6 p-2 overflow-y-auto no-scrollbar"
              ref={chatContainerRef}
            >
              {chatHistory.map((chat, index) => (
                <div
                  key={index}
                  className={`text-xs ${
                    chat.sender === "user"
                      ? "text-bengkod bg-white rounded-br-none ml-auto"
                      : "text-white bg-indigo-400 rounded-bl-none mr-auto"
                  } p-2 px-3 rounded-2xl w-fit mb-2 `}
                >
                  {chat.message}
                </div>
              ))}
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
