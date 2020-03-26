import "phaser";

class Actor extends Phaser.GameObjects.Group {
  protected map: Phaser.Tilemaps.Tilemap;
  protected health: number;
  sprite: Phaser.GameObjects.Sprite;

  constructor(scene, map, tileX, tileY, frame) {
    super(scene);
    this.map = map;

    const tile = this.map.getTileAt(tileX, tileY);

    this.type = "actor";
    this.sprite = this.scene.add.sprite(
      tile.getCenterX(),
      tile.getCenterY(),
      "sprites",
      frame
    );
    scene.physics.add.existing(this.sprite, false);
    this.add(this.sprite);
    this.health = 100;
  }

  hit(damage: number) {
    this.health -= damage;
    if (this.health <= 0) {
      console.log("actor dead", this);
      this.destroy(true);
    }
  }

  moveOnPath(path, tilemap) {
    const tweens = [];
    for (let i = 0; i < path.length - 1; i++) {
      const { x, y } = path[i + 1];
      const targetTile = tilemap.getTileAt(x, y);

      tweens.push({
        targets: this.sprite,
        x: { value: targetTile.getCenterX(), duration: 200 },
        y: { value: targetTile.getCenterY(), duration: 200 },
      });
    }

    this.scene.tweens.timeline({ tweens });
  }

  shoot<Target extends Actor>(target: Target) {
    const laser = this.scene.add.sprite(this.x, this.y, "sprites", 134);
    this.scene.physics.add.existing(laser, false);

    const from = this.sprite.getCenter();
    const to = target.sprite.getCenter();

    const direction = to.subtract(from).normalize();
    direction.scale(20);

    if (laser.body instanceof Phaser.Physics.Arcade.Body) {
      laser.body.setVelocity(direction.x, direction.y);
    }

    this.scene.physics.add.overlap(laser, target.sprite, () => {
      laser.destroy();
      target.hit(50);
    });
    return laser;
  }

  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }
  get position(): Phaser.Math.Vector2 {
    return this.sprite.getCenter();
  }
  get tile(): Phaser.Tilemaps.Tile {
    return this.map.getTileAtWorldXY(this.x, this.y);
  }
}

export default Actor;
