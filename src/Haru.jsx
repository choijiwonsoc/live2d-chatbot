import * as PIXI from "pixi.js";
import { Live2DModel } from "pixi-live2d-display";
import { useEffect } from "react";

window.PIXI = PIXI;

Live2DModel.registerTicker(PIXI.Ticker);

const Haru = () => {
  useEffect(() => {
    const app = new PIXI.Application({
      view: document.getElementById("canvas"),
      autoStart: true,
      resizeTo: window,
      backgroundColor: 0x1099bb,
    });

    Live2DModel.from("src/assets/mao_pro_en/runtime/mao_pro.model3.json").then(
      (model) => {
        app.stage.addChild(model);
        model.scale.set(0.1);

        model.on("pointertap", () => {
          model.motion("Tap@Body");
        });

        model.on("idle", () => {
          model.motion("Idle");
        });
      }
    );
  }, []);

  return <canvas id="canvas" />;
};

export default Haru;
