import * as PIXI from "pixi.js";
import { Live2DModel } from "pixi-live2d-display";
import { useEffect } from "react";

window.PIXI = PIXI;

const Kei = () => {
  let model;

  useEffect(() => {
    const app = new PIXI.Application({
      view: document.getElementById("canvas"),
      autoStart: true,
      backgroundColor: 0xffffff,
    });

    Live2DModel.from(
      "src/assets/kei_en/kei_vowels_pro/runtime/kei_vowels_pro.model3.json"
    ).then((loadedModel) => {
      model = loadedModel;
      app.stage.addChild(model);
      model.scale.set(0.6);

      // model.on("pointertap", () => {
      //   model.motion("Tap@Body");
      // });

      model.on("idle", () => {
        model.motion("Idle");
      });
    });
  }, []);

  const startSpeaking = () => {
    if (model) {
      playAudioWithLipSync(
        model,
        "src/assets/kei_en/kei_vowels_pro/runtime/sounds/01_kei_jp.wav"
      );
    }
  };

  const playAudioWithLipSync = (model, audioSrc) => {
    const audio = new Audio(audioSrc);
    audio.addEventListener("error", (e) => {
      console.error("Audio file could not be loaded:", e);
    });

    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    const source = audioContext.createMediaElementSource(audio);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    function animateLipSync() {
      analyser.getByteFrequencyData(dataArray);
      let volume = dataArray.reduce((a, b) => a + b) / dataArray.length;

      // Kalikan volume untuk meningkatkan efek lebar mulut
      const scaleFactor = 5.5; // Tingkatkan faktor ini untuk membuat mulut terbuka lebih lebar
      const mouthOpenY = Math.min((volume / 256) * scaleFactor, 1.0); // pastikan nilainya antara 0 dan 1

      if (model && model.internalModel && model.internalModel.coreModel) {
        model.internalModel.coreModel.setParameterValueById(
          "ParamMouthOpenY",
          mouthOpenY
        );
      }

      if (!audio.paused) {
        requestAnimationFrame(animateLipSync);
      }
    }

    audio.play();
    animateLipSync();
  };

  return (
    <div className="">
      <canvas id="canvas"></canvas>
      <button onClick={startSpeaking} className="bg-red-300 p-3">
        Start Speaking
      </button>
    </div>
  );
};

export default Kei;
