import "phaser";
import { js as EasyStar } from "easystarjs";

import Crew from "./crew";
import Alien from "./alien";
import Actor from "./actor";
import UI from "./ui";
import { GameState, GameEvent } from "./types";
import CONFIG from "./config";

const shouldUpdate = (timeA, timeB, timeout) => timeB - timeA >= timeout;

export class GameScene extends Phaser.Scene {
  gameState: GameState;
  finder: EasyStar;
  layer: Phaser.Tilemaps.DynamicTilemapLayer;
  crew: Crew[];
  aliens: Alien[];
  currentActor: Actor;
  lastChecked: number;
  controls: Phaser.Cameras.Controls.SmoothedKeyControl;
  map: Phaser.Tilemaps.Tilemap;
  selectedTile: Phaser.Tilemaps.Tile;
  stateCache: { [key: string]: GameState };
  tileTween: Phaser.Tweens.Tween;
  transitions: { [key: string]: (object) => GameState };

  constructor() {
    super("game");
    this.layer = null;
    this.finder = new EasyStar();
    this.aliens = [];
    this.crew = [];
    this.gameState = { key: "FOCUS_CREW", index: 0 };
    this.lastChecked = 0;
    this.transitions = {};
    this.stateCache = {};
  }

  preload() {
    this.load.image("tiles", "assets/spritesheet.png");
    this.load.spritesheet("sprites", "assets/spritesheet.png", {
      frameWidth: 8,
      frameHeight: 8,
    });
    this.load.tilemapTiledJSON("map", "assets/ship.json");
  }

  createTilemap() {
    this.map = this.make.tilemap({ key: "map" });
    const tiles = this.map.addTilesetImage("Ship", "tiles");
    this.layer = this.map.createDynamicLayer("Base", tiles, 0, 0);
    this.map.setLayer("Base");

    const grid = [];
    for (let y = 0; y < this.map.height; y++) {
      const col = [];
      for (let x = 0; x < this.map.width; x++) {
        col.push(this.map.getTileAt(x, y).index);
      }
      grid.push(col);
    }

    this.finder.setGrid(grid);
    const tileset = this.map.tilesets[0];
    const properties = tileset.tileProperties;

    const acceptableTiles = [];
    for (let i = tileset.firstgid - 1; i < tiles.total; i++) {
      // firstgid and total are fields from Tiled that indicate the range of IDs that the tiles can take in that tileset
      if (!properties.hasOwnProperty(i)) {
        continue;
      }
      if (!properties[i].collide) acceptableTiles.push(i + 1);
      if (properties[i].cost)
        this.finder.setTileCost(i + 1, properties[i].cost); // If there is a cost attached to the tile, let's register it
    }
    this.finder.setAcceptableTiles(acceptableTiles);
  }

  create() {
    this.createTilemap();

    this.crew.push(new Crew(this, this.map, 50, 50, 148, "captain"));
    this.crew.push(new Crew(this, this.map, 52, 50, 146, "yeoman"));
    this.focusActor(this.crew[0]);

    this.aliens.push(new Alien(this, this.map, 40, 42, 195, "adult"));
    this.aliens.push(new Alien(this, this.map, 40, 52, 195, "adult"));
    this.cameras.main.setBounds(
      0,
      0,
      this.map.widthInPixels,
      this.map.heightInPixels
    );
    this.cameras.main.centerOn(
      this.map.widthInPixels / 2,
      this.map.heightInPixels / 2
    );
    this.cameras.main.zoom = 5;

    this.input.mouse.enabled = true;
    this.input.on("pointerdown", this.onClick.bind(this));

    const { up, down, left, right } = this.input.keyboard.createCursorKeys();

    const controlConfig = {
      camera: this.cameras.main,
      left,
      right,
      up,
      down,
      acceleration: 0.04,
      drag: 0.0005,
      maxSpeed: 0.25,
    };

    this.controls = new Phaser.Cameras.Controls.SmoothedKeyControl(
      controlConfig
    );

    this.events.on(GameEvent.AbilityClick, (ability) => {
      this.stateTransition("SELECT_ABILITY", { ability });
    });

    this.events.on(GameEvent.Cancel, () => {
      switch (this.gameState.key) {
        case "SELECT_ABILITY": {
          this.stateTransition("FOCUS_CREW");
        }
      }
    });

    this.events.on(GameEvent.ActorSpawn, (target) => {
      this.aliens.push(
        new Alien(this, this.map, target.x, target.y, 231, "egg")
      );
    });

    this.events.on(GameEvent.ActorDeath, (actor) => {
      if (actor.actorType === "alien") {
        const idx = this.aliens.findIndex((a) => a.id === actor.id);
        this.aliens.splice(idx, 1);
      } else if (actor.actorType === "crew") {
        const idx = this.crew.findIndex((a) => a.id === actor.id);
        this.crew.splice(idx, 1);
      }
    });

    this.events.on(GameEvent.Win, () => {
      this.stateTransition("GAME_OVER");
    });

    this.events.on(GameEvent.Lose, () => {
      this.stateTransition("GAME_OVER");
    });

    this.input.keyboard.on("keydown-ESC", () => {
      this.events.emit(GameEvent.Cancel);
    });

    this.defineTransition("USE_ABILITY", "GAME_OVER", () => {
      return { key: "GAME_OVER" };
    });
    this.defineTransition("FOCUS_CREW", "SELECT_ABILITY", ({ ability }) => {
      if (ability.targetable) {
        return { key: "SELECT_ABILITY", ability };
      }
      this.useAbility(ability, null);
      return { key: "USE_ABILITY" };
    });

    this.defineTransition("SELECT_ABILITY", "USE_ABILITY", ({ target }) => {
      if (this.gameState.key === "SELECT_ABILITY") {
        this.useAbility(this.gameState.ability, target);
      }
      return { key: "USE_ABILITY", target };
    });
    this.defineTransition("SELECT_ABILITY", "FOCUS_CREW", () => {
      return this.stateCache.FOCUS_CREW;
    });
    this.defineTransition("USE_ABILITY", "FOCUS_CREW", (index) => {
      const state = this.stateCache.FOCUS_CREW;
      if (state.key === "FOCUS_CREW") state.index = index;
      this.focusActor(this.crew[index]);
      return state;
    });
    this.defineTransition("USE_ABILITY", "FOCUS_ALIEN", () => {
      this.runAlienTurn(0);
      return { key: "FOCUS_ALIEN" };
    });
    this.defineTransition("FOCUS_ALIEN", "ALIEN_GROWTH", () => {
      this.runAlienGrowth();
      return { key: "ALIEN_GROWTH" };
    });
    this.defineTransition("ALIEN_GROWTH", "FOCUS_CREW", () => {
      this.focusActor(this.crew[0]);
      return { key: "FOCUS_CREW", index: 0 };
    });
  }

  async runAlienGrowth() {
    for (const alien of this.aliens) {
      if (alien.justBorn) {
        alien.justBorn = false;
        continue;
      }
      const result = await alien.abilities.grow.use(this, alien);
      if (result) {
        this.events.emit(
          GameEvent.Log,
          alien.abilities.grow.message(alien, null)
        );
      }
    }
    return this.stateTransition("FOCUS_CREW");
  }

  async runAlienTurn(index) {
    const alien = this.aliens[index];
    this.focusActor(alien);
    const [ability, target] = await alien.behavior(this, alien);
    if (ability.message) {
      this.events.emit(
        GameEvent.Log,
        ability.message(this.currentActor, target)
      );
    }

    const result = await ability.use(this, target);

    if (index === this.aliens.length - 1) {
      // if it's the last alien, time to grow
      return this.stateTransition("ALIEN_GROWTH");
    }

    return this.runAlienTurn(index + 1);
  }

  async useAbility(ability, target) {
    const result = await ability.use(this, target);
    if (ability.message) {
      this.events.emit(
        GameEvent.Log,
        ability.message(this.currentActor, target)
      );
    }
    const state = this.stateCache.FOCUS_CREW;
    if (state.key === "FOCUS_CREW") {
      const index = state.index;
      if (result && index === this.crew.length - 1) {
        // if it's the last crew member, go to the alien turn
        return this.stateTransition("FOCUS_ALIEN");
      } else if (result) {
        // go to the next crew members turn
        return this.stateTransition("FOCUS_CREW", index + 1);
      }

      // the ability failed, so go back to crew focus state
      return this.stateTransition("FOCUS_CREW", index);
    }
  }

  update(time, delta) {
    this.updateSelectedTile();

    this.controls.update(delta);

    if (!(this.gameState.key === "GAME_OVER")) {
      this.checkGameEnd();
    }
  }

  checkGameEnd() {
    if (this.aliens.length === 0) {
      this.events.emit(GameEvent.Win);
    } else if (this.crew.length === 0) {
      this.events.emit(GameEvent.Lose);
    }
  }

  focusActor(actor) {
    this.currentActor = actor;
    this.events.emit(GameEvent.FocusActor);
  }

  onClick() {
    const { x, y } = this.input.activePointer;
    const { x: worldX, y: worldY } = this.cameras.main.getWorldPoint(x, y);

    const tile = this.map.getTileAtWorldXY(worldX, worldY);

    switch (this.gameState.key) {
      case "FOCUS_CREW":
        // focus crew
        break;
      case "SELECT_ABILITY":
        this.stateTransition("USE_ABILITY", { target: tile });
    }
  }

  defineTransition(state, nextState, callback) {
    this.transitions[`${state}-${nextState}`] = callback;
  }

  stateTransition(nextState, data = {}) {
    const transition = this.transitions[`${this.gameState.key}-${nextState}`];
    if (transition) {
      this.stateCache[this.gameState.key] = this.gameState;
      this.events.emit(GameEvent.BeginStateTransition, {
        state: this.gameState,
        nextState,
        data,
      });
      this.gameState = transition(data);
      this.events.emit(GameEvent.EndStateTransition, { state: this.gameState });
    } else {
      console.error("Invalid state transition", this.gameState.key, nextState);
    }
  }

  updateSelectedTile() {
    if (shouldUpdate(this.lastChecked, this.time.now, 50)) {
      const { x, y } = this.input.activePointer;
      const { x: worldX, y: worldY } = this.cameras.main.getWorldPoint(x, y);

      const tile = this.map.getTileAtWorldXY(worldX, worldY);

      this.lastChecked = this.time.now;

      if (!tile) {
        return;
      }

      if (this.selectedTile) {
        const { x: oldX, y: oldY } = this.selectedTile;

        if (tile.x !== oldX || tile.y !== oldY) {
          const oldTile = this.map.getTileAt(oldX, oldY);
          oldTile.setAlpha(1);
        }
        switch (this.gameState.key) {
          case "FOCUS_CREW":
            if (tile.x !== oldX || tile.y !== oldY) {
              tile.setAlpha(0.5);
            }
            break;

          case "SELECT_ABILITY":
            break;
        }
      }

      this.selectedTile = tile;
    }
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  antialias: false,
  scene: [GameScene, UI],
  physics: {
    default: "arcade",
  },
};

new Phaser.Game(config);
