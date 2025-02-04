export class Card {
  constructor(element, images) {
    this.element = element;
    this.images = images;
    this.currentState = "";
    this.updateType("None");
  }

  toggle() {
    this.element.classList.toggle("active");
  }

  isActive() {
    return this.element.classList.contains("active");
  }

  getType() {
    return this.currentState;
  }

  updateType(type) {
    if (this.currentState == type) {
      return;
    }
    this.element.style.backgroundImage = `url(${this.images[type]})`;
    console.log("Updated Card to", this.images[type]);
    this.flash();
    this.currentState = type;
  }

  flash() {
    this.element.style.opacity = 0.2;
    setTimeout(() => (this.element.style.opacity = 1), 400);
  }
}

export function findIdOfCardForType(cardInstances, type) {
  for (key in cardInstances) {
    if (cardInstances[key].getType() === type) {
      return key;
    }
  }
  return null;
}
