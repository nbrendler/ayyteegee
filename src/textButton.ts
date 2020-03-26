import "phaser";

const PADDING = 5;

class TextButton extends Phaser.GameObjects.GameObject {
  textNode: Phaser.GameObjects.Text;
  button: Phaser.GameObjects.Graphics;
  constructor(scene, x, y, text, callback) {
    super(scene, "text_button");

    this.textNode = scene.add.text(x, y, text, {
      color: "#000",
      padding: {
        x: PADDING,
        y: PADDING,
      },
    });
    this.textNode.setInteractive();
    this.button = scene.add.graphics();
    this.button.setInteractive();

    this.button.fillStyle(0xffffff);
    this.button.fillRoundedRect(x, y, this.width, 30, 8);

    this.textNode.on("pointerdown", callback);
    this.button.on("pointerdown", callback);
    this.textNode.depth = 10;
  }

  get width() {
    return this.textNode.width;
  }
}

export default TextButton;
