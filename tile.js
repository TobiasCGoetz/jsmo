export class Tile {
  constructor(element, images) {
    this.element = element;
    this.images = images;
    this.currentState = 0; // Start with the first image
    this.active = false;
    this.updateBackground();
    this.element.addEventListener("click", () => this.planMove());
  }

  setActive(isActive) {
    if (!isActive) {
      this.active = false;
      this.classList.set("tile");
    } else {
      this.active = true;
      this.classList.set("tile active");
    }
  }

  updateBackground() {
    this.element.style.backgroundImage = `url(${this.images[this.currentState]})`;
  }

  flash() {
    this.element.style.opacity = 0.5;
    setTimeout(() => (this.element.style.opacity = 1), 200);
  }
}
