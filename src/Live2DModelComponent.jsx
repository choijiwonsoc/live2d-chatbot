import * as PIXI from "pixi.js";

import { Live2DModel } from "pixi-live2d-display";
import { useEffect } from "react";

window.PIXI = PIXI;

const Live2DModelComponent = () => {
  useEffect(() => {
    const app = new PIXI.Application({
      view: document.getElementById("canvas"),
      autoStart: true,
      // resizeTo: window,
      backgroundColor: 0x1099bb,
    });

    Live2DModel.from(
      "src/assets/CustomCatGirl-DragToModelFolder/SIXTEENTHES.model3.json"
    ).then((model) => {
      app.stage.addChild(model);

      // model.anchor.set(0.5, 0.5);
      // model.position.set(window.innerWidth / 2, window.innerHeight / 2);
      model.scale.set(0.3);

      model.on("pointertap", () => {
        model.motion("Tap@Body");
      });
    });
  }, []);

  return (
    <div>
      <canvas id="canvas"></canvas>
    </div>
  );
};

export default Live2DModelComponent;
