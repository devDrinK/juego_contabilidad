import Phaser from 'phaser';

export class StatusPanel extends Phaser.GameObjects.Container {
    private isVisible: boolean = false;
    private background: Phaser.GameObjects.Rectangle;

    // Bars
    private liquidityBar: Phaser.GameObjects.Rectangle;
    private solidityBar: Phaser.GameObjects.Rectangle;
    private prestigeBar: Phaser.GameObjects.Rectangle;

    // Text Lables
    private liquidityText: Phaser.GameObjects.Text;
    private solidityText: Phaser.GameObjects.Text;
    private prestigeText: Phaser.GameObjects.Text;

    // Tax Bars
    private taxCreditBar: Phaser.GameObjects.Rectangle;
    private taxObligationBar: Phaser.GameObjects.Rectangle;
    private taxCreditText: Phaser.GameObjects.Text;
    private taxObligationText: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);

        // Panel Background (Right side slide-out)
        // Size: 250x600 (Taller)
        this.background = scene.add.rectangle(0, 0, 250, 600, 0x000000, 0.85);
        this.background.setStrokeStyle(2, 0x444444);
        this.add(this.background);

        // Title
        const title = scene.add.text(0, -280, 'INDICADORES', { fontSize: '20px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
        this.add(title);

        let yOffset = -240;
        const spacing = 60;

        // Liquidity (Blue)
        this.add(scene.add.text(-110, yOffset, 'Liquidez', { fontSize: '14px', color: '#2196f3' }));
        this.liquidityBar = scene.add.rectangle(-110, yOffset + 20, 220, 20, 0x2196f3).setOrigin(0, 0.5);
        this.liquidityText = scene.add.text(0, yOffset + 20, '50%', { fontSize: '12px', color: '#fff' }).setOrigin(0.5);
        this.add([this.liquidityBar, this.liquidityText]);
        yOffset += spacing;

        // Solidity (Gold)
        this.add(scene.add.text(-110, yOffset, 'Solidez', { fontSize: '14px', color: '#ffd700' }));
        this.solidityBar = scene.add.rectangle(-110, yOffset + 20, 220, 20, 0xffd700).setOrigin(0, 0.5);
        this.solidityText = scene.add.text(0, yOffset + 20, '50%', { fontSize: '12px', color: '#000' }).setOrigin(0.5);
        this.add([this.solidityBar, this.solidityText]);
        yOffset += spacing;

        // Prestige (White/Bright)
        this.add(scene.add.text(-110, yOffset, 'Prestigio Fiscal', { fontSize: '14px', color: '#ffffff' }));
        this.prestigeBar = scene.add.rectangle(-110, yOffset + 20, 220, 20, 0xffffff).setOrigin(0, 0.5);
        this.prestigeText = scene.add.text(0, yOffset + 20, '100%', { fontSize: '12px', color: '#000' }).setOrigin(0.5);
        this.add([this.prestigeBar, this.prestigeText]);
        yOffset += spacing;

        // Tax Obligations (Red)
        this.add(scene.add.text(-110, yOffset, 'Obligaciones (IVA/IT)', { fontSize: '14px', color: '#e57373' }));
        this.taxObligationBar = scene.add.rectangle(-110, yOffset + 20, 220, 20, 0xe57373).setOrigin(0, 0.5);
        this.taxObligationText = scene.add.text(0, yOffset + 20, '$0', { fontSize: '12px', color: '#fff' }).setOrigin(0.5);
        this.add([this.taxObligationBar, this.taxObligationText]);
        yOffset += spacing;

        // Tax Credits (Green)
        this.add(scene.add.text(-110, yOffset, 'Crédito Fiscal', { fontSize: '14px', color: '#81c784' }));
        this.taxCreditBar = scene.add.rectangle(-110, yOffset + 20, 220, 20, 0x81c784).setOrigin(0, 0.5);
        this.taxCreditText = scene.add.text(0, yOffset + 20, '$0', { fontSize: '12px', color: '#fff' }).setOrigin(0.5);
        this.add([this.taxCreditBar, this.taxCreditText]);

        // Helper Text
        const helpText = scene.add.text(0, 250, "Presiona 'Q' para ocultar/mostrar", { fontSize: '12px', color: '#888' }).setOrigin(0.5);
        this.add(helpText);

        scene.add.existing(this);

        // Initial State: Hidden (Off-screen to the right)
        this.isVisible = true;
    }

    public updateValues(liquidity: number, solidity: number, prestige: number, taxObligation: number, taxCredit: number) {
        // Clamp 0-100
        const l = Phaser.Math.Clamp(liquidity, 0, 100);
        const s = Phaser.Math.Clamp(solidity, 0, 100);
        const p = Phaser.Math.Clamp(prestige, 0, 100);

        // Update main bars
        this.liquidityBar.width = (l / 100) * 220;
        this.solidityBar.width = (s / 100) * 220;
        this.prestigeBar.width = (p / 100) * 220;

        this.liquidityText.setText(`${Math.round(l)}%`);
        this.solidityText.setText(`${Math.round(s)}%`);
        this.prestigeText.setText(`${Math.round(p)}%`);

        // Update Tax Bars (Relative scale: Max $1000 for visualization?)
        // Let's cap visual width at $1000 logic for now 
        const maxTax = 500;
        const obW = Phaser.Math.Clamp(taxObligation / maxTax, 0, 1) * 220;
        const crW = Phaser.Math.Clamp(taxCredit / maxTax, 0, 1) * 220;

        this.taxObligationBar.width = obW;
        this.taxCreditBar.width = crW;

        this.taxObligationText.setText(`$${taxObligation}`);
        this.taxCreditText.setText(`$${taxCredit}`);

        // Critical Warning Colors
        if (l < 20) this.liquidityBar.setFillStyle(0xd32f2f); // Red Alert
        else this.liquidityBar.setFillStyle(0x2196f3);

        if (p < 50) this.prestigeBar.setFillStyle(0xff5722); // Orange Alert
        else this.prestigeBar.setFillStyle(0xffffff);
    }

    public toggle() {
        this.isVisible = !this.isVisible;

        // For 2048 width:
        // Visible X = 2048 - 150 (half width ish) = ~1900
        // Hidden X = 2048 + 150 = ~2200
        // Dynamic based on scene width would be better
        const width = this.scene.scale.width;
        const visibleX = width - 130;
        const hiddenX = width + 130;

        this.scene.tweens.add({
            targets: this,
            x: this.isVisible ? visibleX : hiddenX,
            duration: 300,
            ease: 'Power2'
        });
    }
}
