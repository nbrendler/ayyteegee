// # game.ts
import "phaser";
import { js as EasyStar } from "easystarjs";

import Crew from "./crew";
import Alien from "./alien";
import Actor from "./actor";
import UI from "./ui";
import { GameState, GameEvent } from "./types";
import CONFIG from "./config";

const shouldUpdate = (timeA, timeB, timeout) => timeB - timeA >= timeout;

// First of two scenes used by the game (the other is for UI);
// This has all of the game logic and state;
export class GameScene extends Phaser.Scene {
  // State object that is used primarily by the pseudo state machine
  // implemented below. I was trying to create a nice experience by using a
  // discriminated union type but in retrospect I think an enum might have been
  // better -- I don't really store much state apart from the keys.
  gameState: GameState;

  // Pathfinding library object. Seems good enough for this game but I might
  // like to find something in the future that do more with tile maps.
  finder: EasyStar;

  // The main layer of the Tilemap. I didn't really understand how to benefit
  // from multiple layers going in, so I just stuck with one for this game.
  layer: Phaser.Tilemaps.DynamicTilemapLayer;

  // Array of Crew actors
  crew: Crew[];

  // Array of Alien actors
  aliens: Alien[];

  // Reference to the focused actor.
  currentActor: Actor;

  // bookkeeping timestamp used to debounce some of the UI updates
  lastChecked: number;

  // Controls for moving the camera
  controls: Phaser.Cameras.Controls.SmoothedKeyControl;

  map: Phaser.Tilemaps.Tilemap;

  // The tile at which the mouse is currently pointing
  selectedTile: Phaser.Tilemaps.Tile;

  // Simple cache for keeping track of past states in case we need to go back
  // (like cancelling an ability). A stack is probably better than this.
  stateCache: { [key: string]: GameState };

  // map of defined state transitions used by the state machine.
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

    // For the pathfinding library to work, we have to construct a 2d grid of
    // tiles from the map.
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

    // These tiles are acceptable in the sense that they may be considered when
    // calculating paths, (e.g. not walls or obstacles);
    //
    // Adapted from the solution presented [here](https://www.dynetisgames.com/2018/03/06/pathfinding-easystar-phaser-3/)
    const acceptableTiles = [];
    for (let i = tileset.firstgid - 1; i < tiles.total; i++) {
      if (!properties[i]) {
        continue;
      }
      if (!properties[i].collide) acceptableTiles.push(i + 1);
    }
    this.finder.setAcceptableTiles(acceptableTiles);
  }

  create() {
    this.createTilemap();

    // create the crew and aliens
    // In the future this could be pushed to a level-based config
    this.crew.push(new Crew(this, this.map, 50, 50, 148, "captain"));
    this.crew.push(new Crew(this, this.map, 52, 50, 146, "yeoman"));
    this.focusActor(this.crew[0]);

    this.aliens.push(new Alien(this, this.map, 40, 42, 195, "adult"));
    this.aliens.push(new Alien(this, this.map, 40, 52, 195, "adult"));

    // Set up the camera. Bounds should be at the edges of the tile map and it
    // starts centered.
    // It might be better to just center on the focused actor?
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

    // control the camera using the arrow keys
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

    // Set up pointer events
    this.input.mouse.enabled = true;
    this.input.on("pointerdown", this.onClick.bind(this));

    // ## Event Binding
    // This is where stuff starts to get ugly, imo. I started out using events
    // since it seemed a natural way to decouple some of the moving pieces
    // here. About halfway through, the events were getting messy and I decided
    // to write more of a state machine to control the core logic of switching
    // turns and handling abilities -- which worked great! But then there's still these events here.
    //
    // I decided to compromise by using events to communicate primarily with
    // the other scene (UI). Since that scene can also trigger state
    // transitions (by clicking buttons), the two are still intermingled a bit.
    // This will probably be the first refactor I tackle when coming back to
    // this.
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

    // ## State Transitions
    // Each transition consists of the before and after state, and the function
    // should return the GameState object.  I think this is probably missing
    // some type annotations somewhere because TypeScript will happily compile
    // it even if you return the wrong thing -- maybe I also need to add an
    // invariant?
    //
    // The API of this is quite odd and I should probably just use one of the
    // off-the-shelf state machine libraries.
    //
    // The state should normally flow like this:
    // `FOCUS CREW -> SELECT ABILITY -> USE_ABILITY -> repeat for next crew -> FOCUS_ALIEN -> ALIEN_GROWTH -> REPEAT`
    // SELECT_ABILITY can also be cancelled, going back to FOCUS_CREW. If all
    // the crew have acted, it goes to the alien turn.
    //
    // In general, a state machine seems really nice for a turn-based game like
    // this, I would do the same in future games.
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

  // Run the alien turn. For each alien, call its `behavior` function to decide
  // which `ability` it should use.
  // I used async methods here so that I could just wait for things like the
  // moving animation to finish, if they chose to move. If we wanted to get
  // fancy, we could even push the pathfinding calculations in the
  // behavior/ability to a web worker to avoid stuttering, but it's not
  // necessary for this game.
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

  // Run the alien growth phase. Each alien will attempt to grow, apart from
  // eggs that spawned during this turn. If there's no spot to lay an egg, then
  // `result` will be false.
  // The logic of how grow works is defined in [config](./config.ts). From a
  // balance perspective, I think I might make growth be more of a bespoke
  // action as determined by the behavior function, so that an alien could
  // *either* move or grow. Right now the exponential growth is too tough to
  // beat.
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

  // Use crew abilities. This works mostly the same as alien actions, and it
  // uses async to allow for movement or bullet animations to finish.
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

  // When the mouse is clicked, get the tile they clicked on and do something.
  // I wanted to make this more contextual, like clicking on a crew member to
  // show more information about them, or on an alien, etc., but ran out of
  // time. So right now it just captures the ability targets.
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

  // Highlight the tile where the mouse is. I wanted this to be more
  // contextual, like drawing the path of movement based on where the mouse is,
  // but didn't get to it!
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
  parent: document.getElementById("game"),
  scene: [GameScene, UI],
  physics: {
    default: "arcade",
  },
};

new Phaser.Game(config);
