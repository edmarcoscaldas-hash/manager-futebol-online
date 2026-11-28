// Aviso de contrato: devolve null quando não há o que informar.
export function avisoContrato(contratoAte, hoje = new Date()) {
  if (!contratoAte) return null;
  const fim = new Date(String(contratoAte).slice(0, 10) + 'T12:00:00');
  if (Number.isNaN(fim.getTime())) return null;
  const dias = Math.ceil((fim.getTime() - hoje.getTime()) / 86400000);
  if (dias < 0) return { nivel: 'vencido', dias, texto: 'Contrato vencido' };
  if (dias === 0) return { nivel: 'critico', dias, texto: 'Contrato encerra hoje' };
  if (dias <= 30) return { nivel: 'critico', dias, texto: 'Contrato encerra em ' + dias + (dias === 1 ? ' dia' : ' dias') };
  if (dias <= 90) return { nivel: 'aviso', dias, texto: 'Contrato termina em ' + dias + ' dias' };
  return null;
}
