export default {
  abilities: {
    move: {
      name: "Move",
      targetable: true,
      helpText: "Click a tile to move to.",
      message: (actor) => `${actor.displayName} moved.`,
      use: (scene, target) => {
        scene.finder.stopAvoidingAllAdditionalPoints();

        // Mark tiles as impassable
        scene.aliens.concat(scene.crew).forEach(({ tile: t }) => {
          scene.finder.avoidAdditionalPoint(t.x, t.y);
        });

        return new Promise((resolve, reject) => {
          scene.finder.findPath(
            scene.currentActor.tile.x,
            scene.currentActor.tile.y,
            target.x,
            target.y,
            (path) => {
              if (path === null || path.length === 0) {
                resolve(false);
              } else {
                resolve(scene.currentActor.moveOnPath(path));
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
      helpText: "Choose something to shoot.",
      message: (actor, target) =>
        `${actor.displayName} shot at (${target.x}, ${target.y}).`,
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
      message: (actor) => `${actor.displayName} passed.`,
      targetable: false,
      use: (scene) => {
        return true;
      },
    },
    inspire: {
      name: "Inspire",
      message: (actor) =>
        `${actor.displayName} used Inspire. That feels great.`,
      targetable: false,
      use: (scene) => {
        return true;
      },
    },
    find_weakness: {
      name: "Find Weakness",
      helpText: "Choose something to analyze",
      message: (actor) => `${actor.displayName} used Find Weakness.`,
      targetable: true,
      use: (scene, target) => {
        return true;
      },
    },
    melee: {
      name: "Attack",
      message: (actor, target) =>
        `${actor.displayName} smacked ${target.displayName}`,
      targetable: true,
      use: (scene, target) => {
        target.hit(scene.currentActor.stats.damage);
      },
    },
    grow: {
      name: "Grow",
      message: (actor) => {
        switch (actor.name) {
          case "adult":
            return `${actor.displayName} laid an egg!`;
          case "egg":
            return `${actor.displayName} hatched!`;
          case "blob":
            return `${actor.displayName} is growing!`;
          case "young":
            return `${actor.displayName} has matured!`;
        }
      },
      use: (scene, target) => {
        const { x, y } = target.tile;

        if (target.name === "adult") {
          if (scene.aliens.length >= 10) {
            return false;
          }
          let growthSpot;
          const combined = scene.crew.concat(scene.aliens);
          const tilesToCheck = [
            [x + 1, y],
            [x - 1, y],
            [x, y + 1],
            [x, y - 1],
          ];
          for (const spot of tilesToCheck) {
            const tile = scene.map.getTileAt(spot[0], spot[1]);
            const properties = scene.map.tilesets[0].tileProperties;
            const collide = properties[tile.index - 1].collide;
            const occupant = combined.find(
              (a) => a.tile.x === tile.x && a.tile.y === tile.y
            );

            if (!collide && !occupant) {
              growthSpot = tile;
              break;
            }
          }

          if (!growthSpot) {
            return false;
          }
          target.grow(growthSpot);
        } else {
          target.grow();
        }

        return true;
      },
    },
  },
  crew: {
    captain: {
      display: "Captain",
      abilities: ["move", "shoot", "pass", "inspire"],
      stats: {
        damage: 40,
        health: 150,
        movement: 2,
      },
    },
    yeoman: {
      display: "Yeoman",
      abilities: ["move", "shoot", "pass", "find_weakness"],
      stats: {
        damage: 25,
        health: 100,
        movement: 3,
      },
    },
  },
  alien: {
    egg: {
      display: "Egg",
      abilities: ["pass", "grow"],
      behavior: "slug",
      stats: {
        damage: 0,
        health: 10,
        movement: 0,
      },
    },
    blob: {
      display: "Blob",
      abilities: ["move", "pass", "grow", "melee"],
      behavior: "move_and_attack",
      stats: {
        damage: 5,
        health: 25,
        movement: 1,
      },
    },
    young: {
      display: "Young",
      abilities: ["move", "pass", "grow", "melee"],
      behavior: "move_and_attack",
      stats: {
        damage: 10,
        health: 50,
        movement: 2,
      },
    },
    adult: {
      display: "Adult",
      abilities: ["move", "pass", "grow", "melee"],
      behavior: "move_and_attack",
      stats: {
        damage: 20,
        health: 100,
        movement: 3,
      },
    },
  },
  behaviors: {
    slug: async (scene, actor) => {
      return [actor.abilities.pass, null];
    },
    move_and_attack: async (scene, actor) => {
      const crew = await actor.computeDistance(scene.crew);
      const closestCrew = crew.reduce((closest, o) => {
        if (
          closest === null ||
          closest.path === null ||
          o.path.length < closest.path.length
        ) {
          closest = o;
        }
        return closest;
      }, null);

      if (closestCrew.path.length > 2) {
        // the last item in the path will have a crew member on it, so use the
        // second to last
        return [
          actor.abilities.move,
          closestCrew.path[closestCrew.path.length - 2],
        ];
      } else if (closestCrew.path.length === 2) {
        // attack?
        return [actor.abilities.melee, closestCrew.actor];
      }
      return [actor.abilities.pass, null];
    },
  },
};
