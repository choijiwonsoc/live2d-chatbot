import { useState, useEffect, useRef } from "react";
import axios from "axios";

const FaceDetection = () => {
  const [detections, setDetections] = useState([]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const audioPlayedRef = useRef(false); // Tambahkan ref untuk melacak pemutaran audio

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

    const intervalId = setInterval(() => {
      captureImage();
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const captureImage = async () => {
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
              setDetections(response.data.data.results);

              const detectedName = response.data.data.results[0]?.name;

              // Periksa apakah audio belum pernah diputar dan audio tersedia
              if (
                detectedName &&
                !audioPlayedRef.current &&
                response.data.data.audio
              ) {
                const audio = new Audio(
                  `data:audio/wav;base64,${response.data.data.audio}`
                );
                audio.play();

                // Tandai bahwa audio telah diputar
                audioPlayedRef.current = true;
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

  return (
    <div className="bg-indigo-200 rounded-xl h-1/3 p-2 relative">
      <div className="absolute top-2 left-2 text-white text-sm">
        {detections.length > 0 ? detections[0].name : "webcam"}
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
              ? videoRef.current.clientHeight / videoRef.current.videoHeight
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
              ></div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FaceDetection;
