import { Metadata } from 'next';
import BibliotecaClient from './BibliotecaClient';

export const metadata: Metadata = {
  title: 'Biblioteca de Peças | Edro',
};

export default function BibliotecaPage() {
  return <BibliotecaClient />;
}
