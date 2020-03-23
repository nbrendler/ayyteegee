import "phaser";

class Demo extends Phaser.Scene {
  rt: Phaser.GameObjects.RenderTexture;
  layer: Phaser.Tilemaps.StaticTilemapLayer;
  controls: Phaser.Cameras.Controls.SmoothedKeyControl;
  map: Phaser.Tilemaps.Tilemap;
  private mousePressed: boolean;
  constructor() {
    super("demo");
    this.rt = null;
    this.layer = null;
  }

  preload() {
    this.load.image("tiles", "assets/spritesheet.png");
    this.load.tilemapTiledJSON("map", "assets/ship.json");
  }

  create() {
    this.map = this.make.tilemap({ key: "map" });
    const tiles = this.map.addTilesetImage("Ship", "tiles");
    this.layer = this.map.createStaticLayer("Base", tiles, 0, 0);
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
    this.rt.clear();
    this.rt.draw(this.layer);
    this.controls.update(delta);

    const { worldX, worldY, leftButtonReleased } = this.input.activePointer;
    if (leftButtonReleased) {
      console.log(this.map.getTileAtWorldXY(worldX, worldY));
    }
  }
}

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  antialias: false,
  scene: Demo,
};

const game = new Phaser.Game(config);
