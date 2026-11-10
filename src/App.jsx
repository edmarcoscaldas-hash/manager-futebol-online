import { useState } from 'react';

export default function App() {
  const [aba, setAba] = useState('Início');

  const abas = ['Início', 'Elenco', 'Táticas', 'Liga', 'Mercado', 'Base'];

  return (
    <main style={{
      background: '#0b1220',
      color: 'white',
      minHeight: '100vh',
      padding: '20px',
      fontFamily: 'Arial'
    }}>
      <h1>⚽ Manager Futebol Online</h1>
      <h2>União Caçapavense</h2>
      <p>Temporada 1 • Brasil</p>

      <nav style={{display: 'flex', flexWrap: 'wrap', gap: 8}}>
        {abas.map(item => (
          <button key={item} onClick={() => setAba(item)}>
            {item}
          </button>
        ))}
      </nav>

      <section style={{marginTop: 25}}>
        <h2>{aba}</h2>
        <p>Bem-vindo ao Manager Futebol Online!</p>
        <p>Seu clube está pronto para iniciar a temporada.</p>
      </section>
    </main>
  );
}
