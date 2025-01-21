export class Tile {
    constructor(element, images) {
        this.element = element;
        this.images = images;
        this.currentState = 0; // Start with the first image
        this.updateBackground();
        this.element.addEventListener('click', () => this.nextState());
    }

    nextState() {
        this.currentState = (this.currentState + 1) % this.images.length; // Cycle through images
        this.updateBackground();
    }

    updateBackground() {
        this.element.style.backgroundImage = `url(${this.images[this.currentState]})`;
    }

    flash() {
        this.element.style.opacity = 0.5;
        setTimeout(() => this.element.style.opacity = 1, 200);
    }
}
