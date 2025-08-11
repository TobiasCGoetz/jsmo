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
    this.isFlipping = false;
    
    // Create flip structure
    this.createFlipStructure();
    
    // Initialize with EDGE type
    this.updateType("EDGE");
    
    // Create overlay elements for displaying counts
    this.createOverlays();
    
    // Initialize overlay display
    this.updateOverlays();
  }

  createFlipStructure() {
    // Create flipper container
    this.flipper = document.createElement('div');
    this.flipper.className = 'tile-flipper';
    
    // Create front and back faces
    this.frontFace = document.createElement('div');
    this.frontFace.className = 'tile-face tile-front';
    
    this.backFace = document.createElement('div');
    this.backFace.className = 'tile-face tile-back';
    
    // Add faces to flipper
    this.flipper.appendChild(this.frontFace);
    this.flipper.appendChild(this.backFace);
    
    // Add flipper to tile element
    this.element.appendChild(this.flipper);
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
    
    if (this.currentState && this.currentState !== newType) {
      console.log(`Tile ${this.element.id} changing from ${this.currentState} to ${newType} with direction ${playerDirection}`);
      this.updateType(newType, playerDirection);
    } else if (!this.currentState) {
      // Initial setup - no animation
      this.frontFace.style.backgroundImage = `url(${this.images[newType]})`;
      this.currentState = newType;
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
    
    // If this is the initial setup, just set the front face
    if (!this.currentState) {
      this.frontFace.style.backgroundImage = `url(${this.images[type]})`;
      this.currentState = type;
      return;
    }
    
    // Prevent multiple simultaneous flips
    if (this.isFlipping) {
      return;
    }
    
    this.performFlipAnimation(type, direction);
  }
  
  performFlipAnimation(newType, direction = null) {
    this.isFlipping = true;
    
    // Set the new image on the back face
    this.backFace.style.backgroundImage = `url(${this.images[newType]})`;
    
    // Determine flip direction class based on player movement
    let flipClass = 'flipping-east'; // Default to east (left-to-right)
    if (direction) {
      const normalizedDirection = direction.toLowerCase();
      switch (normalizedDirection) {
        case 'north':
          flipClass = 'flipping-north';
          break;
        case 'south':
          flipClass = 'flipping-south';
          break;
        case 'east':
          flipClass = 'flipping-east';
          break;
        case 'west':
          flipClass = 'flipping-west';
          break;
        default:
          flipClass = 'flipping-east';
      }
    }
    
    // Add random delay between 0-200ms for organic feel
    const randomDelay = Math.random() * 200;
    
    setTimeout(() => {
      // Start the flip animation with direction-specific class
      this.flipper.classList.add(flipClass);
      
      // After animation completes, swap the faces and reset
      setTimeout(() => {
        // First, update the current state
        this.currentState = newType;
        
        // Swap the images: put new image on front, old on back
        this.frontFace.style.backgroundImage = `url(${this.images[newType]})`;
        this.backFace.style.backgroundImage = `url(${this.images[this.currentState]})`;
        
        // Remove the flip class to reset the animation
        this.flipper.classList.remove(flipClass);
        
        // Mark as no longer flipping
        this.isFlipping = false;
      }, 600); // Match CSS transition duration
    }, randomDelay);
  }

  flash() {
    // Flash effect is now handled by the flip animation
    // Keep this method for compatibility
  }
}
