import { useEffect } from "react";
import * as PIXI from "pixi.js";
import { Live2DModel } from "pixi-live2d-display";
import Typewriter from "./Typewriter";

const Live2DModelDisplay = ({ modelRef, modelResponse, isLoading }) => {
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
          autoInteract: false,
        }
      );
      model.scale.set(0.3);
      app.stage.addChild(model);
      modelRef.current = model;
    };
    loadLive2DModel();
  }, [modelRef]);

  return (
    <div>
      <canvas
        id="canvas"
        className="w-[100%] translate-y-[3.5rem] translate-x-20"
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
  );
};

export default Live2DModelDisplay;
