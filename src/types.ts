import "phaser";

export enum GameEvent {
  FocusActor = "FOCUS_ACTOR",
  AbilityClick = "ABILITY_CLICK",
  Cancel = "CANCEL",
  BeginStateTransition = "BEGIN_STATE_TRANSITION",
  EndStateTransition = "END_STATE_TRANSITION",
}

export type Target = Phaser.Tilemaps.Tile;
export type Ability = {
  name: string;
  use: (Target) => boolean;
  targetable: boolean;
};
export type Behavior = () => [Ability, Target | null];

type CrewFocus = { key: "FOCUS_CREW"; index: number };
type SelectAbility = { key: "SELECT_ABILITY"; ability: Ability };
type UseAbility = { key: "USE_ABILITY"; target: Target };
type AlienFocus = { key: "FOCUS_ALIEN" };
type AlienGrowth = { key: "ALIEN_GROWTH" };

export type GameState =
  | CrewFocus
  | SelectAbility
  | UseAbility
  | AlienFocus
  | AlienGrowth;
