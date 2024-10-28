import { useState, useEffect } from "react";

const Typewriter = ({ text, delay = 50, infinite = false }) => {
  const [currentText, setCurrentText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Reset text dan index saat `text` berubah
    setCurrentText("");
    setCurrentIndex(0);
  }, [text]);

  useEffect(() => {
    if (currentIndex < text.length) {
      // Mengatur timeout untuk setiap karakter
      const timeout = setTimeout(() => {
        setCurrentText((prevText) => prevText + text[currentIndex]);
        setCurrentIndex((prevIndex) => prevIndex + 1);
      }, delay);

      // Membersihkan timeout setelah setiap pemanggilan
      return () => clearTimeout(timeout);
    } else if (infinite) {
      // Reset ke awal jika infinite
      const resetTimeout = setTimeout(() => {
        setCurrentText("");
        setCurrentIndex(0);
      }, delay * 3); // Memberikan jeda sebelum mengetik ulang

      return () => clearTimeout(resetTimeout);
    }
  }, [currentIndex, delay, infinite, text]);

  return <span>{currentText}</span>;
};

export default Typewriter;
