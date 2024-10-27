import { useState, useEffect, useRef } from "react";
import axios from "axios";

const FaceDetection = () => {
  const [detections, setDetections] = useState([]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    // Mengakses webcam saat komponen dimuat
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

    // Interval untuk mengambil gambar dari webcam setiap 1 detik
    const intervalId = setInterval(() => {
      captureImage();
    }, 1000);

    return () => {
      clearInterval(intervalId); // Bersihkan interval saat komponen di-unmount
    };
  }, []);

  const captureImage = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas) {
      const context = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Menggambar frame video ke dalam canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Mengonversi canvas menjadi Blob dan mengirim ke API
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

            // Memeriksa respons dan mengambil data deteksi
            if (
              response.data &&
              response.data.data &&
              response.data.data.results
            ) {
              setDetections(response.data.data.results);
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
      {/* Tampilkan "webcam" jika tidak ada deteksi atau nama pertama yang terdeteksi */}
      <div className="absolute top-2 left-2 text-white text-sm">
        {detections.length > 0 ? detections[0].name : "webcam"}
      </div>

      <div className="bg-indigo-100 w-full h-5/6 rounded-xl mt-6">
        <div className="relative w-full h-full">
          {/* Video element untuk menampilkan stream dari webcam */}
          <video
            ref={videoRef}
            autoPlay
            muted
            className="absolute w-full h-full object-cover rounded-xl"
          />

          {/* Canvas untuk menangkap frame dari video */}
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {/* Menampilkan hasil deteksi wajah */}
          {detections.map((det, index) => {
            const [x1, y1, x2, y2] = det.bounding_box;

            // Menghitung skala bounding box
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
