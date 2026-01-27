import Phaser from 'phaser';
import { Card } from '../objects/Card';
import { HistoryPanel } from '../objects/HistoryPanel';
import { AccountType, type AccountData, type JournalEntry, type MarketEvent } from '../types';
import deskImg from '../../assets/elements/desk.jpg';
import debeBoxImg from '../../assets/elements/debeBox-removebg-preview.png';
import haberBoxImg from '../../assets/elements/haberBox-removebg-preview.png';

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

    // Turn System
    private currentDay: number = 1;
    private currentMonth: number = 1;
    private actionPoints: number = 5;
    private readonly MAX_ACTION_POINTS: number = 5;
    private dailyHistory: string[] = []; // To track what happened each day

    // Market System
    private marketPool: MarketEvent[] = [];
    private activeMission: MarketEvent | null = null;
    private marketContainer!: Phaser.GameObjects.Container;
    private missionText!: Phaser.GameObjects.Text;

    // Turn UI
    private dayText!: Phaser.GameObjects.Text;
    private apText!: Phaser.GameObjects.Text;
    private endDayBtnContainer!: Phaser.GameObjects.Container; // Container for button + text

    private libroDiario: JournalEntry[] = [];
    private accountLedgers: Map<string, number> = new Map();

    constructor() {
        super('MainScene');
    }

    preload() {
        this.load.image('desk', deskImg.src);
        this.load.image('debeBox', debeBoxImg.src);
        this.load.image('haberBox', haberBoxImg.src);
    }

    create() {
        this.add.image(400, 300, 'desk').setDisplaySize(800, 600);
        this.createZones();
        this.createZones();
        this.createUI();
        this.initializeMarketPool();
        this.generarMercado(); // Initial market for Day 1
        this.spawnCards();
        this.setupDragEvents();
        this.setupInputs();

        this.accountLedgers.set('Caja', 1000);
        this.accountLedgers.set('Capital Social', 5000);
    }

    private createZones() {
        // DEBE Zone (Left)
        this.add.image(250, 260, 'debeBox').setDisplaySize(300, 350);
        this.add.text(250, 70, 'DEBE', { fontSize: '24px', color: '#fff' }).setOrigin(0.5);
        this.debeZone = this.add.zone(250, 260, 300, 350).setRectangleDropZone(300, 350).setName('DEBE');

        // HABER Zone (Right)
        this.add.image(550, 260, 'haberBox').setDisplaySize(300, 350);
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

        // Turn HUD
        this.dayText = this.add.text(600, 15, `Día ${this.currentDay} de 7`, { fontSize: '16px', color: '#ffffff' });
        this.apText = this.add.text(720, 15, `AP: ${this.actionPoints}/${this.MAX_ACTION_POINTS}`, { fontSize: '16px', color: '#2196f3' });

        // End Day Button (Top Right now as requested)
        this.createEndDayButton();

        // Active Mission Text (Center Top)
        this.missionText = this.add.text(400, 100, 'Misión: Ninguna', { fontSize: '18px', color: '#ffd700', fontStyle: 'bold' }).setOrigin(0.5);

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
            // Check Action Points
            if (this.actionPoints <= 0) {
                this.showFeedback('Agotado. Termina el día.', 0xff5252);
                // Return to deck
                gameObject.x = this.deckZone.x + Phaser.Math.Between(-200, 200);
                gameObject.y = this.deckZone.y + Phaser.Math.Between(-30, 30);
                gameObject.setData('zone', 'DECK');
                this.actualizarTotales();
                return;
            }

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

        // Action Point Check
        if (this.actionPoints <= 0) {
            this.showFeedback('No tienes energía. Termina el día.', 0xff5252);
            return;
        }

        // Active Mission Validation
        if (this.activeMission) {
            if (sumDebe !== this.activeMission.amount) {
                this.showFeedback(`Misión requiere $${this.activeMission.amount}`, 0xff5252);
                return;
            }

            const debeNames = cardsDebe.map(c => c.textName.text);
            const haberNames = cardsHaber.map(c => c.textName.text);

            const missingDebe = this.activeMission.accountingEffect.debe.filter(req => !debeNames.includes(req));
            const missingHaber = this.activeMission.accountingEffect.haber.filter(req => !haberNames.includes(req));

            if (missingDebe.length > 0 || missingHaber.length > 0) {
                this.showFeedback(`Faltan cuentas: ${[...missingDebe, ...missingHaber].join(', ')}`, 0xff5252);
                return;
            }
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

        // Consume Action Point
        this.validateActionPointConsumption();
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

    private createEndDayButton() {
        const x = 720;
        const y = 50; // Moved to top right
        const btn = this.add.rectangle(0, 0, 120, 30, 0xd32f2f).setStrokeStyle(1, 0xff5252);
        const text = this.add.text(0, 0, 'Terminar Día', { fontSize: '14px', color: '#fff' }).setOrigin(0.5);

        this.endDayBtnContainer = this.add.container(x, y, [btn, text]);
        this.endDayBtnContainer.setSize(120, 40).setInteractive({ useHandCursor: true });

        this.endDayBtnContainer.on('pointerdown', () => this.endDay());
    }

    private validateActionPointConsumption() {
        this.actionPoints--;
        this.updateTimeHUD();

        if (this.actionPoints === 0) {
            this.showFeedback('¡Estás agotado! Cierra la oficina.', 0xff9800);
            // Optional: Visually disable trays or change their alpha
        }
    }

    private endDay() {
        // Summary for valid day
        this.dailyHistory.push(`Día ${this.currentDay}: Efectivo ${this.companyCash}, Capital ${this.capital}`);

        this.currentDay++;
        this.actionPoints = this.MAX_ACTION_POINTS;

        if (this.currentDay > 7) {
            this.endMonth();
        } else {
            this.showFeedback(`Inicia el Día ${this.currentDay}`, 0x2196f3);
            this.updateTimeHUD();
            this.generarMercado(); // New market for new day
            this.spawnCards(); // Respawn cards for new day challenges
        }
    }

    private initializeMarketPool() {
        this.marketPool = [
            {
                id: '1', title: 'Venta de Servicios', description: 'Cliente paga honorarios.',
                type: 'Venta', amount: 500, requiresInvoice: true,
                accountingEffect: { debe: ['Caja'], haber: ['Venta Servicios'] }
            },
            {
                id: '2', title: 'Compra de Insumos', description: 'Compra de papel y tinta.',
                type: 'Compra', amount: 200, requiresInvoice: true,
                accountingEffect: { debe: ['Compra Mercadería'], haber: ['Caja'] }
            },
            {
                id: '3', title: 'Pago de Deuda', description: 'Pagar a proveedores.',
                type: 'Evento', amount: 100, requiresInvoice: false,
                accountingEffect: { debe: ['Ctas x Pagar'], haber: ['Caja'] }
            },
            {
                id: '4', title: 'Aporte de Capital', description: 'Socio aporta efectivo.',
                type: 'Evento', amount: 1000, requiresInvoice: false,
                accountingEffect: { debe: ['Caja'], haber: ['Capital Social'] }
            },
            {
                id: '5', title: 'Retiro Personal', description: 'Dueño retira dinero.',
                type: 'Evento', amount: 50, requiresInvoice: false,
                accountingEffect: { debe: ['Gastos Personales'], haber: ['Caja'] }
            }
        ];
    }

    private generarMercado() {
        // Reset active mission logic? Or carry over? Assuming daily reset.
        this.activeMission = null;
        this.missionText.setText('Misión: Selecciona del Mercado');

        // Select 3 random
        const shuffled = [...this.marketPool].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3);

        this.showMarketUI(selected);
    }

    private showMarketUI(events: MarketEvent[]) {
        if (this.marketContainer) this.marketContainer.destroy();

        this.marketContainer = this.add.container(400, 300);

        // Background overlay
        const bg = this.add.rectangle(0, 0, 800, 600, 0x000000, 0.8).setInteractive();
        this.marketContainer.add(bg);

        const title = this.add.text(0, -250, `Mercado - Día ${this.currentDay}`, { fontSize: '32px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
        this.marketContainer.add(title);

        events.forEach((event, index) => {
            const x = (index - 1) * 220;
            const y = 0;

            const cardBg = this.add.rectangle(x, y, 200, 300, 0x333333).setStrokeStyle(2, 0x888888);
            const titleTxt = this.add.text(x, y - 120, event.title, { fontSize: '18px', color: '#4caf50', wordWrap: { width: 180 } }).setOrigin(0.5);
            const descTxt = this.add.text(x, y - 50, event.description, { fontSize: '14px', color: '#ccc', wordWrap: { width: 180 }, align: 'center' }).setOrigin(0.5);
            const amountTxt = this.add.text(x, y + 20, `$${event.amount}`, { fontSize: '24px', color: '#ffd700' }).setOrigin(0.5);

            // Accept Button
            const btnBg = this.add.rectangle(x, y + 100, 160, 40, 0x2196f3).setInteractive({ useHandCursor: true });
            const btnTxt = this.add.text(x, y + 100, 'ACEPTAR', { fontSize: '18px', color: '#fff' }).setOrigin(0.5);

            btnBg.on('pointerdown', () => {
                this.acceptMission(event);
            });

            this.marketContainer.add([cardBg, titleTxt, descTxt, amountTxt, btnBg, btnTxt]);
        });
    }

    private acceptMission(event: MarketEvent) {
        this.activeMission = event;
        this.missionText.setText(`Misión: ${event.title} ($${event.amount})`);

        if (this.marketContainer) {
            this.marketContainer.destroy();
        }

        this.showFeedback(`Misión Aceptada: ${event.title}`, 0x4caf50);
    }

    private endMonth() {
        alert('Cierre de Mes Completado!');
        // Reset for new month loop (Simplified for now)
        this.currentDay = 1;
        this.currentMonth++;
        this.actionPoints = this.MAX_ACTION_POINTS;
        this.updateTimeHUD();
        this.showFeedback(`Inicia el Mes ${this.currentMonth}`, 0x4caf50);
    }

    private updateTimeHUD() {
        this.dayText.setText(`Día ${this.currentDay} de 7`);
        this.apText.setText(`AP: ${this.actionPoints}/${this.MAX_ACTION_POINTS}`);

        if (this.actionPoints === 0) {
            this.apText.setColor('#ff5252');
        } else {
            this.apText.setColor('#2196f3');
        }
    }
}
