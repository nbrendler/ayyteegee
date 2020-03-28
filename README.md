# Ayyteegee

This is an (unfinished) turn-based strategy game based loosely on the board game
[The Awful Green Things from Outer
Space](https://en.wikipedia.org/wiki/The_Awful_Green_Things_from_Outer_Space).

Play it [here](https://ayyteegee.nikbrendler.com). Best played in a desktop
browser.

It's nearly impossible to win right now without some tuning. Try to kill all
the aliens!

* Click on a button to select an action for each crew member (blue eyes).
* Aliens (red eyes) are controlled by an AI.
* The camera can be moved using the arrow keys.

Developed using [Phaser 3](https://phaser.io/phaser3) and Typescript.

## About

It's the first "real" game I made!

I built this with a self-imposed 5-day time limit to see how far I could get, so
there's a lot of rough edges that I would like to clean up or spend more time
on. The time limit helped me to focus on what needed to be done but it's still
pretty far from being a complete game. I think it can be made pretty fun with a
little more design and polish, so I might come back to it later.

I did some annotation of the source [here](./src/game.ts) or use my other tool
(Annotato) to
[view](https://annotato.nikbrendler.com/github.com/nbrendler/ayyteegee/src/game.ts)!

## Development

To run the code:

```
# install dependencies
npm install

# serve with hot reload at localhost:8080
npm run dev

# build for production with minification
npm run build

# test the production build locally
npm run serve
```

## License/Attribution

* [Code (MIT)](https://github.com/nbrendler/ayyteegee/master/blob/LICENSE) - this game code and webpack config.
* [Template (MIT)](https://github.com/nbrendler/ayyteegee/master/blob/LICENSE.template.md) - original license of the phaser template.
* [Art](https://scut.itch.io/7drl-tileset-2018) by itch.io user scut with some
    edits by me.
