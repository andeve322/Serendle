import { LetterState, GameSession } from './Entity.js';

export class GameController {
    constructor() {
        this.vocabulary = [];
        this.session = null;
    }

    async initialize(language) {
        const filename = `${language}.json`;
        const response = await fetch(filename);
        if (!response.ok) {
            throw new Error(`Failed to load vocabulary from ${filename}`);
        }
        const data = await response.json();
        this.vocabulary = data.filter(word => word.length === 5).map(word => word.toUpperCase());
        this.session = new GameSession(this._selectTargetWord());
    }

    _selectTargetWord() {
        if (this.vocabulary.length === 0) throw new Error("Vocabulary is empty.");
        const randomIndex = Math.floor(Math.random() * this.vocabulary.length);
        return this.vocabulary[randomIndex];
    }

    isValidWord(word) {
        return word.length === 5 && this.vocabulary.includes(word.toUpperCase());
    }

    submitGuess(guess) {
        guess = guess.toUpperCase();
        const target = this.session.targetWord;
        const result = Array.from(guess).map(char => ({ char, state: LetterState.UNCHECKED }));
        const targetCounts = {};

        for (const char of target) {
            targetCounts[char] = (targetCounts[char] || 0) + 1;
        }

        for (let i = 0; i < 5; i++) {
            if (guess[i] === target[i]) {
                result[i].state = LetterState.EXACT;
                targetCounts[guess[i]]--;
            }
        }

        for (let i = 0; i < 5; i++) {
            if (result[i].state === LetterState.EXACT) continue;

            const char = guess[i];
            if (targetCounts[char] > 0) {
                result[i].state = LetterState.PRESENT;
                targetCounts[char]--;
            } else {
                result[i].state = LetterState.ABSENT;
            }
        }

        this.session.attempts.push(result);

        if (guess === target) {
            this.session.isWon = true;
        } else if (this.session.attempts.length >= this.session.maxAttempts) {
            this.session.isLost = true;
        }

        return result;
    }
}