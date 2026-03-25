import { GameController } from './control.js';
import { WebBoundary } from './boundary.js';

document.addEventListener('DOMContentLoaded', () => {
    const controller = new GameController();
    new WebBoundary(controller);
});
