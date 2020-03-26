import "phaser";

import { GameEvent } from "./types";
import { GameScene } from "./game";

const PADDING = 5;

const createTextButton = (scene, x, y, text, callback, callbackContext) => {
  const textNode = scene.add.text(x, y, text, {
    color: "#000",
    padding: {
      x: PADDING,
      y: PADDING,
    },
  });
  textNode.setInteractive();
  const button = scene.add.graphics();
  button.setInteractive();

  button.fillStyle(0xffffff);
  button.fillRoundedRect(x, y, textNode.width, 30, 8);

  textNode.on("pointerdown", callback, callbackContext);
  button.on("pointerdown", callback, callbackContext);
  textNode.depth = 10;
  return [textNode, button];
};

class UI extends Phaser.Scene {
  uiCache: { [key: string]: Phaser.GameObjects.Group };
  currentGroup: Phaser.GameObjects.Group;

  constructor() {
    super({ key: "ui", active: true });
    this.uiCache = {};
    this.currentGroup = null;
  }

  getCachedUI(actor) {
    if (!this.uiCache[actor.name]) {
      this.uiCache[actor.name] = this.renderActorUI(actor);
    }
    return this.uiCache[actor.name];
  }

  renderActorUI(actor) {
    console.log(`creating UI for ${actor.name}`);

    const uiGroup = this.add.group();
    switch (actor.actorType) {
      case "crew":
        const height = Number(this.game.config.height);

        const buttons = Object.keys(actor.abilities).reduce(
          (group, key, idx) => {
            const ability = actor.abilities[key];
            let x = 32;
            if (idx > 0) {
              const previousTextNode = group[group.length - 2];
              console.assert(
                previousTextNode instanceof Phaser.GameObjects.Text
              );
              x = previousTextNode.x + previousTextNode.width + 10;
            }

            const nodes = createTextButton(
              this,
              x,
              height - 62,
              ability.name,
              () => {
                const game = this.scene.get("game");
                game.events.emit(GameEvent.AbilityClick, ability);
              },
              null
            );

            return group.concat(nodes);
          },
          []
        );

        uiGroup.addMultiple(buttons);

        return uiGroup;
      case "alien":
        const textNode = this.add.text(0, 0, "ALIEN TURN", {
          color: "#fff",
          padding: {
            x: PADDING,
            y: PADDING,
          },
        });
        uiGroup.add(textNode);

        return uiGroup;
    }
  }

  create() {
    const game = this.scene.get("game");

    if (!(game instanceof GameScene)) {
      return;
    }

    game.events.on(GameEvent.FocusActor, () => {
      if (this.currentGroup) {
        this.currentGroup.setVisible(false);
      }
      this.currentGroup = this.getCachedUI(game.currentActor);
    });

    game.events.on(GameEvent.EndStateTransition, ({ state }) => {
      // we can do this better by pubsub to the state machine
      switch (state.key) {
        case "SELECT_ABILITY":
          this.currentGroup.setVisible(false);
          break;
        case "FOCUS_CREW":
          this.currentGroup.setVisible(true);
          break;
      }
    });
  }

  update() {
    const game = this.scene.get("game");

    if (!(game instanceof GameScene)) {
      return;
    }
  }
}

export default UI;
