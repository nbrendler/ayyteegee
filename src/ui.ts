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
  lastMessage: Phaser.GameObjects.Text;
  gameOverMessage: Phaser.GameObjects.Text;
  contextMessage: Phaser.GameObjects.Text;

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
    const uiGroup = this.add.group();
    const height = Number(this.game.config.height);

    const buttons = Object.keys(actor.abilities).reduce((group, key, idx) => {
      const ability = actor.abilities[key];
      let x = 32;
      if (idx > 0) {
        const previousTextNode = group[group.length - 2];
        console.assert(previousTextNode instanceof Phaser.GameObjects.Text);
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
          this.setContext(ability.helpText);
        },
        null
      );

      return group.concat(nodes);
    }, []);

    uiGroup.addMultiple(buttons);

    return uiGroup;
  }

  create() {
    const game = this.scene.get("game");

    const width = Number(this.game.config.width);
    const height = Number(this.game.config.height);

    if (!(game instanceof GameScene)) {
      return;
    }

    this.contextMessage = this.add.text(0, 0, "", {
      color: "#fff",
      padding: {
        x: PADDING,
        y: PADDING,
      },
    });
    this.lastMessage = this.add.text(0, 0, "", {
      color: "#fff",
    });

    this.gameOverMessage = this.add
      .text(width / 2, height / 2, "", {
        color: "#fff",
        fontSize: 40,
        fontStyle: "bold",
      })
      .setVisible(false);

    game.events.on(GameEvent.FocusActor, () => {
      if (this.currentGroup) {
        this.currentGroup.setVisible(false);
      }
      this.currentGroup = this.getCachedUI(game.currentActor);
      this.currentGroup.setVisible(true);
      this.setContext(`${game.currentActor.displayName}'s turn`);
    });

    game.events.on(GameEvent.Cancel, () => {
      this.setContext(`${game.currentActor.displayName}'s turn`);
    });

    game.events.on(GameEvent.Win, () => {
      this.gameOverMessage.text = "ALL ALIENS DESTROYED";
      this.gameOverMessage.x = width / 2 - this.gameOverMessage.width / 2;
      this.gameOverMessage.y = height / 2 - this.gameOverMessage.height / 2;
      this.gameOverMessage.setVisible(true);
    });

    game.events.on(GameEvent.Lose, () => {
      this.gameOverMessage.text = "ALL CREW HAVE DIED";
      this.gameOverMessage.x = width / 2 - this.gameOverMessage.width / 2;
      this.gameOverMessage.y = height / 2 - this.gameOverMessage.height / 2;
      this.gameOverMessage.setVisible(true);
    });

    game.events.on(GameEvent.Lose, () => {
      if (this.currentGroup) {
        this.currentGroup.setVisible(false);
      }
      this.currentGroup = this.getCachedUI(game.currentActor);
      this.currentGroup.setVisible(true);
    });

    game.events.on(GameEvent.Log, (message) => {
      this.lastMessage.text = message;
      this.lastMessage.x = width - 32 - this.lastMessage.width;
      this.lastMessage.y = height - 32;
      console.log(message);
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

  setContext(message) {
    if (message) {
      const width = Number(this.game.config.width);
      this.contextMessage.text = message;
      this.contextMessage.x = width / 2 - this.contextMessage.width / 2;
      this.contextMessage.setVisible(true);
    } else {
      this.contextMessage.setVisible(false);
    }
  }

  update() {
    const game = this.scene.get("game");

    if (!(game instanceof GameScene)) {
      return;
    }
  }
}

export default UI;
