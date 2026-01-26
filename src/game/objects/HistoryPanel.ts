import Phaser from 'phaser';
import type { JournalEntry } from '../types';

export class HistoryPanel extends Phaser.GameObjects.Container {
    private bg: Phaser.GameObjects.Rectangle;
    private contentContainer: Phaser.GameObjects.Container;
    private isVisible: boolean = false;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);

        // Background / Modal Overlay
        this.bg = scene.add.rectangle(0, 0, 600, 400, 0x000000, 0.9);
        this.bg.setStrokeStyle(2, 0xffffff);
        this.add(this.bg);

        // Title
        const title = scene.add.text(0, -180, 'LIBRO DIARIO (Historial)', {
            fontSize: '24px',
            color: '#fff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.add(title);

        const closeHint = scene.add.text(0, 180, 'Presiona H para cerrar', {
            fontSize: '16px',
            color: '#aaaaaa'
        }).setOrigin(0.5);
        this.add(closeHint);

        this.contentContainer = scene.add.container(0, 0);
        this.add(this.contentContainer);

        this.setDepth(1000); // Ensure it's on top
        this.setVisible(false);
        scene.add.existing(this);
    }

    public toggle() {
        this.isVisible = !this.isVisible;
        this.setVisible(this.isVisible);
    }

    public updateHistory(journal: JournalEntry[]) {
        this.contentContainer.removeAll(true);

        let yOffset = -140;

        // Show last 5 entries
        const recentEntries = journal.slice(-5).reverse();

        recentEntries.forEach(entry => {
            const dateText = this.scene.add.text(-280, yOffset, `[${entry.date}]`, { fontSize: '14px', color: '#ccc' });

            let details = "";
            entry.debe.forEach(d => details += ` (D) ${d.name}: $${d.value}  `);
            entry.haber.forEach(h => details += ` (H) ${h.name}: $${h.value}  `);

            const detailText = this.scene.add.text(-200, yOffset, details, {
                fontSize: '14px',
                color: '#fff',
                wordWrap: { width: 480 }
            });

            this.contentContainer.add([dateText, detailText]);
            yOffset += 40;
        });

        if (journal.length === 0) {
            const emptyText = this.scene.add.text(0, 0, 'No hay asientos registrados aún.', { fontSize: '16px', color: '#666' }).setOrigin(0.5);
            this.contentContainer.add(emptyText);
        }
    }
}
