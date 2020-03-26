import "phaser";

import { Behavior } from "./types";
import Actor from "./actor";
import CONFIG from "./config";

class Alien extends Actor {
  behaviors: { [key: string]: Behavior };
  constructor(scene, map, tileX, tileY, frame, name) {
    super(scene, map, tileX, tileY, frame, name, "alien");

    this.behaviors = Object.assign(
      {},
      CONFIG[this.actorType].abilities,
      CONFIG[name].abilities
    );
  }
}

export default Alien;
