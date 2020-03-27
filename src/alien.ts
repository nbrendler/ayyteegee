import "phaser";

import { Behavior, GameEvent } from "./types";
import Actor from "./actor";
import CONFIG from "./config";

class Alien extends Actor {
  behavior: Behavior;
  justBorn: boolean;

  constructor(scene, map, tileX, tileY, frame, name) {
    super(scene, map, tileX, tileY, frame, name, "alien");

    this.justBorn = name === "egg" ? true : false;
    this.behavior = CONFIG.behaviors[CONFIG.alien[name].behavior];
  }

  grow(target) {
    switch (this.name) {
      case "egg":
        this.name = "blob";
        this.sprite.frame = this.sprite.texture.get(230);
        break;
      case "adult":
        this.scene.events.emit(GameEvent.ActorSpawn, target);
        break;
      case "blob":
        this.name = "young";
        this.sprite.frame = this.sprite.texture.get(197);
        break;
      case "young":
        this.name = "adult";
        this.sprite.frame = this.sprite.texture.get(195);
        break;
    }
    this.behavior = CONFIG.behaviors[CONFIG.alien[this.name].behavior];
    CONFIG.alien[this.name].abilities.forEach((abilityKey) => {
      this.abilities[abilityKey] = CONFIG.abilities[abilityKey];
    });
    this.stats = Object.assign({}, CONFIG.alien[this.name].stats);
    this.stats.maxHealth = this.stats.health;
    this.displayName = CONFIG.alien[this.name].display;
  }
}

export default Alien;
