import { GameController } from './Control.js';
import { WebBoundary } from './Boundary.js';

document.addEventListener('DOMContentLoaded', () => {
    const controller = new GameController();
    new WebBoundary(controller);
});
