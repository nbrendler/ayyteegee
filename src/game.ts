import "phaser";
import { js as EasyStar } from "easystarjs";

import Projectile from "./projectile";

const TILE_WIDTH = 8;

class Demo extends Phaser.Scene {
  finder: EasyStar;
  rt: Phaser.GameObjects.RenderTexture;
  layer: Phaser.Tilemaps.DynamicTilemapLayer;
  dude: Phaser.GameObjects.Sprite;
  aliens: Phaser.GameObjects.Sprite[];
  controls: Phaser.Cameras.Controls.SmoothedKeyControl;
  map: Phaser.Tilemaps.Tilemap;
  selectedTile: [number, number] | null;
  tileTween: Phaser.Tweens.Tween;

  constructor() {
    super("demo");
    this.rt = null;
    this.layer = null;
    this.selectedTile = null;
    this.finder = new EasyStar();
    this.aliens = [];
  }

  preload() {
    this.load.image("tiles", "assets/spritesheet.png");
    this.load.spritesheet("sprites", "assets/spritesheet.png", {
      frameWidth: TILE_WIDTH,
      frameHeight: TILE_WIDTH,
    });
    this.load.tilemapTiledJSON("map", "assets/ship.json");
  }

  createTilemap() {
    this.map = this.make.tilemap({ key: "map" });
    const tiles = this.map.addTilesetImage("Ship", "tiles");
    this.layer = this.map
      .createDynamicLayer("Base", tiles, 0, 0)
      .setVisible(false);
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

  moveDude(path) {
    const tweens = [];
    for (let i = 0; i < path.length - 1; i++) {
      const { x, y } = path[i + 1];
      const { x: worldX, y: worldY } = this.map.tileToWorldXY(x, y);
      tweens.push({
        targets: this.dude,
        x: { value: worldX, duration: 200 },
        y: { value: worldY, duration: 200 },
      });
    }

    this.tweens.timeline({ tweens });
  }

  createAlien() {
    const pos = this.map.tileToWorldXY(52, 52);
    const sprite = this.add.sprite(
      pos.x + TILE_WIDTH / 2,
      pos.y + TILE_WIDTH / 2,
      "sprites",
      195
    );

    this.physics.add.existing(sprite, true);

    return sprite;
  }

  create() {
    this.dude = this.add.sprite(
      50 * TILE_WIDTH + TILE_WIDTH / 2,
      50 * TILE_WIDTH + TILE_WIDTH / 2,
      "sprites",
      148
    );

    this.createTilemap();
    this.aliens.push(this.createAlien());
    this.rt = this.add.renderTexture(0, 0, 800, 600);
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
    this.game.canvas.onmouseup = this.onClick.bind(this);

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

    this.rt.clear();
    this.rt.draw(this.layer);
    this.rt.draw(this.dude);
    this.aliens.forEach((alien) => {
      this.rt.draw(alien);
    });
    this.controls.update(delta);
  }

  shootAt(fromX, fromY, toX, toY) {
    const laser = this.add.sprite(fromX, fromY, "sprites", 134);
    this.physics.add.existing(laser, false);

    const from = new Phaser.Math.Vector2(fromX, fromY);
    const to = new Phaser.Math.Vector2(toX, toY);

    const direction = to.subtract(from).normalize();
    direction.scale(10);

    if (laser.body instanceof Phaser.Physics.Arcade.Body) {
      laser.body.setVelocity(direction.x, direction.y);
    }

    this.aliens.forEach((a) => {
      this.physics.add.collider(laser, a, () => {
        laser.destroy();
      });
    });
  }

  onClick() {
    const { x, y } = this.input.activePointer;
    const { x: worldX, y: worldY } = this.cameras.main.getWorldPoint(x, y);

    const { x: toX, y: toY } = this.map.getTileAtWorldXY(worldX, worldY);
    const fromX = this.map.worldToTileX(this.dude.x);
    const fromY = this.map.worldToTileY(this.dude.y);

    const alienPositions = this.aliens.map((a) => {
      return this.map.worldToTileXY(a.x, a.y);
    });

    const match = alienPositions.filter((p) => p.x === toX && p.y === toY);

    if (match.length === 1) {
      return this.shootAt(this.dude.x, this.dude.y, worldX, worldY);
    }

    this.finder.stopAvoidingAllAdditionalPoints();

    alienPositions.forEach(({ x: ax, y: ay }) => {
      this.finder.avoidAdditionalPoint(ax, ay);
    });

    this.finder.findPath(fromX, fromY, toX, toY, (path) => {
      if (path === null) {
        console.warn("no path");
      } else {
        this.moveDude(path);
      }
    });
    this.finder.calculate();
  }

  updateSelectedTile() {
    const { x, y } = this.input.activePointer;
    const { x: worldX, y: worldY } = this.cameras.main.getWorldPoint(x, y);

    const tile = this.map.getTileAtWorldXY(worldX, worldY);

    if (this.selectedTile === null) {
      this.selectedTile = [tile.x, tile.y];
      return;
    }

    const [oldX, oldY] = this.selectedTile;

    if (tile.x !== oldX || tile.y !== oldY) {
      const oldTile = this.map.getTileAt(oldX, oldY);
      if (this.tileTween) {
        this.tileTween.stop();
        oldTile.setAlpha(1);
      }
      this.tileTween = this.add.tween({
        targets: [tile],
        ease: "Sine.easeInOut",
        duration: 300,
        delay: 0,
        alpha: {
          getStart: () => 1.0,
          getEnd: () => 0.5,
        },
        yoyo: true,
        loop: -1,
      });

      this.selectedTile = [tile.x, tile.y];
    }
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  antialias: false,
  scene: Demo,
  physics: {
    default: "arcade",
    arcade: {},
  },
};

const game = new Phaser.Game(config);
