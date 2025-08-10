export class Tile {
  constructor(element, images) {
    this.element = element;
    this.images = images;
    this.active = false;

    this.currentState = "";
    this.updateType("EDGE");
    this.zombieCount = 0;
    this.playerCount = 0;
    this.playersPlanMoveNorth = 0;
    this.playersPlanMoveEast = 0;
    this.playersPlanMoveSouth = 0;
    this.playersPlanMoveWest = 0;
    
    // Create overlay elements for displaying counts
    this.createOverlays();
    
    // Initialize overlay display
    this.updateOverlays();
  }

  createOverlays() {
    // Create container for overlays
    this.overlayContainer = document.createElement('div');
    this.overlayContainer.className = 'tile-overlays';
    
    // Create player count overlay
    this.playerOverlay = document.createElement('div');
    this.playerOverlay.className = 'tile-overlay player-count';
    this.playerOverlay.textContent = 'P:0';
    
    // Create undead count overlay
    this.undeadOverlay = document.createElement('div');
    this.undeadOverlay.className = 'tile-overlay undead-count';
    this.undeadOverlay.textContent = 'U:0';
    
    // Add overlays to container
    this.overlayContainer.appendChild(this.playerOverlay);
    this.overlayContainer.appendChild(this.undeadOverlay);
    
    // Add container to tile element
    this.element.appendChild(this.overlayContainer);
    
    // Debug logging
    console.log(`Created overlays for tile ${this.element.id}:`, {
      container: this.overlayContainer,
      playerOverlay: this.playerOverlay,
      undeadOverlay: this.undeadOverlay
    });
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
    
    // Update overlay displays
    this.updateOverlays();
  }

  updateOverlays() {
    if (this.playerOverlay) {
      this.playerOverlay.textContent = `P:${this.playerCount}`;
      // Always show overlay for debugging
      this.playerOverlay.style.display = 'block';
    }
    
    if (this.undeadOverlay) {
      this.undeadOverlay.textContent = `U:${this.zombieCount}`;
      // Always show overlay for debugging
      this.undeadOverlay.style.display = 'block';
    }
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
