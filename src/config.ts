export default {
  crew: {
    abilities: {
      move: {
        name: "Move",
        targetable: true,
        use: (scene, target) => {
          scene.finder.stopAvoidingAllAdditionalPoints();

          // Mark tiles with aliens as impassable
          scene.aliens.forEach(({ tile: t }) => {
            scene.finder.avoidAdditionalPoint(t.x, t.y);
          });

          return new Promise((resolve, reject) => {
            scene.finder.findPath(
              scene.currentActor.tile.x,
              scene.currentActor.tile.y,
              target.x,
              target.y,
              (path) => {
                if (path === null) {
                  resolve(false);
                } else {
                  resolve(scene.currentActor.moveOnPath(path, scene.map));
                }
              }
            );
            scene.finder.calculate();
          });
        },
      },
      shoot: {
        name: "Shoot",
        targetable: true,
        use: (scene, target) => {
          // Check if there's an alien on the tile
          const foundAlien = scene.aliens.find((a) => {
            return a.tile.x === target.x && a.tile.y === target.y;
          });

          if (foundAlien) {
            return scene.currentActor.shoot(foundAlien);
          }
          return false;
        },
      },
      pass: {
        name: "Pass",
        targetable: false,
        use: (scene) => {
          return true;
        },
      },
    },
  },
  captain: {
    abilities: {
      inspire: {
        name: "Inspire",
        targetable: false,
        use: (scene) => {
          return true;
        },
      },
    },
  },
  yeoman: {
    abilities: {
      find_weakness: {
        name: "Find Weakness",
        targetable: true,
        use: (scene, target) => {
          return true;
        },
      },
    },
  },
  alien: {
    abilities: {
      pass: {
        name: "Pass",
        targetable: false,
        use: (scene) => {
          return true;
        },
      },
    },
    behavior: (scene, actor) => {
      return [actor.abilities.pass, null];
    },
  },
  adultAlien: {
    abilities: [{ name: "Move" }, { name: "Grow" }],
  },
};
