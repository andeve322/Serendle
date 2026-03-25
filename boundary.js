import { LetterState } from './entity.js';

export class WebBoundary {
    constructor(controller) {
        this.controller = controller;
        this.currentGuess = "";
        this.audioCtx = null;
        
        this.boardElement = document.getElementById('board');
        this.messageElement = document.getElementById('message-container');
        this.keyboardContainer = document.getElementById('keyboard-container');
        this.startButton = document.getElementById('start-btn');
        this.languageSelect = document.getElementById('language-select');
        
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleVirtualKey = this.handleVirtualKey.bind(this);
        
        this.setupEventListeners();
        this.renderKeyboard();
    }

    setupEventListeners() {
        this.startButton.addEventListener('click', () => {
            this.initAudio();
            this.startGame();
        });
    }

    initAudio() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playSound(type) {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        
        if (type === 'tap') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, this.audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(600, this.audioCtx.currentTime + 0.05);
            gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.05);
            osc.start(); osc.stop(this.audioCtx.currentTime + 0.05);
        } else if (type === 'error') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, this.audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.2);
            osc.start(); osc.stop(this.audioCtx.currentTime + 0.2);
        } else if (type === 'success') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(500, this.audioCtx.currentTime);
            osc.frequency.setValueAtTime(800, this.audioCtx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 0.3);
            osc.start(); osc.stop(this.audioCtx.currentTime + 0.3);
        }
    }

    showMessage(msg, duration = 2000) {
        this.messageElement.textContent = msg;
        this.messageElement.classList.remove('hidden');
        setTimeout(() => this.messageElement.classList.add('hidden'), duration);
    }

    async startGame() {
        const language = this.languageSelect.value;
        this.startButton.disabled = true;
        this.boardElement.innerHTML = '';
        this.keyboardContainer.style.display = 'flex';

        try {
            await this.controller.initialize(language);
            this.currentGuess = "";
            this.renderBoard();
            this.resetKeyboardColors();
            
            document.removeEventListener('keydown', this.handleKeyDown);
            document.addEventListener('keydown', this.handleKeyDown);
            this.playSound('success');
        } catch (error) {
            this.showMessage("Error loading dictionary file.");
            this.playSound('error');
        } finally {
            this.startButton.disabled = false;
        }
    }

    handleKeyDown(event) {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        this.processInput(event.key);
    }

    handleVirtualKey(event) {
        this.initAudio();
        const key = event.target.dataset.key;
        if (key) {
            this.processInput(key);
            event.target.blur(); // Prevent focus styling issues on mobile
        }
    }

    processInput(key) {
        if (!this.controller.session || this.controller.session.isWon || this.controller.session.isLost) return;

        if (key === 'Enter') {
            this.processSubmit();
        } else if (key === 'Backspace') {
            if (this.currentGuess.length > 0) {
                this.currentGuess = this.currentGuess.slice(0, -1);
                this.updateCurrentRow();
                this.playSound('tap');
            }
        } else if (/^[a-zA-Z]$/.test(key) && key.length === 1 && this.currentGuess.length < 5) {
            this.currentGuess += key.toUpperCase();
            this.updateCurrentRow(true);
            this.playSound('tap');
        }
    }

    processSubmit() {
        if (this.currentGuess.length !== 5) {
            this.triggerRowShake();
            this.showMessage("Not enough letters");
            this.playSound('error');
            return;
        }

        if (!this.controller.isValidWord(this.currentGuess)) {
            this.triggerRowShake();
            this.showMessage("Word not in dictionary");
            this.playSound('error');
            return;
        }

        const result = this.controller.submitGuess(this.currentGuess);
        this.currentGuess = "";
        this.animateSubmission(result);
    }

    triggerRowShake() {
        const attempts = this.controller.session.attempts.length;
        const currentRow = this.boardElement.children[attempts];
        currentRow.classList.remove('shake');
        void currentRow.offsetWidth; // Trigger reflow
        currentRow.classList.add('shake');
    }

    animateSubmission(result) {
        const attemptIndex = this.controller.session.attempts.length - 1;
        const rowDiv = this.boardElement.children[attemptIndex];
        const cells = rowDiv.querySelectorAll('.cell');

        result.forEach((item, index) => {
            setTimeout(() => {
                cells[index].classList.add('flip');
                setTimeout(() => {
                    cells[index].classList.add(item.state);
                    cells[index].style.borderColor = 'transparent';
                    this.updateKeyboardColor(item.char, item.state);
                    
                    if (index === 4) {
                        this.checkGameState();
                    }
                }, 250); // Color changes midway through flip
            }, index * 200); // Staggered animation
        });
    }

    checkGameState() {
        if (this.controller.session.isWon) {
            this.showMessage("Victory!", 5000);
            this.playSound('success');
        } else if (this.controller.session.isLost) {
            this.showMessage(`Game Over. Word: ${this.controller.session.targetWord}`, 5000);
            this.playSound('error');
        }
    }

    renderBoard() {
        this.boardElement.innerHTML = "";
        const maxAttempts = this.controller.session.maxAttempts;

        for (let i = 0; i < maxAttempts; i++) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'row';
            for (let j = 0; j < 5; j++) {
                const cellDiv = document.createElement('div');
                cellDiv.className = 'cell';
                rowDiv.appendChild(cellDiv);
            }
            this.boardElement.appendChild(rowDiv);
        }
    }

    updateCurrentRow(animateLast = false) {
        const attempts = this.controller.session.attempts.length;
        if (attempts >= this.controller.session.maxAttempts) return;
        
        const currentRow = this.boardElement.children[attempts];
        const cells = currentRow.querySelectorAll('.cell');
        
        for (let i = 0; i < 5; i++) {
            const letter = this.currentGuess[i] || "";
            cells[i].textContent = letter;
            cells[i].style.borderColor = letter ? '#878a8c' : 'var(--color-border)';
            
            if (animateLast && i === this.currentGuess.length - 1 && letter !== "") {
                cells[i].classList.remove('pop');
                void cells[i].offsetWidth; // reflow
                cells[i].classList.add('pop');
            }
        }
    }

    renderKeyboard() {
        const layout = [
            ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
            ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
            ['Enter', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Backspace']
        ];

        this.keyboardContainer.innerHTML = '';
        
        layout.forEach(row => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'keyboard-row';
            
            row.forEach(key => {
                const button = document.createElement('button');
                button.className = 'key';
                if (key === 'Enter' || key === 'Backspace') {
                    button.classList.add('large');
                    button.textContent = key === 'Backspace' ? '⌫' : 'ENT';
                } else {
                    button.textContent = key;
                }
                button.dataset.key = key;
                button.id = `key-${key}`;
                button.addEventListener('click', this.handleVirtualKey);
                rowDiv.appendChild(button);
            });
            this.keyboardContainer.appendChild(rowDiv);
        });
    }

    updateKeyboardColor(char, state) {
        const keyElement = document.getElementById(`key-${char}`);
        if (!keyElement) return;

        // Prevent downgrading exactly matched keys to present/absent
        if (keyElement.classList.contains(LetterState.EXACT)) return;
        if (keyElement.classList.contains(LetterState.PRESENT) && state === LetterState.ABSENT) return;

        keyElement.classList.remove(LetterState.PRESENT, LetterState.ABSENT);
        keyElement.classList.add(state);
    }

    resetKeyboardColors() {
        const keys = this.keyboardContainer.querySelectorAll('.key');
        keys.forEach(key => {
            key.classList.remove(LetterState.EXACT, LetterState.PRESENT, LetterState.ABSENT);
        });
    }
}