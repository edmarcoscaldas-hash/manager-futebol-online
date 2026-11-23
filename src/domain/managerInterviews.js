const ANSWER_KEYS = ["assumir", "proteger", "cobrar"];

const BASE_EFFECTS = {
  assumir: {
    loss: { fan: -3, board: -3, rd: 3, rp: 1, rt: 3 },
    win: { fan: -1, board: -2, rd: 2, rp: 1, rt: 1 },
    draw: { fan: -1, board: -1, rd: 2, rp: 1, rt: 1 }
  },
  proteger: {
    loss: { fan: 2, board: 2, rd: 0, rp: 4, rt: 1 },
    win: { fan: 0, board: 0, rd: 1, rp: 3, rt: 1 },
    draw: { fan: 0, board: 0, rd: 1, rp: 3, rt: 0 }
  },
  cobrar: {
    loss: { fan: -1, board: -1, rd: 3, rp: -3, rt: 2 },
    win: { fan: 1, board: 1, rd: 1, rp: -2, rt: 0 },
    draw: { fan: 1, board: 1, rd: 2, rp: -2, rt: 1 }
  }
};

const SCENARIOS = {
  classico: {
    label: "Clássico regional",
    focus: "neste clássico",
    titles: [
      "Assumir a responsabilidade no clássico",
      "Blindar o elenco após o clássico",
      "Cobrar uma resposta à torcida"
    ]
  },
  copa: {
    label: "Competição eliminatória",
    focus: "nesta partida da copa",
    titles: [
      "Assumir a responsabilidade na copa",
      "Proteger o grupo para o mata-mata",
      "Cobrar concentração na competição"
    ]
  },
  titulo: {
    label: "Disputa pelo título",
    focus: "nesta partida pela disputa do título",
    titles: [
      "Assumir a pressão pela disputa do título",
      "Valorizar o grupo na reta final",
      "Cobrar foco na briga pelo título"
    ]
  },
  rebaixamento: {
    label: "Luta contra o rebaixamento",
    focus: "nesta partida na luta contra o rebaixamento",
    titles: [
      "Assumir a responsabilidade na luta contra o Z-4",
      "Proteger o elenco da pressão",
      "Exigir uma reação imediata"
    ]
  },
  decisiva: {
    label: "Rodada decisiva",
    focus: "nesta rodada decisiva",
    titles: [
      "Assumir a responsabilidade pela rodada",
      "Valorizar o elenco neste momento",
      "Cobrar foco para a sequência"
    ]
  },
  campeonato: {
    label: "Campeonato",
    focus: "nesta partida do campeonato",
    titles: [
      "Assumir a responsabilidade",
      "Proteger o elenco",
      "Cobrar uma reação do time"
    ]
  }
};

function normalizeCity(city) {
  return String(city || "").trim().toLocaleLowerCase("pt-BR");
}

function sortStandings(standings) {
  return [...(Array.isArray(standings) ? standings : [])].sort((a, b) =>
    Number(b.points || 0) - Number(a.points || 0) ||
    Number(b.wins || 0) - Number(a.wins || 0) ||
    Number(b.goal_difference || 0) - Number(a.goal_difference || 0)
  );
}

export function buildManagerInterviewContext({
  match,
  clubId,
  homeClub,
  awayClub,
  competitionName = "Campeonato",
  standings = [],
  maxRound = 0
}) {
  if (!match || !clubId) return null;

  const isHome = match.home_club_id === clubId;
  if (!isHome && match.away_club_id !== clubId) return null;

  const homeScore = Number(match.home_score || 0);
  const awayScore = Number(match.away_score || 0);
  const ownScore = isHome ? homeScore : awayScore;
  const opponentScore = isHome ? awayScore : homeScore;
  const outcome = ownScore > opponentScore ? "win" : ownScore < opponentScore ? "loss" : "draw";
  const outcomeLabel = outcome === "win" ? "vitória" : outcome === "loss" ? "derrota" : "empate";
  const outcomeWithArticle = outcome === "win" ? "da vitória" : outcome === "loss" ? "da derrota" : "do empate";
  const opponent = (isHome ? awayClub?.nome : homeClub?.nome) || "adversário";
  const score = homeScore + " × " + awayScore;
  const competition = competitionName || "Campeonato";

  const table = sortStandings(standings);
  const position = table.findIndex(row => row.club_id === clubId) + 1;
  const teamCount = table.length;
  const ownRow = table.find(row => row.club_id === clubId);
  const ownPoints = Number(ownRow?.points || 0);
  const leaderPoints = Number(table[0]?.points || 0);
  const safeRow = teamCount >= 4 ? table[teamCount - 4] : null;
  const safePoints = Number(safeRow?.points || 0);
  const round = Number(match.round_number || 0);
  const finalRound = Number(maxRound || 0);
  const decisiveRound = finalRound > 0 && round >= Math.max(1, finalRound - 1);
  const sameCity = normalizeCity(homeClub?.cidade) !== "" &&
    normalizeCity(homeClub?.cidade) === normalizeCity(awayClub?.cidade);
  const isCup = /(copa|cup|taça|taca)/i.test(competition);
  const titleRace = decisiveRound && position > 0 && position <= 2 && leaderPoints - ownPoints <= 6;
  const relegationRace = decisiveRound && position > 0 && teamCount >= 4 &&
    position >= teamCount - 2 && safePoints - ownPoints <= 6;

  let scenario = "campeonato";
  if (sameCity) scenario = "classico";
  else if (isCup) scenario = "copa";
  else if (titleRace) scenario = "titulo";
  else if (relegationRace) scenario = "rebaixamento";
  else if (decisiveRound) scenario = "decisiva";

  const scenarioInfo = SCENARIOS[scenario];
  const questionByScenario = {
    classico: "Depois da " + outcomeLabel + " por " + score + " contra " + opponent + ", como você avalia a atuação da equipe neste clássico?",
    copa: "O confronto contra " + opponent + " na " + competition + " terminou em " + score + ". O que esse resultado representa para a sequência da competição?",
    titulo: "Com o resultado de " + score + " contra " + opponent + ", sua equipe segue na disputa pelo título. Como o grupo vai lidar com a pressão?",
    rebaixamento: "O resultado de " + score + " contra " + opponent + " pesa na luta contra o rebaixamento. Como o time vai reagir?",
    decisiva: "A rodada decisiva terminou em " + score + " contra " + opponent + ". O que muda para o clube a partir de agora?",
    campeonato: "A partida contra " + opponent + " terminou em " + score + ". Como este resultado afeta os objetivos do clube no campeonato?"
  };

  return {
    matchId: match.id,
    scenario,
    scenarioLabel: scenarioInfo.label,
    question: questionByScenario[scenario],
    opponent,
    competition,
    score,
    outcome,
    outcomeLabel,
    outcomeWithArticle,
    round,
    position
  };
}

export function getManagerInterviewChoices(context) {
  if (!context || !SCENARIOS[context.scenario] || !BASE_EFFECTS.assumir[context.outcome]) return [];

  const scenario = context.scenario;
  const scenarioInfo = SCENARIOS[scenario];
  const focus = scenarioInfo.focus;
  const opponent = context.opponent || "adversário";
  const resultPhrase = context.outcomeWithArticle ||
    (context.outcome === "win" ? "da vitória" : context.outcome === "loss" ? "da derrota" : "do empate");
  const titles = scenarioInfo.titles;
  const descriptions = [
    "Reconhecer sua parcela de responsabilidade e transmitir segurança.",
    "Preservar o grupo e demonstrar confiança nos jogadores.",
    "Exigir mais desempenho e atitude para a próxima partida."
  ];
  const texts = [
    "O resultado " + resultPhrase + " por " + context.score + " contra " + opponent + ", " + focus + ", também é minha responsabilidade. Vou rever as decisões, corrigir o que não funcionou e preparar a equipe para responder em campo.",
    "O grupo merece respeito depois " + resultPhrase + " por " + context.score + " contra " + opponent + ", " + focus + ". Não vou expor jogadores individualmente. Vamos conversar internamente e trabalhar juntos.",
    "A camisa do clube exige uma resposta depois " + resultPhrase + " por " + context.score + " contra " + opponent + ", " + focus + ". Vou cobrar concentração, intensidade e compromisso nos treinamentos."
  ];

  return ANSWER_KEYS.map((key, index) => {
    const base = BASE_EFFECTS[key][context.outcome];
    const classicAdjustment = scenario === "classico"
      ? (context.outcome === "win" ? -2 : context.outcome === "loss" ? 3 : 1)
      : 0;
    const decisiveAdjustment = ["titulo", "rebaixamento", "copa", "decisiva"].includes(scenario)
      ? (context.outcome === "win" ? -1 : context.outcome === "loss" ? 2 : 1)
      : 0;
    const boardAdjustment = scenario === "rebaixamento" && context.outcome === "loss" ? 2 : 0;

    return {
      key,
      title: titles[index],
      description: descriptions[index],
      text: texts[index],
      pressureDelta: {
        fan: base.fan + classicAdjustment + decisiveAdjustment,
        board: base.board + boardAdjustment
      },
      reputationDelta: {
        board: base.rd,
        players: base.rp,
        fans: base.rt
      }
    };
  });
}

export const MANAGER_INTERVIEW_ANSWER_KEYS = ANSWER_KEYS;
