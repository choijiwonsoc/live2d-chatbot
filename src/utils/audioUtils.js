export const playAudioWithLipSync = (audioBase64, modelRef) => {
  const audio = new Audio(`data:audio/wav;base64,${audioBase64}`);
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createMediaElementSource(audio);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);
  analyser.connect(audioContext.destination);

  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  const animateLipSync = () => {
    analyser.getByteFrequencyData(dataArray);
    let volume = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const mouthOpenY = Math.min((volume / 256) * 5.5, 1.0);

    if (modelRef.current?.internalModel?.coreModel) {
      modelRef.current.internalModel.coreModel.setParameterValueById(
        "ParamMouthOpenY",
        mouthOpenY
      );
    }

    if (!audio.paused) requestAnimationFrame(animateLipSync);
  };

  audio.play();
  animateLipSync();
};
