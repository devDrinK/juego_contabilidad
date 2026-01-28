import Phaser from 'phaser';
import { Card } from '../objects/Card';
import { HistoryPanel } from '../objects/HistoryPanel';
import { StatusPanel } from '../objects/StatusPanel';
import { AccountType, AccountCategory, getCategoryByType, type AccountData, type JournalEntry, type MarketEvent } from '../types';
import deskImg from '../../assets/elements/desk.jpg';
import debeBoxImg from '../../assets/elements/debeBox-removebg-preview.png';
import haberBoxImg from '../../assets/elements/haberBox-removebg-preview.png';

export class MainScene extends Phaser.Scene {
    private debeZone!: Phaser.GameObjects.Zone;
    private haberZone!: Phaser.GameObjects.Zone;
    private deckZone!: Phaser.GameObjects.Zone;
    private reserveZone!: Phaser.GameObjects.Zone;

    // UI
    private auditText!: Phaser.GameObjects.Text; // "Decreasing Resource" warnings
    private sealBtn!: Phaser.GameObjects.Rectangle;
    private sealBtnText!: Phaser.GameObjects.Text;
    private statusText!: Phaser.GameObjects.Text;
    private differenceText!: Phaser.GameObjects.Text;
    private companyCashText!: Phaser.GameObjects.Text;
    private capitalText!: Phaser.GameObjects.Text;

    // New Panels
    private creditPanelText!: Phaser.GameObjects.Text;
    private obligationPanelText!: Phaser.GameObjects.Text;

    private historyPanel!: HistoryPanel;
    private statusPanel!: StatusPanel;

    // State
    private companyCash: number = 1000;
    private capital: number = 5000;
    private taxCredit: number = 0;       // Acumulado Crédito Fiscal

    // Indicators (0-100)
    private liquidity: number = 50;
    private solidity: number = 50;
    private prestige: number = 100;
    private accumulatedResults: number = 0;

    private taxObligation: number = 0;   // Acumulado Deudas Fiscales

    // Turn System
    private currentDay: number = 1;
    private currentMonth: number = 1;
    private actionPoints: number = 5;
    private readonly MAX_ACTION_POINTS: number = 5;
    private dailyHistory: string[] = []; // To track what happened each day

    // Market System
    // Market System
    private marketPool: MarketEvent[] = []; // Constant definition of events
    private availableMissions: MarketEvent[] = []; // The 3 currently available
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
        const { width, height } = this.scale;

        // Center Desk
        this.add.image(width / 2, height / 2, 'desk').setDisplaySize(width, height);

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
        const { width, height } = this.scale;

        // DEBE Zone (Left) - 25% Width
        const debeX = width * 0.25;
        const debeY = height * 0.45;
        this.add.image(debeX, debeY, 'debeBox').setDisplaySize(width * 0.35, height * 0.55);
        this.add.text(debeX, height * 0.1, 'DEBE', { fontSize: '32px', color: '#fff' }).setOrigin(0.5);
        this.debeZone = this.add.zone(debeX, debeY, width * 0.35, height * 0.55).setRectangleDropZone(width * 0.35, height * 0.55).setName('DEBE');

        // HABER Zone (Right) - 75% Width
        const haberX = width * 0.75;
        const haberY = height * 0.45;
        this.add.image(haberX, haberY, 'haberBox').setDisplaySize(width * 0.35, height * 0.55);
        this.add.text(haberX, height * 0.1, 'HABER', { fontSize: '32px', color: '#fff' }).setOrigin(0.5);
        this.haberZone = this.add.zone(haberX, haberY, width * 0.35, height * 0.55).setRectangleDropZone(width * 0.35, height * 0.55).setName('HABER');

        // Deck Tray Visual (Bottom)
        const deckY = height - 80;
        this.add.rectangle(width / 2, deckY, width * 0.9, 140, 0x111111).setStrokeStyle(1, 0x444444);
        this.add.text(width / 2, deckY - 60, 'MAZO DE CUENTAS', { fontSize: '18px', color: '#666' }).setOrigin(0.5);

        // Deck Zone (Interactive)
        this.deckZone = this.add.zone(width / 2, deckY, width * 0.9, 140).setName('DECK');
        this.deckZone.setRectangleDropZone(width * 0.9, 140);

        // Reserve Zone (New) - Center / Top or separate? 
        // Let's put it top left near Credits
        const reserveX = 200;
        const reserveY = 150;
        this.add.rectangle(reserveX, reserveY, 200, 100, 0x333333, 0.5).setStrokeStyle(1, 0x888888);
        this.add.text(reserveX, reserveY - 55, 'RESERVA TEMPORAL (Max 2)', { fontSize: '12px', color: '#aaa' }).setOrigin(0.5);
        this.reserveZone = this.add.zone(reserveX, reserveY, 200, 100).setRectangleDropZone(200, 100).setName('RESERVE');
    }

    private createUI() {
        const { width, height } = this.scale;
        const centerX = width / 2;

        // Top Info Bar
        this.add.rectangle(centerX, 25, width, 50, 0x222222).setStrokeStyle(1, 0x444444);
        this.companyCashText = this.add.text(20, 15, `Efectivo: $${this.companyCash}`, { fontSize: '20px', color: '#4caf50' });
        this.capitalText = this.add.text(300, 15, `Capital: $${this.capital}`, { fontSize: '20px', color: '#ff9800' });

        // Turn HUD
        this.dayText = this.add.text(width - 300, 15, `Día ${this.currentDay} de 7`, { fontSize: '20px', color: '#ffffff' });
        this.apText = this.add.text(width - 150, 15, `AP: ${this.actionPoints}/${this.MAX_ACTION_POINTS}`, { fontSize: '20px', color: '#2196f3' });

        // End Day Button (Top Right now as requested)
        this.createEndDayButton();

        // Active Mission Text (Center Top)
        this.missionText = this.add.text(centerX, 80, 'Misión: Ninguna', { fontSize: '24px', color: '#ffd700', fontStyle: 'bold' }).setOrigin(0.5);

        // Tax Panels (Sides)
        // Left: Tax Credits (Green Energy)
        this.add.rectangle(60, height / 2, 100, 400, 0x1b5e20, 0.3).setStrokeStyle(1, 0x4caf50);
        this.add.text(60, (height / 2) - 150, 'CRÉDITOS\nFISCALES', { fontSize: '14px', color: '#81c784', align: 'center' }).setOrigin(0.5);
        this.creditPanelText = this.add.text(60, height / 2, '$0', { fontSize: '24px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);

        // Right: Obligations (Red Debt)
        this.add.rectangle(width - 60, height / 2, 100, 400, 0xb71c1c, 0.3).setStrokeStyle(1, 0xff5252);
        this.add.text(width - 60, (height / 2) - 150, 'OBLIGACIONES\nPOR PAGAR', { fontSize: '14px', color: '#e57373', align: 'center' }).setOrigin(0.5);
        this.obligationPanelText = this.add.text(width - 60, height / 2, '$0', { fontSize: '24px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);

        // Status & Actions
        this.differenceText = this.add.text(centerX, height * 0.75, 'Diferencia: $0', { fontSize: '22px', color: '#aaa' }).setOrigin(0.5);
        this.auditText = this.add.text(centerX, height * 0.70, '', { fontSize: '18px', color: '#ff9800', fontStyle: 'italic' }).setOrigin(0.5);
        this.statusText = this.add.text(centerX, height - 160, 'Arrastra cuentas y presiona SELLAR (H)', { fontSize: '18px', color: '#888' }).setOrigin(0.5);

        // Sellar Button
        const btnY = height * 0.8;
        this.sealBtn = this.add.rectangle(centerX, btnY, 180, 50, 0x2196f3).setInteractive({ useHandCursor: true });
        this.sealBtnText = this.add.text(centerX, btnY, 'SELLAR', { fontSize: '24px', color: '#fff' }).setOrigin(0.5);
        this.sealBtn.on('pointerdown', () => this.validateAndSeal());

        // Centered History Panel
        const centerY = height / 2;
        this.historyPanel = new HistoryPanel(this, centerX, centerY);

        // Status Panel (Top Right)
        const statusX = this.scale.width - 120; // Visible position approx
        this.statusPanel = new StatusPanel(this, statusX, 400);
        this.statusPanel.setDepth(2000); // Ensure on top of everything

        this.updateIndicators(); // Initial calc
    }

    private setupInputs() {
        this.input.keyboard?.on('keydown-H', () => {
            console.log('Toggling History');
            this.historyPanel.toggle();
        });

        this.input.keyboard?.on('keydown-Q', () => {
            this.statusPanel.toggle();
        });
    }

    private spawnCards() {
        // Renaming concept to "Repartir Mano" logic, but keeping method name for compatibility or updating
        // Logic: Keep cards in RESERVE. Destroy DECK cards. Spawn new ones.

        const children = this.children.list.filter(child => child instanceof Card) as Card[];

        // Destroy cards in DECK or Zones (Debe/Haber) - i.e. not in RESERVE
        children.forEach(c => {
            const zone = c.getData('zone');
            if (zone !== 'RESERVE') {
                c.destroy();
            }
        });

        const cardsInReserve = children.filter(c => c.getData('zone') === 'RESERVE').length;
        const slotsToFill = 7 - cardsInReserve;

        if (slotsToFill <= 0) return;

        const { width, height } = this.scale;
        const centerX = width / 2;
        let startX = centerX - 330;
        const startY = height - 80;

        // Reactive Deck Generation
        let requiredTypes: AccountType[] = [];

        // 70% chance to prioritize mission needs
        if (this.activeMission && Math.random() < 0.7) {
            const effect = this.activeMission.accountingEffect;
            // Naive string to type mapping or lookups? 
            // We need to map 'Caja' -> Asset, 'Venta Servicios' -> Revenue
            // Let's maintain a dictionary or search the initial pool/accountLedgers keys?
            // Simplified: Just spawn random "correct" types? 
            // Better: Let's pick from a 'All Cards' definition list based on names
        }

        const allDefinitions: AccountData[] = [
            { id: '1', name: 'Caja', type: AccountType.Asset, value: 100, isPersonal: false },
            { id: '2', name: 'Banco', type: AccountType.Asset, value: 500, isPersonal: false },
            { id: '3', name: 'Ctas x Pagar', type: AccountType.Liability, value: 100, isPersonal: false },
            { id: '4', name: 'Venta Servicios', type: AccountType.Revenue, value: 500, isPersonal: false, requiresIVA: true },
            { id: '5', name: 'Gastos Personales', type: AccountType.Expense, value: 50, isPersonal: true },
            { id: '6', name: 'Capital Social', type: AccountType.Equity, value: 1000, isPersonal: false },
            { id: '7', name: 'Compra Mercadería', type: AccountType.Expense, value: 200, isPersonal: false, requiresIVA: true },
            { id: '8', name: 'IT Por Pagar', type: AccountType.Liability, value: 15, isPersonal: false }
        ];

        for (let i = 0; i < slotsToFill; i++) {
            let data: AccountData;

            // Contextual Weighting
            if (this.activeMission && Math.random() < 0.6) {
                // Try to find a card matching the mission requirements by Name
                const targetNames = [...this.activeMission.accountingEffect.debe, ...this.activeMission.accountingEffect.haber];
                const candidates = allDefinitions.filter(d => targetNames.includes(d.name));
                if (candidates.length > 0) {
                    data = candidates[Phaser.Math.Between(0, candidates.length - 1)];
                } else {
                    data = allDefinitions[Phaser.Math.Between(0, allDefinitions.length - 1)];
                }
            } else {
                data = allDefinitions[Phaser.Math.Between(0, allDefinitions.length - 1)];
            }

            // Create new instance
            // We need unique IDs for Dragging? Or just let Phaser handle object ref
            const card = new Card(this, startX + (i * 110), startY, { ...data, id: `${Date.now()}_${i}` });
            card.setData('zone', 'DECK');
            card.on('valueChange', () => this.actualizarTotales());
        }

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
            } else if (dropZone.name === 'RESERVE') {
                // Check limit
                const reserveCount = this.children.list.filter(c => c instanceof Card && c.getData('zone') === 'RESERVE' && c !== gameObject).length;
                if (reserveCount >= 2) {
                    this.showFeedback('Reserva llena (Max 2)', 0xff5252);
                    // Bounce back
                    if (gameObject.input) {
                        gameObject.x = gameObject.input.dragStartX;
                        gameObject.y = gameObject.input.dragStartY;
                    }
                    return;
                }
                gameObject.x = dropZone.x + Phaser.Math.Between(-50, 50);
                gameObject.y = dropZone.y + Phaser.Math.Between(-20, 20);
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

        // Audit Checks
        this.auditText.setText(''); // Clear previous
        let warning = "";

        // Nature Check: Assets in HABER?
        const assetInHaber = children.some(c => c.getData('zone') === 'HABER' && c.accountType === AccountType.Asset);
        if (assetInHaber) {
            warning = "⚠ Advertencia: Activo en Haber (Disminuyendo Recurso)";
        }

        if (diff === 0) {
            this.differenceText.setColor('#4caf50'); // Green
            this.sealBtn.setFillStyle(0x2196f3); // Blue
            this.sealBtnText.setText("SELLAR");
        } else {
            this.differenceText.setColor('#ff5252'); // Red
            this.sealBtn.setFillStyle(0xd32f2f); // Red
            this.sealBtnText.setText("DESCUADRADO");
            warning = warning ? warning + " | Asiento Descuadrado" : "⚠ Asiento Descuadrado";
        }

        this.auditText.setText(warning);
    }

    private validateAndSeal() {
        if (this.actionPoints <= 0) {
            this.showFeedback("No Action Points left!", 0xff0000);
            return;
        }

        const children = this.children.list.filter(child => child instanceof Card) as Card[];
        const cardsDebe = children.filter(c => c.getData('zone') === 'DEBE');
        const cardsHaber = children.filter(c => c.getData('zone') === 'HABER');

        if (cardsDebe.length === 0 && cardsHaber.length === 0) {
            this.showFeedback("No hay cuentas para sellar.", 0xffff00);
            return;
        }

        let totalDebe = 0;
        let totalHaber = 0;

        // --- NATURE VALIDATION ---

        // Validate DEBE side: Assets & Expenses increase; Liab, Equity, Revenue decrease
        for (const card of cardsDebe) {
            totalDebe += card.value;
            const type = card.accountType;

            // Incorrect placements on DEBE
            if (type === AccountType.Liability || type === AccountType.Equity || type === AccountType.Revenue) {
                // Placing CREDIT nature accounts on DEBIT side means DECREASING them (Amortization/Payment)
                // This is valid generally, BUT check if user intends to INCREASE them (mistake)
                // For this game simplification:
                // If it's a new transaction adding value, Liab/Equity/Rev should go to HABER.
                // If we are paying off a Liability, it goes to DEBE.
                // We'll assume for now standard "Increasing Balance" logic unless context implies otherwise.
                // Actually, user wants specifically: "Si es Activo o Gasto (Deudoras): Aumentan en DEBE... Si es Pasivo, Patrimonio e Ingreso (Acreedoras): Aumentan en HABER..."

                // So if I put a Liability in DEBE, does it mean I am decreasing it?
                // The prompt says: "Si es Pasivo... Aumentan en HABER".
                // Implication: Putting them in DEBE is "Disminuyen".
                // We'll update global state accordingly later.
            }
        }

        // Validate HABER side
        for (const card of cardsHaber) {
            totalHaber += card.value;
        }

        if (totalDebe !== totalHaber) {
            this.showFeedback(`No balancea. Diferencia: $${totalDebe - totalHaber}`, 0xff0000);
            this.penaltyPrestige(10);
            return;
        }

        // --- MISSION VALIDATION ---
        let missionSuccess = false;
        if (this.activeMission) {
            if (totalDebe !== this.activeMission.amount) {
                this.showFeedback(`Misión requiere $${this.activeMission.amount}`, 0xff5252);
                this.penaltyPrestige(5);
                return;
            }

            const debeNames = cardsDebe.map(c => c.textName.text);
            const haberNames = cardsHaber.map(c => c.textName.text);

            const missingDebe = this.activeMission.accountingEffect.debe.filter(req => !debeNames.includes(req));
            const missingHaber = this.activeMission.accountingEffect.haber.filter(req => !haberNames.includes(req));

            if (missingDebe.length > 0 || missingHaber.length > 0) {
                this.showFeedback(`Faltan cuentas: ${[...missingDebe, ...missingHaber].join(', ')}`, 0xff5252);
                this.penaltyPrestige(5);
                return;
            }

            // Requirment Check: Invoice?
            if (this.activeMission.requiresInvoice) {
                // Check if user has "Factura" or check logic?
            }

            // Check coherency: If user used cards NOT in the mission list (optional penalty?)
            // For now, keep it simple.
        }

        if ([...cardsDebe, ...cardsHaber].some(c => c.isPersonal)) {
            const confirmed = window.confirm("⚠ Advertencia de Ente: Estás mezclando cuentas personales. ¿Confirmas la operación?");
            if (!confirmed) {
                this.showFeedback("Operación Cancelada", 0xffff00);
                return;
            }
        }

        // --- EXECUTE TRANSACTION ---

        // 1. Update Game State
        // DEBE: Assets/Expenses Increase. Liabilities/Equity/Revenue Decrease.
        cardsDebe.forEach(card => {
            const type = card.accountType;
            if (type === AccountType.Asset || type === AccountType.Expense) {
                // Increase
                // In this game, cards are instances. We might update the "Account" value in a centralized store or just track the card.
                // Assuming we just track visual cards for now or emit events.
            } else {
                // Decrease
            }
        });

        // HABER: Liabilities/Equity/Revenue Increase. Assets/Expenses Decrease.
        cardsHaber.forEach(card => {
            const type = card.accountType;
            if (type === AccountType.Liability || type === AccountType.Equity || type === AccountType.Revenue) {
                // Increase
            } else {
                // Decrease
            }
        });

        // IT Logic:
        // If Sales (Revenue) in HABER -> Generate IT Gasto (Debe) and IT Por Pagar (Haber)
        const salesCard = cardsHaber.find(c => c.accountType === AccountType.Revenue);
        if (salesCard && salesCard.value > 0) {
            // 3% IT
            const itAmount = salesCard.value * 0.03;
            // Add cards dynamically? Or just update state?
            // For now, let's just update the Tax Obligation state
            this.taxObligation += itAmount;
            this.showFeedback(`IT Generado: $${itAmount.toFixed(2)}`, 0xffff00);
        }

        // Update global state based on the transaction
        this.updateGlobalState(cardsDebe, cardsHaber);

        // 2. Create Journal Entry
        const entry: JournalEntry = {
            id: Date.now().toString(),
            date: new Date().toLocaleTimeString(),
            description: 'Asiento Manual',
            debe: cardsDebe.map(c => ({ name: c.textName.text, value: c.value })),
            haber: cardsHaber.map(c => ({ name: c.textName.text, value: c.value }))
        };

        this.libroDiario.push(entry);
        this.historyPanel.updateHistory(this.libroDiario);

        // 3. Consume Action Point
        this.actionPoints--;
        this.updateTimeHUD(); // Ensure this updates AP display

        // Mission Completion?
        if (missionSuccess && this.activeMission) {
            this.refrescarMisiones();
            this.activeMission = null;
            this.missionText.setText('Misión: Completada (Selecciona otra)');
            this.generarMercado(); // Open market immediately
        }

        // If not success, we still consumed AP and saved entry. Mission remains active?
        // "Si no, el registro se guarda como un 'Asiento Libre' en el Libro Diario."
        // Should we keep the mission active? Yes, allow retry.

        // Clear zones visually and destroy cards
        while (cardsDebe.length > 0) {
            const card = cardsDebe.pop();
            if (card) {
                card.destroy(); // Or return to deck? For now destroy as "processed"
            }
        }
        while (cardsHaber.length > 0) {
            const card = cardsHaber.pop();
            if (card) {
                card.destroy();
            }
        }
        // Respawn cards for new day challenges (or next transaction)
        this.time.delayedCall(1000, () => {
            this.spawnCards();

            // Dynamic Market: If mission was completed, offer immediate new selection
            // We need to re-open market from the available pool
            if (!this.activeMission) {
                this.generarMercado(); // Show popup
            }
        });
    }

    private refrescarMisiones() {
        // Remove 1 random from available, add 1 random from pool
        // Simple shift/push
        if (this.availableMissions.length > 0) {
            this.availableMissions.shift();
        }
        // Add new random
        const random = this.marketPool[Phaser.Math.Between(0, this.marketPool.length - 1)];
        this.availableMissions.push(random);
    }

    private showFeedback(message: string, color: number) {
        this.statusText.setText(message);
        this.statusText.setColor(`#${color.toString(16)}`);
        this.statusText.setY(this.scale.height - 160);
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
                // IT is handled in validateAndSeal now
                this.taxObligation += (ivaDF);
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

        this.updateIndicators();
    }

    private updateIndicators() {
        // Liquidity: Based on Cash vs Initial/Target
        // Logic: 0 = $0, 100 = $2000 (Arbitrary scale)
        this.liquidity = (this.companyCash / 2000) * 100;

        // Solidity: (Equity + Results) / Scale
        // Base Equity 5000. 
        const totalEquity = this.capital + this.accumulatedResults;
        this.solidity = (totalEquity / 10000) * 100;


        // Prestige maintained state

        this.statusPanel.updateValues(this.liquidity, this.solidity, this.prestige, this.taxObligation, this.taxCredit);

        // Bankruptcy Trigger
        if (this.liquidity <= 0) {
            this.showFeedback("¡QUIEBRA TÉCNICA! Vende activos o pide préstamo.", 0xff0000);
            // Block market is handled in generarMercado check
        }
    }

    private penaltyPrestige(amount: number) {
        this.prestige -= amount;
        if (this.prestige < 0) this.prestige = 0;
        this.updateIndicators();
    }

    private createEndDayButton() {
        const x = this.scale.width - 80;
        const y = 80; // Below HUD
        const btn = this.add.rectangle(0, 0, 140, 40, 0xd32f2f).setStrokeStyle(1, 0xff5252);
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
        // Mandatory Accrual Check
        if (this.activeMission && (this.activeMission.type === 'Compra' || (this.activeMission.type as string) === 'Gasto')) {
            // User ended day with pending expense mission -> Penalize + Book Debt
            this.showFeedback("¡Misión de Gasto incumplida! Se devenga automáticamente.", 0xff5252);

            // Logic: Create Expense vs Liability entry automatically
            // Simplified: Just penalty for now + Prestige hit
            this.penaltyPrestige(15);

            this.activeMission = null;
            this.missionText.setText('Misión: Cancelada (Incumplimiento)');
        }

        // Clear Reserve Logic
        const reserveCards = this.children.list.filter(c => c instanceof Card && c.getData('zone') === 'RESERVE') as Card[];
        reserveCards.forEach(c => c.destroy());

        // Summary for valid day
        this.dailyHistory.push(`Día ${this.currentDay}: Efectivo ${this.companyCash}, Capital ${this.capital}`);

        this.currentDay++;
        this.actionPoints = 3; // Reset AP
        this.updateTimeHUD();

        // Check for End of Month (Day 7)
        if (this.currentDay > 7) {
            this.ejecutarCierreMensual();
        } else {
            this.showFeedback(`Inicia el Día ${this.currentDay}`, 0x2196f3);
            this.generarMercado(); // Show available missions again
            this.spawnCards();
        }
    }

    private ejecutarCierreMensual() {
        // "El Gran Cierre"

        // 1. Calculate Result: Sum(Revenue) - Sum(Expense)
        // We need to iterate over all existing accounts/cards in play or in the "Ledger".
        // Since we don't have a full ledger in this file, we'll assume we track it in GameState or similar.
        // For this task, let's assume we iterate through valid 'Nominal' cards if we had a list.
        // I'll simulate it with the gameState properties if available, or just log it.

        // Let's assume we have access to all account values.
        // For now, I'll display a visual summary.

        const result = 1000; // Placeholder: Calculate real result

        // Assuming these properties exist or are placeholders for future implementation
        // this.accumulatedResults += result;
        this.currentMonth++;
        this.currentDay = 1; // Reset to Day 1

        this.showFeedback(`Cierre Mensual: Resultado $${result}`, 0xffd700);

        // 2. Reset Nominal Accounts
        // Logic to set Revenue/Expense values to 0.

        alert("¡EL GRAN CIERRE!\n\nSe han liquidado las cuentas de Ingresos y Gastos.\nResultado del ejercicio trasladado a Patrimonio.");

        this.updateTimeHUD();
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
        // Bankruptcy Check
        if (this.liquidity <= 0) {
            this.missionText.setText("⚠ MERCADO BLOQUEADO (Liquidez Crítica)");
            this.showFeedback("Resuelve tu liquidez para operar.", 0xff0000);
            if (this.marketContainer) this.marketContainer.destroy();
            return;
        }

        // Fill available if empty (Start of game)
        if (this.availableMissions.length < 3) {
            const shuffled = [...this.marketPool].sort(() => 0.5 - Math.random());
            this.availableMissions = shuffled.slice(0, 3);
        }

        // Show UI with available
        this.showMarketUI(this.availableMissions);
    }

    private showMarketUI(events: MarketEvent[]) {
        if (this.marketContainer) this.marketContainer.destroy();

        const { width, height } = this.scale;
        const centerX = width / 2;
        const centerY = height / 2;

        this.marketContainer = this.add.container(centerX, centerY);

        // Background overlay
        const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.8).setInteractive();
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

                // Refresh pool for next time (Dynamic Market)
                this.refrescarMisiones();
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
