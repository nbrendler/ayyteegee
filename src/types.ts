import "phaser";

export enum GameEvent {
  FocusActor = "FOCUS_ACTOR",
  AbilityClick = "ABILITY_CLICK",
  Cancel = "CANCEL",
  BeginStateTransition = "BEGIN_STATE_TRANSITION",
  EndStateTransition = "END_STATE_TRANSITION",
  Log = "LOG",
  Win = "WIN",
  Lose = "LOSE",
  ActorDeath = "ACTOR_DEATH",
  ActorSpawn = "ACTOR_SPAWN",
}

export type Target = Phaser.Tilemaps.Tile;
export type Ability = {
  name: string;
  message?: (actor: object, Target?) => string;
  use: (scene: object, Target) => boolean;
  targetable: boolean;
};
export type Behavior = (
  scene: object,
  actor: object
) => [Ability, Target | null];

type CrewFocus = { key: "FOCUS_CREW"; index: number };
type SelectAbility = { key: "SELECT_ABILITY"; ability: Ability };
type UseAbility = { key: "USE_ABILITY"; target: Target };
type AlienFocus = { key: "FOCUS_ALIEN" };
type GameOver = { key: "GAME_OVER" };
type AlienGrowth = { key: "ALIEN_GROWTH" };

export type GameState =
  | GameOver
  | CrewFocus
  | SelectAbility
  | UseAbility
  | AlienFocus
  | AlienGrowth;
