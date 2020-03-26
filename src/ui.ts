import "phaser";

import { GameEvent } from "./types";
import { GameScene } from "./game";
import TextButton from "./textButton";

class UI extends Phaser.Scene {
  tooltip: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "ui", active: true });
  }

  renderActorButtons(actor) {
    const buttonGroup = this.add.group();
    const height = Number(this.game.config.height);

    const tb1 = new TextButton(this, 32, height - 62, "Ability 1", () => {
      console.log("clicked tb1");
    });
    buttonGroup.add(tb1);

    const tb2 = new TextButton(
      this,
      32 + tb1.width + 10,
      height - 62,
      "Hello Piggy",
      () => {
        console.log("clicked tb2");
      }
    );
    buttonGroup.add(tb1);
  }

  create() {
    const game = this.scene.get("game");

    if (!(game instanceof GameScene)) {
      return;
    }

    const actor = game.currentActor;
    this.renderActorButtons(game.currentActor);
  }
}

export default UI;
