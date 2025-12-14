import { createContext, useContext } from 'react';
import type { BookResult } from './types';

export const BookContext = createContext<BookResult | null>(null);

export function useBookContext() {
    const context = useContext(BookContext);
    if (!context) {
        throw new Error('useBookContext must be used within a BookProvider');
    }
    return context;
}
