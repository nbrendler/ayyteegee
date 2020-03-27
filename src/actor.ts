import "phaser";

import { GameEvent, Ability } from "./types";
import CONFIG from "./config";
import { GameScene } from "./game";
import Healthbar from "./healthbar";

let actorId = 0;

class Actor extends Phaser.GameObjects.Group {
  protected map: Phaser.Tilemaps.Tilemap;
  protected health: number;
  id: number;
  sprite: Phaser.GameObjects.Sprite;
  healthbar: Phaser.GameObjects.Graphics;
  name: string;
  displayName: string;
  actorType: string;
  abilities: { [key: string]: Ability };
  stats: { [key: string]: number };

  constructor(scene, map, tileX, tileY, frame, name, actorType) {
    super(scene);
    this.map = map;
    this.name = name;
    this.id = actorId;
    actorId += 1;
    this.actorType = actorType;
    this.abilities = {};

    CONFIG[actorType][name].abilities.forEach((abilityKey) => {
      this.abilities[abilityKey] = CONFIG.abilities[abilityKey];
    });
    this.stats = CONFIG[actorType][name].stats;
    this.stats.maxHealth = this.stats.health;
    this.displayName = CONFIG[actorType][name].display;

    const tile = this.map.getTileAt(tileX, tileY);

    this.sprite = this.scene.add.sprite(
      tile.getCenterX(),
      tile.getCenterY(),
      "sprites",
      frame
    );
    scene.physics.add.existing(this.sprite, false);
    this.add(this.sprite);

    // this.add(new Healthbar(this.scene, this));
  }

  hit(damage: number) {
    this.stats.health -= damage;
    if (this.stats.health <= 0) {
      this.scene.events.emit(GameEvent.ActorDeath, this);
      this.destroy(true);
    }
  }

  moveOnPath(path) {
    const tweens = [];
    for (let i = 0; i < Math.min(path.length - 1, this.stats.movement); i++) {
      const { x, y } = path[i + 1];
      const targetTile = this.map.getTileAt(x, y);

      tweens.push({
        targets: this.sprite,
        x: { value: targetTile.getCenterX(), duration: 200 },
        y: { value: targetTile.getCenterY(), duration: 200 },
      });
    }

    return new Promise((resolve, reject) => {
      this.scene.tweens.timeline({
        tweens,
        onComplete: () => {
          resolve(true);
        },
      });
    });
  }

  computeDistance(actors: Actor[]) {
    return Promise.all(
      actors.map((a) => {
        return new Promise((resolve, reject) => {
          if (!(this.scene instanceof GameScene)) {
            return;
          }
          this.scene.finder.stopAvoidingAllAdditionalPoints();
          this.scene.finder.findPath(
            this.tile.x,
            this.tile.y,
            a.tile.x,
            a.tile.y,
            (path) => {
              resolve({ actor: a, path });
            }
          );
          this.scene.finder.calculate();
        });
      })
    );
  }

  shoot<Target extends Actor>(target: Target) {
    const laser = this.scene.add.sprite(this.x, this.y, "sprites", 8);
    this.scene.physics.add.existing(laser, false);

    const angle = Phaser.Math.Angle.BetweenPoints(this, target);

    const from = this.sprite.getCenter();
    const to = target.sprite.getCenter();

    const direction = to.subtract(from).normalize();
    direction.scale(40);

    if (laser.body instanceof Phaser.Physics.Arcade.Body) {
      laser.angle = angle;
      laser.body.angle = angle;
      laser.body.setVelocity(direction.x, direction.y);
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        // guard again weird things happening
        laser.destroy();
        resolve(false);
      }, 3000);
      this.scene.physics.add.overlap(laser, target.sprite, () => {
        laser.destroy();
        target.hit(this.stats.damage);
        resolve(true);
      });
    });
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
