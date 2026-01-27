export enum AccountType {
    Asset = 'Asset',         // Activo (Green)
    Liability = 'Liability', // Pasivo (Red)
    Equity = 'Equity',       // Patrimonio (Yellow)
    Revenue = 'Revenue',     // Ingreso (Blue)
    Expense = 'Expense'      // Egreso (Purple)
}

export interface AccountData {
    id: string;
    name: string;
    type: AccountType;
    value: number;
    isPersonal: boolean; // For Entity Principle validation
    requiresIVA?: boolean; // Triggers tax generation
    isTax?: boolean;       // Is a calculated tax card
    isReadonly?: boolean;  // Cannot be edited by user
    parentId?: string;     // ID of the card this generated from
}

export interface GameState {
    companyCash: number;
    capital: number;
    taxCredit: number;      // IVA CF
    taxObligation: number;  // IVA DF + IT + Retentions
}

export interface JournalEntry {
    id: string;
    date: string;
    description: string;
    debe: { name: string; value: number }[];
    haber: { name: string; value: number }[];
}

export interface MarketEvent {
    id: string;
    title: string;
    description: string;
    type: 'Compra' | 'Venta' | 'Evento';
    amount: number;
    requiresInvoice: boolean;
    accountingEffect: {
        debe: string[];
        haber: string[];
    };
}
