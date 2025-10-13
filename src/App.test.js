import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

jest.mock('firebase/firestore', () => ({
    collection: jest.fn(),
    onSnapshot: jest.fn(() => jest.fn()),
    getDocs: jest.fn(() => Promise.resolve({ empty: true, docs: [] })),
    doc: jest.fn(),
    setDoc: jest.fn(),
}));

jest.mock('./firebase', () => ({
    db: {},
    auth: {},
    onAuthStateChanged: jest.fn((_, callback) => {
        callback({ email: 'teste@controlplus.app' });
        return jest.fn();
    }),
    signOut: jest.fn(),
}));

describe('App', () => {
    test('exibe o cabeçalho principal', async () => {
        render(<App />);

        await waitFor(() => {
            expect(screen.getByText(/Control\+ Oficina/i)).toBeInTheDocument();
        });
    });
});
