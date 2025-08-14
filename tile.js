export class Tile {
  constructor(element, images) {
    this.element = element;
    this.images = images;
    this.active = false;

    this.currentState = "";
    this.zombieCount = 0;
    this.playerCount = 0;
    this.playersPlanMoveNorth = 0;
    this.playersPlanMoveEast = 0;
    this.playersPlanMoveSouth = 0;
    this.playersPlanMoveWest = 0;
    // Create simple image container
    this.imageContainer = document.createElement('div');
    this.imageContainer.className = 'tile-image';
    
    // Initialize with EDGE type
    this.imageContainer.style.backgroundImage = `url(${this.images["EDGE"]})`;
    this.currentState = "EDGE";
    
    // Add image container to tile element
    this.element.appendChild(this.imageContainer);
    
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
    
    // Create planned move arrows only for central tile
    if (this.element.id === 'CE') {
      this.createPlannedMoveArrows();
    }
    
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

  createPlannedMoveArrows() {
    // Create container for arrows
    this.arrowContainer = document.createElement('div');
    this.arrowContainer.className = 'planned-move-arrows';
    
    // Create arrows for each direction
    this.arrows = {
      north: this.createArrow('north', '↑'),
      east: this.createArrow('east', '→'),
      south: this.createArrow('south', '↓'),
      west: this.createArrow('west', '←')
    };
    
    // Add arrows to container
    Object.values(this.arrows).forEach(arrow => {
      this.arrowContainer.appendChild(arrow.element);
    });
    
    // Add arrow container to tile element
    this.element.appendChild(this.arrowContainer);
  }

  createArrow(direction, symbol) {
    const arrow = document.createElement('div');
    arrow.className = `planned-move-arrow arrow-${direction}`;
    
    const arrowSymbol = document.createElement('span');
    arrowSymbol.className = 'arrow-symbol';
    arrowSymbol.textContent = symbol;
    
    const arrowCount = document.createElement('span');
    arrowCount.className = 'arrow-count';
    arrowCount.textContent = '0';
    
    arrow.appendChild(arrowSymbol);
    arrow.appendChild(arrowCount);
    
    return {
      element: arrow,
      count: arrowCount
    };
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

  updateByContent(content, playerDirection = null) {
    // Only trigger flip animation for surroundings updates (when tile already has a state)
    const newType = content["TileType"];
    
    // Prevent multiple updates if already flipping
    if (this.isFlipping) {
      console.log(`Tile ${this.element.id} is already flipping, skipping update`);
      return;
    }
    
    // Update tile image if type has changed
    if (this.currentState !== newType) {
      this.imageContainer.style.backgroundImage = `url(${this.images[newType]})`;
      this.currentState = newType;
      
      // Trigger update animation
      this.animateUpdate();
    }
    
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
    
    // Update planned move arrows
    this.updatePlannedMoveArrows();
  }

  updatePlannedMoveArrows() {
    if (!this.arrows) return;
    
    // Update arrow counts and visibility
    const moves = {
      north: this.playersPlanMoveNorth,
      east: this.playersPlanMoveEast,
      south: this.playersPlanMoveSouth,
      west: this.playersPlanMoveWest
    };
    
    Object.entries(moves).forEach(([direction, count]) => {
      if (this.arrows[direction]) {
        this.arrows[direction].count.textContent = count;
        // Show arrow only if there are planned moves
        this.arrows[direction].element.style.display = count > 0 ? 'flex' : 'none';
      }
    });
  }

  updateType(type, direction = null) {
    if (this.currentState === type) {
      return;
    }
    
    // Update tile image directly
    this.imageContainer.style.backgroundImage = `url(${this.images[type]})`;
    this.currentState = type;
    
    // Trigger update animation
    this.animateUpdate();
  }
  


  animateUpdate() {
    // Add update animation class
    this.element.classList.add('tile-updated');
    
    // Remove the class after animation completes to allow re-triggering
    setTimeout(() => {
      this.element.classList.remove('tile-updated');
    }, 600); // Match animation duration
  }
  
  flash() {
    // Use the new update animation for flash effect
    this.animateUpdate();
  }
}
