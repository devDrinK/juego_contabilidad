export enum AccountType {
    Asset = 'Asset',         // Activo (Green)
    Liability = 'Liability', // Pasivo (Red)
    Equity = 'Equity',       // Patrimonio (Yellow)
    Revenue = 'Revenue',     // Ingreso (Blue)
    Expense = 'Expense'      // Egreso (Purple)
}

export enum AccountCategory {
    Real = 'Real',       // Círculo (Activo, Pasivo, Patrimonio)
    Nominal = 'Nominal', // Triángulo (Ingreso, Gasto)
    Orden = 'Orden'      // Hexágono (Cuentas de control)
}

export function getCategoryByType(type: AccountType): AccountCategory {
    switch (type) {
        case AccountType.Asset:
        case AccountType.Liability:
        case AccountType.Equity:
            return AccountCategory.Real;
        case AccountType.Revenue:
        case AccountType.Expense:
            return AccountCategory.Nominal;
        default:
            return AccountCategory.Orden;
    }
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
    accumulatedResults: number; // Resultados Acumulados
    currentDay: number;
    currentMonth: number;
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
