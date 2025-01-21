export class Tile {
  constructor(element, images) {
    this.element = element;
    this.images = images;
    this.active = false;

    this.currentState = "EDGE";
    this.zombieCount = 0;
    this.playerCount = 0;
    this.playersPlanMoveNorth = 0;
    this.playersPlanMoveEast = 0;
    this.playersPlanMoveSouth = 0;
    this.playersPlanMoveWest = 0;

    this.updateType(this.currentState);
  }

  setActive(isActive) {
    if (!isActive) {
      this.active = false;
      this.element.classList.remove("active");
      this.element.classList.add("inactive");
    } else {
      this.active = true;
      this.element.classList.remove("inactive");
      this.element.classList.add("active");
    }
  }

  updateByContent(content) {
    this.updateType(content["TileType"]);
    this.zombieCount = content["ZombieCount"];
    this.playerCount = content["PlayerCount"];
    this.playersPlanMoveNorth = content["PlayersPlanMoveNorth"];
    this.playersPlanMoveEast = content["PlayersPlanMoveEast"];
    this.playersPlanMoveSouth = content["PlayersPlanMoveSouth"];
    this.playersPlanMoveWest = content["PlayersPlanMoveWest"];
  }

  updateType(type) {
    this.flash();
    this.element.style.backgroundImage = `url(${this.images[type]})`;
    this.currentState = type;
  }

  flash() {
    this.element.style.opacity = 0.5;
    setTimeout(() => (this.element.style.opacity = 1), 200);
  }
}
