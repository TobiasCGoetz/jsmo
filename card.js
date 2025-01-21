export class card {
  constructor(element, images) {
    this.element = element;
    this.images = images;
    this.currentState = "none";
  }

  setActive(isActive) {
    this.element.classList.toggle("active");
  }

  updateType(type) {
    if (this.currentState == type) {
      return;
    }
    this.element.style.backgroundImage = `url(${this.images[type]})`;
    this.flash();
    this.currentState = type;
  }

  flash() {
    this.element.style.opacity = 0.2;
    setTimeout(() => (this.element.style.opacity = 1), 400);
  }
}
