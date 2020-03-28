// # healthbar.ts
// I couldn't get this working in time so it's unused. It shows a bar above
// each actor's head representing their health, but for some reason the update
// method wasn't being called by the parent group so I punted on it.

import "phaser";

import Actor from "./actor";

class Healthbar extends Phaser.GameObjects.GameObject {
  protected healthbar: Phaser.GameObjects.Graphics;
  protected actor: Actor;

  constructor(scene, actor) {
    super(scene, null);
    this.actor = actor;
    this.healthbar = this.scene.add.graphics();
    this.healthbar.fillStyle(0x00ff00, 1);
    this.healthbar.fillRect(
      actor.x - actor.sprite.width / 2,
      actor.y - actor.sprite.height / 2 - 2,
      actor.sprite.width,
      1
    );
  }

  update() {
    const healthPct = this.actor.stats.health / this.actor.stats.maxHealth;
    const width = healthPct * this.actor.sprite.width;
    this.healthbar.clear();
    this.healthbar.fillStyle(0x00ff00, 1);
    this.healthbar.fillRect(
      this.actor.x - this.actor.sprite.width / 2,
      this.actor.y - this.actor.sprite.height / 2 - 1,
      healthPct * this.actor.sprite.width,
      1
    );

    this.healthbar.fillStyle(0xff0000, 1);
    this.healthbar.fillRect(
      this.actor.x - this.actor.sprite.width / 2 + width,
      this.actor.y - this.actor.sprite.height / 2 - 1,
      (1 - healthPct) * this.actor.sprite.width,
      1
    );
  }
}

export default Healthbar;
