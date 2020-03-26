import "phaser";

import Actor from "./actor";

class Crew extends Actor {
  constructor(scene, map, tileX, tileY, frame, name) {
    super(scene, map, tileX, tileY, frame, name, "crew");
  }
}

export default Crew;
