import Phaser from 'phaser';
import { AccountType, type AccountData } from '../types';

export class Card extends Phaser.GameObjects.Container {
    public id: string;
    public accountType: AccountType;
    public value: number;
    public isPersonal: boolean;

    private background: Phaser.GameObjects.Rectangle;
    public textName: Phaser.GameObjects.Text;
    private textValue: Phaser.GameObjects.Text;
    private personalIcon?: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, x: number, y: number, data: AccountData) {
        super(scene, x, y);

        this.id = data.id;
        this.accountType = data.type;
        this.value = data.value;
        this.isPersonal = data.isPersonal;

        // Visual setup
        const width = 140;
        const height = 80;
        const color = this.getColorByType(this.accountType);

        this.background = scene.add.rectangle(0, 0, width, height, color);

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
            wordWrap: { width: width - 10 }
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
            this.personalIcon = scene.add.text(width / 2 - 15, -height / 2 + 5, '👤', { fontSize: '16px' });
            this.add(this.personalIcon);
        }

        // Interactivity
        this.setSize(width, height);
        this.setInteractive();
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
            case AccountType.Equity: return 0xff9800; // Orange
            case AccountType.Revenue: return 0x2196f3; // Blue
            case AccountType.Expense: return 0x9c27b0; // Purple
            default: return 0xffffff;
        }
    }
}
