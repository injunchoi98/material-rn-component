import React, { ReactNode } from 'react';
import { useBook, UseBookProps } from './hooks/useBook';
import { BookContext } from './context';

export interface BookProps extends UseBookProps {
    children: ReactNode;
}

export function Book({ children, ...initialProps }: BookProps) {
    const book = useBook(initialProps);

    return <BookContext.Provider value={book}>{children}</BookContext.Provider>;
}

