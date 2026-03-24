export const LetterState = {
    EXACT: 'exact',
    PRESENT: 'present',
    ABSENT: 'absent',
    UNCHECKED: 'unchecked'
};

export class GameSession {
    constructor(targetWord, maxAttempts = 6) {
        this.targetWord = targetWord.toUpperCase();
        this.maxAttempts = maxAttempts;
        this.attempts = [];
        this.isWon = false;
        this.isLost = false;
    }
}