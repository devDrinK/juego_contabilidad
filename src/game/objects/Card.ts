import Phaser from 'phaser';
import { AccountType, AccountCategory, getCategoryByType, type AccountData } from '../types';

export class Card extends Phaser.GameObjects.Container {
    public id: string;
    public accountType: AccountType;
    public accountCategory: AccountCategory;
    public value: number;
    public isPersonal: boolean;

    private background: Phaser.GameObjects.Shape; // Changed from Rectangle to Shape
    public textName: Phaser.GameObjects.Text;
    private textValue: Phaser.GameObjects.Text;
    private personalIcon?: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, x: number, y: number, data: AccountData) {
        super(scene, x, y);

        this.id = data.id;
        this.accountType = data.type;
        this.accountCategory = getCategoryByType(this.accountType);
        this.value = data.value;
        this.isPersonal = data.isPersonal;

        // Visual setup
        const size = 100; // Unified size for shapes
        const color = this.getColorByType(this.accountType);

        switch (this.accountCategory) {
            case AccountCategory.Real:
                this.background = scene.add.circle(0, 0, size / 2, color);
                break;
            case AccountCategory.Nominal:
                // Triangle pointing up
                this.background = scene.add.triangle(0, 0, 0, size, size / 2, 0, size, size, color);
                // Center the triangle visually in the container
                this.background.setOrigin(0.5, 0.66);
                break;
            case AccountCategory.Orden:
            default:
                // Hexagon
                this.background = scene.add.polygon(0, 0, [
                    25, 0, 75, 0, 100, 43, 75, 86, 25, 86, 0, 43
                ], color);
                // Center the hexagon
                this.background.setOrigin(0.5);
                this.background.setScale(1.2);
                break;
        }

        // Visual distinction for Readonly/Tax cards
        if (data.isReadonly) {
            this.background.setStrokeStyle(3, 0x000000); // Thick black border for calculated cards
            this.background.setFillStyle(color, 0.8);
        } else {
            this.background.setStrokeStyle(2, 0xffffff);
        }

        this.textName = scene.add.text(0, -20, data.name, {
            fontSize: '14px',
            color: '#000',
            fontStyle: 'bold',
            wordWrap: { width: size - 10 },
            align: 'center'
        }).setOrigin(0.5);

        this.textValue = scene.add.text(0, 15, `$${this.value}`, {
            fontSize: '16px',
            color: '#000',
            backgroundColor: data.isReadonly ? '#cccccc' : '#ffffffaa',
            padding: { x: 4, y: 2 }
        }).setOrigin(0.5);

        this.add([this.background, this.textName, this.textValue]);

        // Entity Principle Visual Indicator
        if (this.isPersonal) {
            this.personalIcon = scene.add.text(0, -size / 2 + 10, '👤', { fontSize: '16px' }).setOrigin(0.5);
            this.add(this.personalIcon);
        }

        // Interactivity
        this.setSize(size, size);

        // Custom hit area based on shape
        if (this.accountCategory === AccountCategory.Real) {
            this.setInteractive(new Phaser.Geom.Circle(size / 2, size / 2, size / 2), Phaser.Geom.Circle.Contains);
        } else if (this.accountCategory === AccountCategory.Nominal) {
            // Simplified hit area for triangle
            this.setInteractive(new Phaser.Geom.Rectangle(0, 0, size, size), Phaser.Geom.Rectangle.Contains);
        } else {
            this.setInteractive(new Phaser.Geom.Rectangle(0, 0, size, size), Phaser.Geom.Rectangle.Contains);
        }

        scene.input.setDraggable(this);

        // Value Editing
        if (!data.isReadonly) {
            this.textValue.setInteractive({ useHandCursor: true });
            this.textValue.on('pointerdown', () => {
                const input = prompt(`Enter new value for ${data.name}:`, this.value.toString());
                if (input !== null && !isNaN(Number(input))) {
                    this.value = Number(input);
                    this.textValue.setText(`$${this.value}`);
                    this.emit('valueChange', this.value);
                }
            });
        }

        scene.add.existing(this);
    }

    private getColorByType(type: AccountType): number {
        switch (type) {
            case AccountType.Asset: return 0x4caf50; // Green
            case AccountType.Liability: return 0xf44336; // Red
            case AccountType.Equity: return 0x2196f3; // Blue (Updated from Orange)
            case AccountType.Revenue: return 0xffd700; // Gold (Updated from Blue)
            case AccountType.Expense: return 0x9e9e9e; // Grey (Updated from Purple)
            default: return 0xffffff;
        }
    }
}
