import "phaser";
import { js as EasyStar } from "easystarjs";

import Actor from "./actor";
import UI from "./ui";
import { GameEvent } from "./types";

type PlayerTurn = { tag: "player"; crewIndex: number };
type AlienTurn = { tag: "alien"; alienIndex: number };
type GameState = PlayerTurn | AlienTurn;

type Info = { tag: "info" };
type SelectTile = { tag: "select"; abilityIndex: number };
type CursorState = Info | SelectTile;

const shouldUpdate = (timeA, timeB, timeout) => timeB - timeA >= timeout;

export class GameScene extends Phaser.Scene {
  gameState: GameState;
  cursorState: CursorState;
  finder: EasyStar;
  layer: Phaser.Tilemaps.DynamicTilemapLayer;
  player: Actor;
  aliens: Actor[];
  currentActor: Actor;
  lastChecked: number;
  controls: Phaser.Cameras.Controls.SmoothedKeyControl;
  map: Phaser.Tilemaps.Tilemap;
  selectedTile: [number, number] | null;
  tileTween: Phaser.Tweens.Tween;

  constructor() {
    super("game");
    this.layer = null;
    this.selectedTile = null;
    this.finder = new EasyStar();
    this.aliens = [];
    this.gameState = { tag: "player", crewIndex: 0 };
    this.cursorState = { tag: "info" };
    this.lastChecked = 0;
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

    this.player = new Actor(this, this.map, 50, 50, 148);
    this.currentActor = this.player;

    this.aliens.push(new Actor(this, this.map, 52, 52, 195));
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
  }

  update(time, delta) {
    this.updateSelectedTile();

    this.controls.update(delta);
  }

  focusActor(actor) {
    this.currentActor = actor;
    this.events.emit(GameEvent.FocusActor);
  }

  onClick() {
    const { x, y } = this.input.activePointer;
    const { x: worldX, y: worldY } = this.cameras.main.getWorldPoint(x, y);

    const tile = this.map.getTileAtWorldXY(worldX, worldY);
    const { x: toX, y: toY } = tile;

    switch (this.cursorState.tag) {
      case "select":
        // Check if there's an alien on the tile
        const foundAlien = this.aliens.find((a) => {
          return a.tile.x === toX && a.tile.y === toY;
        });

        if (foundAlien) {
          this.player.shoot(foundAlien);
        }

        this.finder.stopAvoidingAllAdditionalPoints();

        // Mark tiles with aliens as impassable
        this.aliens.forEach(({ tile: t }) => {
          this.finder.avoidAdditionalPoint(t.x, t.y);
        });

        this.finder.findPath(
          this.player.tile.x,
          this.player.tile.y,
          toX,
          toY,
          (path) => {
            if (path === null) {
              console.warn("no path");
            } else {
              this.player.moveOnPath(path, this.map);
            }
          }
        );
        this.finder.calculate();
      case "info":
      // nothing on click
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

      if (this.selectedTile === null) {
        this.selectedTile = [tile.x, tile.y];
        return;
      }

      const [oldX, oldY] = this.selectedTile;

      if (tile.x !== oldX || tile.y !== oldY) {
        const oldTile = this.map.getTileAt(oldX, oldY);
        oldTile.setAlpha(1);
        tile.setAlpha(0.5);
        this.selectedTile = [tile.x, tile.y];
      }
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
    arcade: {
      debug: true,
    },
  },
};

const game = new Phaser.Game(config);
