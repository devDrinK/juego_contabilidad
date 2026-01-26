import Phaser from 'phaser';
import { Card } from '../objects/Card';
import { HistoryPanel } from '../objects/HistoryPanel';
import { AccountType, type AccountData, type JournalEntry } from '../types';

export class MainScene extends Phaser.Scene {
    private debeZone!: Phaser.GameObjects.Zone;
    private haberZone!: Phaser.GameObjects.Zone;
    private deckZone!: Phaser.GameObjects.Zone;

    // UI
    private statusText!: Phaser.GameObjects.Text;
    private differenceText!: Phaser.GameObjects.Text;
    private companyCashText!: Phaser.GameObjects.Text;
    private capitalText!: Phaser.GameObjects.Text;

    // New Panels
    private creditPanelText!: Phaser.GameObjects.Text;
    private obligationPanelText!: Phaser.GameObjects.Text;

    private historyPanel!: HistoryPanel;

    // State
    private companyCash: number = 1000;
    private capital: number = 5000;
    private taxCredit: number = 0;       // Acumulado Crédito Fiscal
    private taxObligation: number = 0;   // Acumulado Deudas Fiscales

    private libroDiario: JournalEntry[] = [];
    private accountLedgers: Map<string, number> = new Map();

    constructor() {
        super('MainScene');
    }

    create() {
        this.createZones();
        this.createUI();
        this.spawnCards();
        this.setupDragEvents();
        this.setupInputs();

        this.accountLedgers.set('Caja', 1000);
        this.accountLedgers.set('Capital Social', 5000);
    }

    private createZones() {
        // DEBE Zone (Left)
        this.add.rectangle(250, 260, 300, 350, 0x333333).setStrokeStyle(2, 0x666666);
        this.add.text(250, 70, 'DEBE', { fontSize: '24px', color: '#fff' }).setOrigin(0.5);
        this.debeZone = this.add.zone(250, 260, 300, 350).setRectangleDropZone(300, 350).setName('DEBE');

        // HABER Zone (Right)
        this.add.rectangle(550, 260, 300, 350, 0x333333).setStrokeStyle(2, 0x666666);
        this.add.text(550, 70, 'HABER', { fontSize: '24px', color: '#fff' }).setOrigin(0.5);
        this.haberZone = this.add.zone(550, 260, 300, 350).setRectangleDropZone(300, 350).setName('HABER');

        // Deck Tray Visual (Bottom)
        this.add.rectangle(400, 530, 780, 120, 0x111111).setStrokeStyle(1, 0x444444);
        this.add.text(400, 480, 'MAZO DE CUENTAS', { fontSize: '14px', color: '#666' }).setOrigin(0.5);

        // Deck Zone (Interactive)
        this.deckZone = this.add.zone(400, 540, 780, 120).setName('DECK');
        this.deckZone.setRectangleDropZone(780, 120); // Make it droppable to "remove" from board
    }

    private createUI() {
        // Top Info Bar
        this.add.rectangle(400, 25, 800, 50, 0x222222).setStrokeStyle(1, 0x444444);
        this.companyCashText = this.add.text(20, 15, `Efectivo: $${this.companyCash}`, { fontSize: '16px', color: '#4caf50' });
        this.capitalText = this.add.text(200, 15, `Capital: $${this.capital}`, { fontSize: '16px', color: '#ff9800' });

        // Tax Panels (Sides)

        // Left: Tax Credits (Green Energy)
        this.add.rectangle(60, 260, 100, 300, 0x1b5e20, 0.3).setStrokeStyle(1, 0x4caf50);
        this.add.text(60, 120, 'CRÉDITOS\nFISCALES', { fontSize: '12px', color: '#81c784', align: 'center' }).setOrigin(0.5);
        this.creditPanelText = this.add.text(60, 260, '$0', { fontSize: '24px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);

        // Right: Obligations (Red Debt)
        this.add.rectangle(740, 260, 100, 300, 0xb71c1c, 0.3).setStrokeStyle(1, 0xff5252);
        this.add.text(740, 120, 'OBLIGACIONES\nPOR PAGAR', { fontSize: '12px', color: '#e57373', align: 'center' }).setOrigin(0.5);
        this.obligationPanelText = this.add.text(740, 260, '$0', { fontSize: '24px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);

        // Status & Actions
        this.differenceText = this.add.text(400, 450, 'Diferencia: $0', { fontSize: '18px', color: '#aaa' }).setOrigin(0.5);
        this.statusText = this.add.text(400, 580, 'Arrastra cuentas y presiona SELLAR (H)', { fontSize: '16px', color: '#888' }).setOrigin(0.5);

        // Sellar Button
        const btn = this.add.rectangle(400, 485, 120, 40, 0x2196f3).setInteractive({ useHandCursor: true });
        this.add.text(400, 485, 'SELLAR', { fontSize: '20px', color: '#fff' }).setOrigin(0.5);
        btn.on('pointerdown', () => this.validateAndSeal());

        this.historyPanel = new HistoryPanel(this, 400, 300);
    }

    private setupInputs() {
        this.input.keyboard?.on('keydown-H', () => {
            this.historyPanel.toggle();
        });
    }

    private spawnCards() {
        // Clear existing cards first
        this.children.list.filter(child => child instanceof Card).forEach(c => c.destroy());

        const initialCards: AccountData[] = [
            { id: '1', name: 'Caja', type: AccountType.Asset, value: 100, isPersonal: false },
            { id: '2', name: 'Banco', type: AccountType.Asset, value: 500, isPersonal: false },
            { id: '3', name: 'Ctas x Pagar', type: AccountType.Liability, value: 100, isPersonal: false },
            { id: '4', name: 'Venta Servicios', type: AccountType.Revenue, value: 500, isPersonal: false, requiresIVA: true },
            { id: '5', name: 'Gastos Personales', type: AccountType.Expense, value: 50, isPersonal: true },
            { id: '6', name: 'Capital Social', type: AccountType.Equity, value: 1000, isPersonal: false },
            { id: '7', name: 'Compra Mercadería', type: AccountType.Expense, value: 200, isPersonal: false, requiresIVA: true }
        ];

        let startX = 150;
        const startY = 530; // Within deck tray

        initialCards.forEach((data, index) => {
            const card = new Card(this, startX + (index * 110), startY, data);
            card.setData('zone', 'DECK'); // Default zone
            card.on('valueChange', () => this.actualizarTotales());
        });

        this.actualizarTotales();
    }

    private setupDragEvents() {
        this.input.on('drag', (pointer: Phaser.Input.Pointer, gameObject: Card, dragX: number, dragY: number) => {
            gameObject.x = dragX;
            gameObject.y = dragY;
            this.children.bringToTop(gameObject);
        });

        this.input.on('drop', (pointer: Phaser.Input.Pointer, gameObject: Card, dropZone: Phaser.GameObjects.Zone) => {
            // Apply drop position relative to zone
            if (dropZone.name === 'DECK') {
                gameObject.x = dropZone.x + Phaser.Math.Between(-200, 200);
                gameObject.y = dropZone.y + Phaser.Math.Between(-30, 30);
            } else {
                gameObject.x = dropZone.x + Phaser.Math.Between(-100, 100);
                gameObject.y = dropZone.y + Phaser.Math.Between(-100, 100);
            }

            gameObject.setData('zone', dropZone.name);

            this.actualizarTotales();
        });
    }

    private actualizarTotales() {
        const children = this.children.list.filter(child => child instanceof Card) as Card[];
        const sumDebe = children.filter(c => c.getData('zone') === 'DEBE').reduce((s, c) => s + c.value, 0);
        const sumHaber = children.filter(c => c.getData('zone') === 'HABER').reduce((s, c) => s + c.value, 0);

        const diff = sumDebe - sumHaber;
        this.differenceText.setText(`Diferencia: $${diff}`);

        if (diff === 0) {
            this.differenceText.setColor('#4caf50'); // Green
        } else {
            this.differenceText.setColor('#ff5252'); // Red
        }
    }

    private validateAndSeal() {
        const children = this.children.list.filter(child => child instanceof Card) as Card[];
        const cardsDebe = children.filter(c => c.getData('zone') === 'DEBE');
        const cardsHaber = children.filter(c => c.getData('zone') === 'HABER');

        const sumDebe = cardsDebe.reduce((s, c) => s + c.value, 0);
        const sumHaber = cardsHaber.reduce((s, c) => s + c.value, 0);

        if (cardsDebe.length === 0 && cardsHaber.length === 0) {
            this.showFeedback('No hay cuentas para sellar.', 0xffff00);
            return;
        }

        if (sumDebe !== sumHaber) {
            this.showFeedback(`No balancea. Diferencia: $${sumDebe - sumHaber}`, 0xff0000);
            return;
        }

        if ([...cardsDebe, ...cardsHaber].some(c => c.isPersonal)) {
            this.showFeedback('Violación del Principio de Ente!', 0xff0000);
            return;
        }

        // --- SUCCESS ---
        this.updateGlobalState(cardsDebe, cardsHaber);

        const entry: JournalEntry = {
            id: Date.now().toString(),
            date: new Date().toLocaleTimeString(),
            description: 'Asiento Manual',
            debe: cardsDebe.map(c => ({ name: c.textName.text, value: c.value })),
            haber: cardsHaber.map(c => ({ name: c.textName.text, value: c.value }))
        };

        this.libroDiario.push(entry);
        this.historyPanel.updateHistory(this.libroDiario);

        this.showFeedback('Asiento Sellado!', 0x00ff00);
        this.time.delayedCall(1000, () => {
            this.spawnCards();
        });
    }

    private showFeedback(message: string, color: number) {
        this.statusText.setText(message);
        this.statusText.setColor(`#${color.toString(16)}`);
        this.statusText.setY(580);
        this.time.delayedCall(3000, () => {
            this.statusText.setText('Arrastra cuentas y presiona SELLAR (H para Historial)');
            this.statusText.setColor('#fff');
        });
    }

    private updateGlobalState(cardsDebe: Card[], cardsHaber: Card[]) {
        [...cardsDebe, ...cardsHaber].forEach(card => {
            const name = card.textName.text;
            const isDebe = card.getData('zone') === 'DEBE';

            // Cash/Capital Logic
            if (name === 'Caja') this.companyCash += isDebe ? card.value : -card.value;
            if (name === 'Capital Social') this.capital += isDebe ? -card.value : card.value;

            // Tax Calculation (Cumulative Effects)
            // Sales (Revenue) -> Generate Obligations (IVA DF + IT)
            if (card.accountType === AccountType.Revenue) {
                const ivaDF = Math.round(card.value * 0.13); // 13%
                const it = Math.round(card.value * 0.03);    // 3%
                this.taxObligation += (ivaDF + it);
            }

            // Purchases (Expense) -> Generate Credits (IVA CF) - Only if requiresIVA
            if (card.accountType === AccountType.Expense && card.getData('requiresIVA')) {
                const ivaCF = Math.round(card.value * 0.13); // 13%
                this.taxCredit += ivaCF;
            }
        });

        // Update UI
        this.companyCashText.setText(`Efectivo: $${this.companyCash}`);
        this.capitalText.setText(`Capital: $${this.capital}`);

        this.creditPanelText.setText(`$${this.taxCredit}`);
        this.obligationPanelText.setText(`$${this.taxObligation}`);
    }
}
