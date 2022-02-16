export class HouseSlider {
    constructor(startNumber, position) {
        this.time = 0;
        this.number = startNumber;
        this.position = position;
        this.stopped = true;
    }

    resetSlider() {
        this.time = 0;
        this.stopped = true;
    }
}